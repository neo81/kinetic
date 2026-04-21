export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      exercise_favorites: {
        Row: {
          created_at: string;
          exercise_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      exercise_sets: {
        Row: {
          created_at: string;
          duration_minutes: number | null;
          duration_seconds: number | null;
          id: string;
          notes: string | null;
          reps: number | null;
          routine_day_exercise_id: string;
          set_number: number;
          weight: number | null;
        };
        Insert: {
          created_at?: string;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          id?: string;
          notes?: string | null;
          reps?: number | null;
          routine_day_exercise_id: string;
          set_number: number;
          weight?: number | null;
        };
        Update: {
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          notes?: string | null;
          reps?: number | null;
          set_number?: number;
          weight?: number | null;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          created_at: string;
          description: string | null;
          equipment: string | null;
          id: string;
          is_active: boolean;
          muscle_group_id: number;
          name: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          equipment?: string | null;
          id?: string;
          is_active?: boolean;
          muscle_group_id: number;
          name: string;
          user_id?: string | null;
        };
        Update: {
          description?: string | null;
          equipment?: string | null;
          is_active?: boolean;
          muscle_group_id?: number;
          name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      muscle_groups: {
        Row: {
          body_side: 'front' | 'back' | 'core' | 'other';
          code: string;
          id: number;
          name: string;
          sort_order: number;
        };
        Insert: {
          body_side: 'front' | 'back' | 'core' | 'other';
          code: string;
          id?: number;
          name: string;
          sort_order?: number;
        };
        Update: {
          body_side?: 'front' | 'back' | 'core' | 'other';
          code?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          fitness_level: string | null;
          full_name: string | null;
          id: string;
          unit_system: 'kg' | 'lb';
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          fitness_level?: string | null;
          full_name?: string | null;
          id: string;
          unit_system?: 'kg' | 'lb';
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          fitness_level?: string | null;
          full_name?: string | null;
          unit_system?: 'kg' | 'lb';
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      routine_day_exercises: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          measure_unit: 'kg' | 'min' | 'sec' | null;
          notes: string | null;
          position: number;
          rest_seconds: number | null;
          routine_day_id: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          measure_unit?: 'kg' | 'min' | 'sec' | null;
          notes?: string | null;
          position: number;
          rest_seconds?: number | null;
          routine_day_id: string;
        };
        Update: {
          exercise_id?: string;
          measure_unit?: 'kg' | 'min' | 'sec' | null;
          notes?: string | null;
          position?: number;
          rest_seconds?: number | null;
        };
        Relationships: [];
      };
      routine_days: {
        Row: {
          created_at: string;
          day_number: number | null;
          day_type: 'core' | 'weekday';
          id: string;
          position: number;
          routine_id: string;
          title: string | null;
        };
        Insert: {
          created_at?: string;
          day_number?: number | null;
          day_type: 'core' | 'weekday';
          id?: string;
          position: number;
          routine_id: string;
          title?: string | null;
        };
        Update: {
          day_number?: number | null;
          day_type?: 'core' | 'weekday';
          position?: number;
          title?: string | null;
        };
        Relationships: [];
      };
      routine_sessions: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          routine_id: string | null;
          started_at: string | null;
          status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          routine_id?: string | null;
          started_at?: string | null;
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          user_id: string;
        };
        Update: {
          ended_at?: string | null;
          routine_id?: string | null;
          started_at?: string | null;
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
        };
        Relationships: [];
      };
      routines: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_day_logs: {
        Row: {
          ended_at: string | null;
          id: string;
          routine_day_id: string | null;
          session_id: string;
          started_at: string | null;
        };
        Insert: {
          ended_at?: string | null;
          id?: string;
          routine_day_id?: string | null;
          session_id: string;
          started_at?: string | null;
        };
        Update: {
          ended_at?: string | null;
          routine_day_id?: string | null;
          started_at?: string | null;
        };
        Relationships: [];
      };
      session_exercise_logs: {
        Row: {
          exercise_id: string | null;
          id: string;
          notes: string | null;
          position: number | null;
          session_day_log_id: string;
        };
        Insert: {
          exercise_id?: string | null;
          id?: string;
          notes?: string | null;
          position?: number | null;
          session_day_log_id: string;
        };
        Update: {
          exercise_id?: string | null;
          notes?: string | null;
          position?: number | null;
        };
        Relationships: [];
      };
      session_set_logs: {
        Row: {
          completed: boolean;
          duration_minutes: number | null;
          duration_seconds: number | null;
          id: string;
          reps: number | null;
          session_exercise_log_id: string;
          set_number: number;
          weight: number | null;
        };
        Insert: {
          completed?: boolean;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          id?: string;
          reps?: number | null;
          session_exercise_log_id: string;
          set_number: number;
          weight?: number | null;
        };
        Update: {
          completed?: boolean;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          reps?: number | null;
          set_number?: number;
          weight?: number | null;
        };
        Relationships: [];
      };
      user_goals: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
          weekly_duration_target: number;
          weekly_exercises_target: number;
          weekly_volume_target: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
          weekly_duration_target?: number;
          weekly_exercises_target?: number;
          weekly_volume_target?: number;
        };
        Update: {
          updated_at?: string;
          weekly_duration_target?: number;
          weekly_exercises_target?: number;
          weekly_volume_target?: number;
        };
        Relationships: [];
      };
      weekly_statistics: {
        Row: {
          average_duration_minutes: number;
          created_at: string;
          id: string;
          total_exercises: number;
          total_sessions: number;
          total_volume: number;
          total_volume_minutes: number;
          user_id: string;
          week_start_date: string;
        };
        Insert: {
          average_duration_minutes?: number;
          created_at?: string;
          id?: string;
          total_exercises?: number;
          total_sessions?: number;
          total_volume?: number;
          total_volume_minutes?: number;
          user_id: string;
          week_start_date: string;
        };
        Update: {
          average_duration_minutes?: number;
          total_exercises?: number;
          total_sessions?: number;
          total_volume?: number;
          total_volume_minutes?: number;
          week_start_date?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      end_session_transaction: {
        Args: {
          p_ended_at: string;
          p_session_data: Json;
          p_session_id: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
