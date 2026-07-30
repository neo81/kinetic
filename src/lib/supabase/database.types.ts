export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_release_notes: {
        Row: {
          created_at: string
          description: string
          id: string
          position: number
          release_version: string
          title: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          position: number
          release_version: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          position?: number
          release_version?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_release_notes_release_version_fkey"
            columns: ["release_version"]
            isOneToOne: false
            referencedRelation: "app_releases"
            referencedColumns: ["version"]
          },
        ]
      }
      app_releases: {
        Row: {
          created_at: string
          is_published: boolean
          published_at: string
          title: string
          version: string
        }
        Insert: {
          created_at?: string
          is_published?: boolean
          published_at: string
          title: string
          version: string
        }
        Update: {
          created_at?: string
          is_published?: boolean
          published_at?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      exercise_favorites: {
        Row: {
          created_at: string
          exercise_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_favorites_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_release_reads: {
        Row: {
          read_at: string
          release_version: string
          user_id: string
        }
        Insert: {
          read_at?: string
          release_version: string
          user_id: string
        }
        Update: {
          read_at?: string
          release_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_release_reads_release_version_fkey"
            columns: ["release_version"]
            isOneToOne: false
            referencedRelation: "app_releases"
            referencedColumns: ["version"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          created_at: string
          duration_minutes: number | null
          duration_seconds: number | null
          id: string
          notes: string | null
          reps: number | null
          routine_day_exercise_id: string
          set_number: number
          target_type: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          reps?: number | null
          routine_day_exercise_id: string
          set_number: number
          target_type?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          reps?: number | null
          routine_day_exercise_id?: string
          set_number?: number
          target_type?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_routine_day_exercise_id_fkey"
            columns: ["routine_day_exercise_id"]
            isOneToOne: false
            referencedRelation: "routine_day_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          description: string | null
          equipment: string | null
          id: string
          is_active: boolean
          muscle_group_id: number
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          is_active?: boolean
          muscle_group_id: number
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          equipment?: string | null
          id?: string
          is_active?: boolean
          muscle_group_id?: number
          name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      function_rate_limits: {
        Row: {
          action: string
          created_at: string
          request_count: number
          updated_at: string
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          created_at?: string
          request_count?: number
          updated_at?: string
          user_id: string
          window_start: string
        }
        Update: {
          action?: string
          created_at?: string
          request_count?: number
          updated_at?: string
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      muscle_groups: {
        Row: {
          body_side: string
          code: string
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          body_side: string
          code: string
          id?: number
          name: string
          sort_order?: number
        }
        Update: {
          body_side?: string
          code?: string
          id?: number
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          body_weight_kg: number | null
          created_at: string
          fitness_level: string | null
          full_name: string | null
          height_cm: number | null
          id: string
          unit_system: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          body_weight_kg?: number | null
          created_at?: string
          fitness_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id: string
          unit_system?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          body_weight_kg?: number | null
          created_at?: string
          fitness_level?: string | null
          full_name?: string | null
          height_cm?: number | null
          id?: string
          unit_system?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      routine_day_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          load_type: string
          measure_unit: string | null
          notes: string | null
          position: number
          rest_seconds: number | null
          routine_day_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          load_type?: string
          measure_unit?: string | null
          notes?: string | null
          position: number
          rest_seconds?: number | null
          routine_day_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          load_type?: string
          measure_unit?: string | null
          notes?: string | null
          position?: number
          rest_seconds?: number | null
          routine_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_day_exercises_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_days: {
        Row: {
          created_at: string
          day_number: number | null
          day_type: string
          id: string
          position: number
          routine_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          day_number?: number | null
          day_type: string
          id?: string
          position: number
          routine_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          day_number?: number | null
          day_type?: string
          id?: string
          position?: number
          routine_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_days_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          routine_id: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          routine_id: string
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          routine_id?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_sessions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_day_logs: {
        Row: {
          ended_at: string | null
          id: string
          routine_day_id: string | null
          session_id: string
          started_at: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          routine_day_id?: string | null
          session_id: string
          started_at?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          routine_day_id?: string | null
          session_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_day_logs_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_day_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "routine_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercise_logs: {
        Row: {
          exercise_id: string | null
          id: string
          notes: string | null
          position: number | null
          session_day_log_id: string
        }
        Insert: {
          exercise_id?: string | null
          id?: string
          notes?: string | null
          position?: number | null
          session_day_log_id: string
        }
        Update: {
          exercise_id?: string | null
          id?: string
          notes?: string | null
          position?: number | null
          session_day_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercise_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercise_logs_session_day_log_id_fkey"
            columns: ["session_day_log_id"]
            isOneToOne: false
            referencedRelation: "session_day_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_set_logs: {
        Row: {
          body_weight_kg_snapshot: number | null
          completed: boolean
          duration_minutes: number | null
          duration_seconds: number | null
          id: string
          load_type: string
          reps: number | null
          session_exercise_log_id: string
          set_number: number
          target_type: string
          weight: number | null
        }
        Insert: {
          body_weight_kg_snapshot?: number | null
          completed?: boolean
          duration_minutes?: number | null
          duration_seconds?: number | null
          id?: string
          load_type?: string
          reps?: number | null
          session_exercise_log_id: string
          set_number: number
          target_type?: string
          weight?: number | null
        }
        Update: {
          body_weight_kg_snapshot?: number | null
          completed?: boolean
          duration_minutes?: number | null
          duration_seconds?: number | null
          id?: string
          load_type?: string
          reps?: number | null
          session_exercise_log_id?: string
          set_number?: number
          target_type?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_set_logs_session_exercise_log_id_fkey"
            columns: ["session_exercise_log_id"]
            isOneToOne: false
            referencedRelation: "session_exercise_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          weekly_duration_target: number
          weekly_exercises_target: number
          weekly_volume_target: number
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          weekly_duration_target?: number
          weekly_exercises_target?: number
          weekly_volume_target?: number
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          weekly_duration_target?: number
          weekly_exercises_target?: number
          weekly_volume_target?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          theme: string | null
          units_preference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          theme?: string | null
          units_preference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          theme?: string | null
          units_preference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_statistics: {
        Row: {
          average_duration_minutes: number | null
          created_at: string
          id: string
          total_exercises: number | null
          total_sessions: number | null
          total_volume: number | null
          total_volume_minutes: number | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          average_duration_minutes?: number | null
          created_at?: string
          id?: string
          total_exercises?: number | null
          total_sessions?: number | null
          total_volume?: number | null
          total_volume_minutes?: number | null
          user_id: string
          week_start_date: string
        }
        Update: {
          average_duration_minutes?: number | null
          created_at?: string
          id?: string
          total_exercises?: number | null
          total_sessions?: number | null
          total_volume?: number | null
          total_volume_minutes?: number | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      end_session_transaction: {
        Args: { p_ended_at: string; p_session_data: Json; p_session_id: string }
        Returns: string
      }
      import_routine: {
        Args: { p_days: Json; p_routine_name: string; p_routine_notes: string }
        Returns: string
      }
      reorder_routine_day_exercises: {
        Args: { p_ordered_exercise_ids: string[]; p_routine_day_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
