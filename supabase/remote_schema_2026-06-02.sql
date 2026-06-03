


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."create_user_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, theme, language)
  VALUES (NEW.id, 'dark', 'es');
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_session_transaction"("p_session_id" "uuid", "p_ended_at" timestamp with time zone, "p_session_data" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_session_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT user_id
  INTO v_session_user_id
  FROM public.routine_sessions
  WHERE id = p_session_id;

  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'Session not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_session_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to end this session'
      USING ERRCODE = '42501';
  END IF;

  -- Make the RPC idempotent for sync retries.
  DELETE FROM public.session_day_logs
  WHERE session_id = p_session_id;

  UPDATE public.routine_sessions
  SET
    status = 'completed',
    ended_at = p_ended_at
  WHERE id = p_session_id;

  INSERT INTO public.session_day_logs (
    session_id,
    routine_day_id,
    started_at,
    ended_at
  )
  SELECT
    p_session_id,
    (day_obj->>'routine_day_id')::uuid,
    NULL,
    p_ended_at
  FROM jsonb_array_elements(COALESCE(p_session_data->'days', '[]'::jsonb)) AS day_obj;

  INSERT INTO public.session_exercise_logs (
    session_day_log_id,
    exercise_id,
    position,
    notes
  )
  SELECT
    sdl.id,
    (exercise_obj->>'exercise_id')::uuid,
    NULLIF(exercise_obj->>'position', '')::integer,
    NULLIF(exercise_obj->>'notes', '')
  FROM jsonb_array_elements(COALESCE(p_session_data->'exercises', '[]'::jsonb)) AS exercise_obj
  JOIN public.session_day_logs sdl
    ON sdl.session_id = p_session_id
   AND sdl.routine_day_id = (exercise_obj->>'routine_day_id')::uuid;

  INSERT INTO public.session_set_logs (
    session_exercise_log_id,
    set_number,
    reps,
    weight,
    duration_minutes,
    duration_seconds,
    completed
  )
  SELECT
    sel.id,
    (set_obj->>'set_number')::integer,
    COALESCE(
      NULLIF(set_obj->>'actual_reps', '')::numeric,
      NULLIF(set_obj->>'planned_reps', '')::numeric
    ),
    COALESCE(
      NULLIF(set_obj->>'actual_weight', '')::numeric,
      NULLIF(set_obj->>'planned_weight', '')::numeric
    ),
    COALESCE(
      NULLIF(set_obj->>'actual_duration_minutes', '')::numeric,
      NULLIF(set_obj->>'planned_duration_minutes', '')::numeric
    ),
    NULLIF(set_obj->>'actual_duration_seconds', '')::numeric,
    true
  FROM jsonb_array_elements(COALESCE(p_session_data->'sets', '[]'::jsonb)) AS set_obj
  JOIN public.session_day_logs sdl
    ON sdl.session_id = p_session_id
   AND sdl.routine_day_id = (set_obj->>'routine_day_id')::uuid
  JOIN public.session_exercise_logs sel
    ON sel.session_day_log_id = sdl.id
   AND sel.exercise_id = (set_obj->>'exercise_id')::uuid
   AND COALESCE(sel.position, 0) = COALESCE(NULLIF(set_obj->>'exercise_position', '')::integer, 0);

  RETURN p_session_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in end_session_transaction: %', SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."end_session_transaction"("p_session_id" "uuid", "p_ended_at" timestamp with time zone, "p_session_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
  set
    full_name = coalesce(
      excluded.full_name,
      public.profiles.full_name
    ),
    avatar_url = coalesce(
      excluded.avatar_url,
      public.profiles.avatar_url
    );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_routine"("p_routine_name" "text", "p_routine_notes" "text", "p_days" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_routine_id         uuid;
  v_day_obj            jsonb;
  v_day_id             uuid;
  v_exercise_obj       jsonb;
  v_rde_id             uuid;
  v_set_obj            jsonb;
