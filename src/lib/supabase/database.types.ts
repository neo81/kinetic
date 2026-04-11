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
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          username: string | null;
          avatar_url: string | null;
          unit_system: 'kg' | 'lb';
          created_at: string;
          updated_at: string;
          bio: string | null;
          fitness_level: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          unit_system?: 'kg' | 'lb';
          created_at?: string;
          updated_at?: string;
          bio?: string | null;
          fitness_level?: string | null;
        };
        Update: {
          full_name?: string | null;
          username?: string | null;
          avatar_url?: string | null;
          unit_system?: 'kg' | 'lb';
          updated_at?: string;
          bio?: string | null;
          fitness_level?: string | null;
        };
        Relationships: [];
      };
      muscle_groups: {
        Row: {
          id: number;
          code: string;
          name: string;
          body_side: 'front' | 'back' | 'core' | 'other';
          sort_order: number;
        };
        Insert: {
          id?: number;
          code: string;
          name: string;
          body_side: 'front' | 'back' | 'core' | 'other';
          sort_order?: number;
        };
        Update: {
          code?: string;
          name?: string;
          body_side?: 'front' | 'back' | 'core' | 'other';
          sort_order?: number;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          muscle_group_id: number;
          equipment: string | null;
          is_active: boolean;
          created_at: string;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          muscle_group_id: number;
          equipment?: string | null;
          is_active?: boolean;
          created_at?: string;
          user_id?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          muscle_group_id?: number;
          equipment?: string | null;
          is_active?: boolean;
          user_id?: string | null;
        };
        Relationships: [];
      };
      routines: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          notes?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      routine_days: {
        Row: {
          id: string;
          routine_id: string;
          day_type: 'core' | 'weekday';
          day_number: number | null;
          title: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          day_type: 'core' | 'weekday';
          day_number?: number | null;
          title?: string | null;
          position: number;
          created_at?: string;
        };
        Update: {
          day_type?: 'core' | 'weekday';
          day_number?: number | null;
          title?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      routine_day_exercises: {
        Row: {
          id: string;
          routine_day_id: string;
          exercise_id: string;
          position: number;
          rest_seconds: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          routine_day_id: string;
          exercise_id: string;
          position: number;
          rest_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          exercise_id?: string;
          position?: number;
          rest_seconds?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      exercise_sets: {
        Row: {
          id: string;
          routine_day_exercise_id: string;
          set_number: number;
          reps: number | null;
          weight: number | null;
          duration_minutes: number | null;
          duration_seconds: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          routine_day_exercise_id: string;
          set_number: number;
          reps?: number | null;
          weight?: number | null;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          set_number?: number;
          reps?: number | null;
          weight?: number | null;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      routine_sessions: {
        Row: {
          id: string;
          routine_id: string;
          user_id: string;
          started_at: string | null;
          ended_at: string | null;
          status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          created_at: string;
        };
        Insert: {
          id?: string;
          routine_id: string;
          user_id: string;
          started_at?: string | null;
          ended_at?: string | null;
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
          created_at?: string;
        };
        Update: {
          started_at?: string | null;
          ended_at?: string | null;
          status?: 'draft' | 'in_progress' | 'completed' | 'cancelled';
        };
        Relationships: [];
      };
      session_day_logs: {
        Row: {
          id: string;
          session_id: string;
          routine_day_id: string;
          started_at: string | null;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          routine_day_id: string;
          started_at?: string | null;
          ended_at?: string | null;
        };
        Update: {
          started_at?: string | null;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      session_exercise_logs: {
        Row: {
          id: string;
          session_day_log_id: string;
          exercise_id: string;
          position: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          session_day_log_id: string;
          exercise_id: string;
          position?: number | null;
          notes?: string | null;
        };
        Update: {
          position?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      session_set_logs: {
        Row: {
          id: string;
          session_exercise_log_id: string;
          set_number: number;
          reps: number | null;
          weight: number | null;
          duration_minutes: number | null;
          duration_seconds: number | null;
          completed: boolean;
        };
        Insert: {
          id?: string;
          session_exercise_log_id: string;
          set_number: number;
          reps?: number | null;
          weight?: number | null;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          completed?: boolean;
        };
        Update: {
          set_number?: number;
          reps?: number | null;
          weight?: number | null;
          duration_minutes?: number | null;
          duration_seconds?: number | null;
          completed?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
