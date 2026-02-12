export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      members: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          is_custom: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_custom?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_custom?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          member_id: string;
          date: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          member_id: string;
          date: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          member_id?: string;
          date?: string;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          }
        ];
      };
      session_planned_exercises: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          order_index: number;
        };
        Update: {
          id?: string;
          session_id?: string;
          exercise_id?: string;
          order_index?: number;
        };
        Relationships: [
          {
            foreignKeyName: "session_planned_exercises_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_planned_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          }
        ];
      };
      set_results: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps: number;
          weight: number | null;
          unit: "lb" | "kg";
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          set_number: number;
          reps: number;
          weight?: number | null;
          unit?: "lb" | "kg";
        };
        Update: {
          id?: string;
          session_id?: string;
          exercise_id?: string;
          set_number?: number;
          reps?: number;
          weight?: number | null;
          unit?: "lb" | "kg";
        };
        Relationships: [
          {
            foreignKeyName: "set_results_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "set_results_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