BEGIN
  -- Verificar autenticación
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- 1. Insertar la rutina
  INSERT INTO public.routines (user_id, name, notes, is_active)
  VALUES (auth.uid(), p_routine_name, NULLIF(p_routine_notes, ''), true)
  RETURNING id INTO v_routine_id;

  -- 2. Iterar sobre los días
  FOR v_day_obj IN SELECT * FROM jsonb_array_elements(COALESCE(p_days, '[]'::jsonb))
  LOOP
    INSERT INTO public.routine_days (
      id,
      routine_id,
      day_type,
      day_number,
      title,
      position
    )
    VALUES (
      COALESCE((v_day_obj->>'id')::uuid, gen_random_uuid()),
      v_routine_id,
      v_day_obj->>'day_type',
      NULLIF(v_day_obj->>'day_number', '')::integer,
      v_day_obj->>'title',
      (v_day_obj->>'position')::integer
    )
    RETURNING id INTO v_day_id;

    -- 3. Iterar sobre los ejercicios del día
    FOR v_exercise_obj IN
      SELECT * FROM jsonb_array_elements(COALESCE(v_day_obj->'exercises', '[]'::jsonb))
    LOOP
      INSERT INTO public.routine_day_exercises (
        id,
        routine_day_id,
        exercise_id,
        position,
        rest_seconds,
        notes,
        measure_unit
      )
      VALUES (
        COALESCE((v_exercise_obj->>'id')::uuid, gen_random_uuid()),
        v_day_id,
        (v_exercise_obj->>'exercise_id')::uuid,
        (v_exercise_obj->>'position')::integer,
        NULLIF(v_exercise_obj->>'rest_seconds', '')::integer,
        NULLIF(v_exercise_obj->>'notes', ''),
        COALESCE(v_exercise_obj->>'measure_unit', 'kg')
      )
      RETURNING id INTO v_rde_id;

      -- 4. Insertar series
      FOR v_set_obj IN
        SELECT * FROM jsonb_array_elements(COALESCE(v_exercise_obj->'sets', '[]'::jsonb))
      LOOP
        INSERT INTO public.exercise_sets (
          routine_day_exercise_id,
          set_number,
          reps,
          weight,
          duration_minutes,
          duration_seconds,
          notes
        )
        VALUES (
          v_rde_id,
          (v_set_obj->>'set_number')::integer,
          NULLIF(v_set_obj->>'reps', '')::numeric,
          NULLIF(v_set_obj->>'weight', '')::numeric,
          NULLIF(v_set_obj->>'duration_minutes', '')::numeric,
          NULLIF(v_set_obj->>'duration_seconds', '')::numeric,
          NULLIF(v_set_obj->>'notes', '')
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_routine_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in import_routine: %', SQLERRM;
    RAISE;
END;
$$;


ALTER FUNCTION "public"."import_routine"("p_routine_name" "text", "p_routine_notes" "text", "p_days" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."import_routine"("p_routine_name" "text", "p_routine_notes" "text", "p_days" "jsonb") IS 'Importa una rutina completa (días + ejercicios + series) de forma atómica. El llamador debe resolver los exercise_id antes de invocar esta función. Todos los IDs de la jerarquía (routine_days, routine_day_exercises, exercise_sets) son generados freshly por la función si no se proveen.';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."exercise_favorites" (
    "user_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exercise_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_sets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_day_exercise_id" "uuid" NOT NULL,
    "set_number" integer NOT NULL,
    "reps" numeric(6,2),
    "weight" numeric(8,2),
    "duration_minutes" numeric(6,2),
    "duration_seconds" numeric(6,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."exercise_sets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "muscle_group_id" bigint NOT NULL,
    "equipment" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid"
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."function_rate_limits" (
    "user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "window_start" timestamp with time zone NOT NULL,
    "request_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "function_rate_limits_request_count_check" CHECK (("request_count" >= 0))
);


ALTER TABLE "public"."function_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muscle_groups" (
    "id" bigint NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "body_side" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "muscle_groups_body_side_check" CHECK (("body_side" = ANY (ARRAY['front'::"text", 'back'::"text", 'core'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."muscle_groups" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."muscle_groups_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."muscle_groups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."muscle_groups_id_seq" OWNED BY "public"."muscle_groups"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "username" "text",
    "avatar_url" "text",
    "unit_system" "text" DEFAULT 'kg'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bio" "text",
    "fitness_level" "text",
    CONSTRAINT "profiles_unit_system_check" CHECK (("unit_system" = ANY (ARRAY['kg'::"text", 'lb'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routine_day_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_day_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "rest_seconds" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "measure_unit" "text" DEFAULT 'kg'::"text",
    CONSTRAINT "routine_day_exercises_measure_unit_check" CHECK (("measure_unit" = ANY (ARRAY['kg'::"text", 'min'::"text", 'sec'::"text"])))
);


ALTER TABLE "public"."routine_day_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routine_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "day_type" "text" NOT NULL,
    "day_number" integer,
    "title" "text",
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "routine_days_core_day_number_check" CHECK (((("day_type" = 'core'::"text") AND ("day_number" IS NULL)) OR (("day_type" = 'weekday'::"text") AND ("day_number" IS NOT NULL)))),
    CONSTRAINT "routine_days_day_number_check" CHECK ((("day_number" >= 1) AND ("day_number" <= 7))),
    CONSTRAINT "routine_days_day_type_check" CHECK (("day_type" = ANY (ARRAY['core'::"text", 'weekday'::"text"])))
);


ALTER TABLE "public"."routine_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routine_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "routine_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "routine_sessions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."routine_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."routines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."routines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_day_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "routine_day_id" "uuid",
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone
);


ALTER TABLE "public"."session_day_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_exercise_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_day_log_id" "uuid" NOT NULL,
    "exercise_id" "uuid",
    "position" integer,
    "notes" "text"
);


ALTER TABLE "public"."session_exercise_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_set_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_exercise_log_id" "uuid" NOT NULL,
    "set_number" integer NOT NULL,
    "reps" numeric(6,2),
    "weight" numeric(8,2),
    "duration_minutes" numeric(6,2),
    "duration_seconds" numeric(6,2),
    "completed" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."session_set_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_goals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "weekly_volume_target" numeric(10,2) DEFAULT 20000 NOT NULL,
    "weekly_exercises_target" integer DEFAULT 30 NOT NULL,
    "weekly_duration_target" integer DEFAULT 300 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_goals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "theme" "text" DEFAULT 'dark'::"text",
    "language" "text" DEFAULT 'es'::"text",
    "units_preference" "text" DEFAULT 'kg'::"text",
    "notifications_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_preferences_language_check" CHECK (("language" = ANY (ARRAY['es'::"text", 'en'::"text"]))),
    CONSTRAINT "user_preferences_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text", 'auto'::"text"]))),
    CONSTRAINT "user_preferences_units_preference_check" CHECK (("units_preference" = ANY (ARRAY['kg'::"text", 'lb'::"text"])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_statistics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "week_start_date" "date" NOT NULL,
    "total_volume" numeric(10,2) DEFAULT 0,
    "total_volume_minutes" numeric(8,2) DEFAULT 0,
    "total_exercises" integer DEFAULT 0,
    "total_sessions" integer DEFAULT 0,
    "average_duration_minutes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."weekly_statistics" OWNER TO "postgres";


ALTER TABLE ONLY "public"."muscle_groups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."muscle_groups_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_pkey" PRIMARY KEY ("user_id", "exercise_id");



ALTER TABLE ONLY "public"."exercise_sets"
    ADD CONSTRAINT "exercise_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."function_rate_limits"
    ADD CONSTRAINT "function_rate_limits_pkey" PRIMARY KEY ("user_id", "action", "window_start");



ALTER TABLE ONLY "public"."muscle_groups"
    ADD CONSTRAINT "muscle_groups_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."muscle_groups"
    ADD CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."routine_day_exercises"
    ADD CONSTRAINT "routine_day_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routine_days"
    ADD CONSTRAINT "routine_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routine_sessions"
    ADD CONSTRAINT "routine_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_day_logs"
    ADD CONSTRAINT "session_day_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_exercise_logs"
    ADD CONSTRAINT "session_exercise_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_set_logs"
    ADD CONSTRAINT "session_set_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."weekly_statistics"
    ADD CONSTRAINT "weekly_statistics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_statistics"
    ADD CONSTRAINT "weekly_statistics_user_id_week_start_date_key" UNIQUE ("user_id", "week_start_date");



CREATE INDEX "exercise_favorites_exercise_id_idx" ON "public"."exercise_favorites" USING "btree" ("exercise_id");



CREATE UNIQUE INDEX "exercise_sets_routine_exercise_set_number_idx" ON "public"."exercise_sets" USING "btree" ("routine_day_exercise_id", "set_number");



CREATE INDEX "exercises_muscle_group_active_idx" ON "public"."exercises" USING "btree" ("muscle_group_id", "is_active");



CREATE INDEX "idx_user_goals_user_id" ON "public"."user_goals" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_weekly_statistics_user_week" ON "public"."weekly_statistics" USING "btree" ("user_id", "week_start_date" DESC);



CREATE UNIQUE INDEX "muscle_groups_code_idx" ON "public"."muscle_groups" USING "btree" ("code");



CREATE UNIQUE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");



CREATE UNIQUE INDEX "routine_day_exercises_day_position_idx" ON "public"."routine_day_exercises" USING "btree" ("routine_day_id", "position");



CREATE UNIQUE INDEX "routine_days_routine_day_number_idx" ON "public"."routine_days" USING "btree" ("routine_id", "day_number") WHERE ("day_number" IS NOT NULL);



CREATE UNIQUE INDEX "routine_days_routine_position_idx" ON "public"."routine_days" USING "btree" ("routine_id", "position");



CREATE INDEX "routine_sessions_user_started_idx" ON "public"."routine_sessions" USING "btree" ("user_id", "started_at" DESC);



CREATE INDEX "routines_user_active_updated_idx" ON "public"."routines" USING "btree" ("user_id", "is_active", "updated_at" DESC);



CREATE INDEX "session_day_logs_session_day_idx" ON "public"."session_day_logs" USING "btree" ("session_id", "routine_day_id");



CREATE INDEX "session_exercise_logs_day_position_idx" ON "public"."session_exercise_logs" USING "btree" ("session_day_log_id", "position");



CREATE UNIQUE INDEX "session_set_logs_exercise_set_number_idx" ON "public"."session_set_logs" USING "btree" ("session_exercise_log_id", "set_number");



CREATE OR REPLACE TRIGGER "on_profile_created" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_preferences"();



CREATE OR REPLACE TRIGGER "set_function_rate_limits_updated_at" BEFORE UPDATE ON "public"."function_rate_limits" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_routines_updated_at" BEFORE UPDATE ON "public"."routines" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_favorites"
    ADD CONSTRAINT "exercise_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_sets"
    ADD CONSTRAINT "exercise_sets_routine_day_exercise_id_fkey" FOREIGN KEY ("routine_day_exercise_id") REFERENCES "public"."routine_day_exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."function_rate_limits"
    ADD CONSTRAINT "function_rate_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_day_exercises"
    ADD CONSTRAINT "routine_day_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id");



ALTER TABLE ONLY "public"."routine_day_exercises"
    ADD CONSTRAINT "routine_day_exercises_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_days"
    ADD CONSTRAINT "routine_days_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_sessions"
    ADD CONSTRAINT "routine_sessions_routine_id_fkey" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routine_sessions"
    ADD CONSTRAINT "routine_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."routines"
    ADD CONSTRAINT "routines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_day_logs"
    ADD CONSTRAINT "session_day_logs_routine_day_id_fkey" FOREIGN KEY ("routine_day_id") REFERENCES "public"."routine_days"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_day_logs"
    ADD CONSTRAINT "session_day_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."routine_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_exercise_logs"
    ADD CONSTRAINT "session_exercise_logs_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_exercise_logs"
    ADD CONSTRAINT "session_exercise_logs_session_day_log_id_fkey" FOREIGN KEY ("session_day_log_id") REFERENCES "public"."session_day_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_set_logs"
    ADD CONSTRAINT "session_set_logs_session_exercise_log_id_fkey" FOREIGN KEY ("session_exercise_log_id") REFERENCES "public"."session_exercise_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_goals"
    ADD CONSTRAINT "user_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_statistics"
    ADD CONSTRAINT "weekly_statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Ejercicios publicos visibles por todos" ON "public"."exercises" FOR SELECT USING (("user_id" IS NULL));



CREATE POLICY "Ejercicios publicos y propios son visibles" ON "public"."exercises" FOR SELECT TO "authenticated" USING ((("user_id" IS NULL) OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert their own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Usuarios pueden actualizar sus propios ejercicios" ON "public"."exercises" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuarios pueden borrar sus propios ejercicios" ON "public"."exercises" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Usuarios pueden crear sus propios ejercicios" ON "public"."exercises" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."exercise_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercise_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercise_sets_manage_own" ON "public"."exercise_sets" USING ((EXISTS ( SELECT 1
   FROM (("public"."routine_day_exercises"
     JOIN "public"."routine_days" ON (("routine_days"."id" = "routine_day_exercises"."routine_day_id")))
     JOIN "public"."routines" ON (("routines"."id" = "routine_days"."routine_id")))
  WHERE (("routine_day_exercises"."id" = "exercise_sets"."routine_day_exercise_id") AND ("routines"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."routine_day_exercises"
     JOIN "public"."routine_days" ON (("routine_days"."id" = "routine_day_exercises"."routine_day_id")))
     JOIN "public"."routines" ON (("routines"."id" = "routine_days"."routine_id")))
  WHERE (("routine_day_exercises"."id" = "exercise_sets"."routine_day_exercise_id") AND ("routines"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercises_read_public" ON "public"."exercises" FOR SELECT USING (true);



CREATE POLICY "favorites_delete_own" ON "public"."exercise_favorites" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "favorites_insert_own" ON "public"."exercise_favorites" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "favorites_select_own" ON "public"."exercise_favorites" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."function_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."muscle_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muscle_groups_read_public" ON "public"."muscle_groups" FOR SELECT USING (true);



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "rate_limits_delete_own" ON "public"."function_rate_limits" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "rate_limits_insert_own" ON "public"."function_rate_limits" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "rate_limits_select_own" ON "public"."function_rate_limits" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "rate_limits_update_own" ON "public"."function_rate_limits" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."routine_day_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "routine_day_exercises_manage_own" ON "public"."routine_day_exercises" USING ((EXISTS ( SELECT 1
   FROM ("public"."routine_days"
     JOIN "public"."routines" ON (("routines"."id" = "routine_days"."routine_id")))
  WHERE (("routine_days"."id" = "routine_day_exercises"."routine_day_id") AND ("routines"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."routine_days"
     JOIN "public"."routines" ON (("routines"."id" = "routine_days"."routine_id")))
  WHERE (("routine_days"."id" = "routine_day_exercises"."routine_day_id") AND ("routines"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."routine_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "routine_days_manage_own" ON "public"."routine_days" USING ((EXISTS ( SELECT 1
   FROM "public"."routines"
  WHERE (("routines"."id" = "routine_days"."routine_id") AND ("routines"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."routines"
  WHERE (("routines"."id" = "routine_days"."routine_id") AND ("routines"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."routine_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "routine_sessions_manage_own" ON "public"."routine_sessions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."routines" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "routines_manage_own" ON "public"."routines" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."session_day_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_day_logs_manage_own" ON "public"."session_day_logs" USING ((EXISTS ( SELECT 1
   FROM "public"."routine_sessions"
  WHERE (("routine_sessions"."id" = "session_day_logs"."session_id") AND ("routine_sessions"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."routine_sessions"
  WHERE (("routine_sessions"."id" = "session_day_logs"."session_id") AND ("routine_sessions"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."session_exercise_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_exercise_logs_manage_own" ON "public"."session_exercise_logs" USING ((EXISTS ( SELECT 1
   FROM ("public"."session_day_logs"
     JOIN "public"."routine_sessions" ON (("routine_sessions"."id" = "session_day_logs"."session_id")))
  WHERE (("session_day_logs"."id" = "session_exercise_logs"."session_day_log_id") AND ("routine_sessions"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."session_day_logs"
     JOIN "public"."routine_sessions" ON (("routine_sessions"."id" = "session_day_logs"."session_id")))
  WHERE (("session_day_logs"."id" = "session_exercise_logs"."session_day_log_id") AND ("routine_sessions"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."session_set_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_set_logs_manage_own" ON "public"."session_set_logs" USING ((EXISTS ( SELECT 1
   FROM (("public"."session_exercise_logs"
     JOIN "public"."session_day_logs" ON (("session_day_logs"."id" = "session_exercise_logs"."session_day_log_id")))
     JOIN "public"."routine_sessions" ON (("routine_sessions"."id" = "session_day_logs"."session_id")))
  WHERE (("session_exercise_logs"."id" = "session_set_logs"."session_exercise_log_id") AND ("routine_sessions"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."session_exercise_logs"
     JOIN "public"."session_day_logs" ON (("session_day_logs"."id" = "session_exercise_logs"."session_day_log_id")))
     JOIN "public"."routine_sessions" ON (("routine_sessions"."id" = "session_day_logs"."session_id")))
  WHERE (("session_exercise_logs"."id" = "session_set_logs"."session_exercise_log_id") AND ("routine_sessions"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."user_goals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_own_goals" ON "public"."user_goals" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_insert_own_weekly_stats" ON "public"."weekly_statistics" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_update_own_goals" ON "public"."user_goals" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_update_own_weekly_stats" ON "public"."weekly_statistics" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_view_own_goals" ON "public"."user_goals" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users_view_own_weekly_stats" ON "public"."weekly_statistics" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."weekly_statistics" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."end_session_transaction"("p_session_id" "uuid", "p_ended_at" timestamp with time zone, "p_session_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."end_session_transaction"("p_session_id" "uuid", "p_ended_at" timestamp with time zone, "p_session_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_session_transaction"("p_session_id" "uuid", "p_ended_at" timestamp with time zone, "p_session_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."import_routine"("p_routine_name" "text", "p_routine_notes" "text", "p_days" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."import_routine"("p_routine_name" "text", "p_routine_notes" "text", "p_days" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_routine"("p_routine_name" "text", "p_routine_notes" "text", "p_days" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."exercise_favorites" TO "anon";
GRANT ALL ON TABLE "public"."exercise_favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_favorites" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_sets" TO "anon";
GRANT ALL ON TABLE "public"."exercise_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_sets" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."function_rate_limits" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."function_rate_limits" TO "authenticated";



GRANT ALL ON TABLE "public"."muscle_groups" TO "anon";
GRANT ALL ON TABLE "public"."muscle_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."muscle_groups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."muscle_groups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."muscle_groups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."muscle_groups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."routine_day_exercises" TO "anon";
GRANT ALL ON TABLE "public"."routine_day_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_day_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."routine_days" TO "anon";
GRANT ALL ON TABLE "public"."routine_days" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_days" TO "service_role";



GRANT ALL ON TABLE "public"."routine_sessions" TO "anon";
GRANT ALL ON TABLE "public"."routine_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."routine_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."routines" TO "anon";
GRANT ALL ON TABLE "public"."routines" TO "authenticated";
GRANT ALL ON TABLE "public"."routines" TO "service_role";



GRANT ALL ON TABLE "public"."session_day_logs" TO "anon";
GRANT ALL ON TABLE "public"."session_day_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."session_day_logs" TO "service_role";



GRANT ALL ON TABLE "public"."session_exercise_logs" TO "anon";
GRANT ALL ON TABLE "public"."session_exercise_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."session_exercise_logs" TO "service_role";



GRANT ALL ON TABLE "public"."session_set_logs" TO "anon";
GRANT ALL ON TABLE "public"."session_set_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."session_set_logs" TO "service_role";



GRANT ALL ON TABLE "public"."user_goals" TO "anon";
GRANT ALL ON TABLE "public"."user_goals" TO "authenticated";
GRANT ALL ON TABLE "public"."user_goals" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_statistics" TO "anon";
GRANT ALL ON TABLE "public"."weekly_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_statistics" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







