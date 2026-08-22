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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      agent_trace_logs: {
        Row: {
          created_at: string
          id: string
          message: string
          step_order: number
          step_type: Database["public"]["Enums"]["trace_step"]
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          step_order?: number
          step_type?: Database["public"]["Enums"]["trace_step"]
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          step_order?: number
          step_type?: Database["public"]["Enums"]["trace_step"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_trace_logs_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role?: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_rates_cache: {
        Row: {
          base_currency: string
          fetched_at: string
          id: string
          rate: number
          target_currency: string
        }
        Insert: {
          base_currency: string
          fetched_at?: string
          id?: string
          rate: number
          target_currency: string
        }
        Update: {
          base_currency?: string
          fetched_at?: string
          id?: string
          rate?: number
          target_currency?: string
        }
        Relationships: []
      }
      itinerary_items: {
        Row: {
          cost_estimate: number | null
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          itinerary_day_id: string
          lat: number | null
          lng: number | null
          location_name: string | null
          sort_order: number
          source_notes: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["item_status"]
          title: string
          type: Database["public"]["Enums"]["item_type"]
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          itinerary_day_id: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          sort_order?: number
          source_notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          title: string
          type?: Database["public"]["Enums"]["item_type"]
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          itinerary_day_id?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          sort_order?: number
          source_notes?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
          type?: Database["public"]["Enums"]["item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_itinerary_day_id_fkey"
            columns: ["itinerary_day_id"]
            isOneToOne: false
            referencedRelation: "trip_itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_lists: {
        Row: {
          auto_generated: boolean
          category: string
          created_at: string
          id: string
          is_packed: boolean
          item_name: string
          trip_id: string
        }
        Insert: {
          auto_generated?: boolean
          category?: string
          created_at?: string
          id?: string
          is_packed?: boolean
          item_name: string
          trip_id: string
        }
        Update: {
          auto_generated?: boolean
          category?: string
          created_at?: string
          id?: string
          is_packed?: boolean
          item_name?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_lists_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          budget_style: Database["public"]["Enums"]["budget_style"]
          created_at: string
          dietary_preference: Database["public"]["Enums"]["dietary_pref"]
          disliked_activities: string | null
          favorite_activities: string | null
          full_name: string | null
          home_currency: string
          id: string
          pace_preference: Database["public"]["Enums"]["pace_pref"]
          preferred_language: string
          traveler_type: string
          wake_up_preference: Database["public"]["Enums"]["wake_pref"]
        }
        Insert: {
          budget_style?: Database["public"]["Enums"]["budget_style"]
          created_at?: string
          dietary_preference?: Database["public"]["Enums"]["dietary_pref"]
          disliked_activities?: string | null
          favorite_activities?: string | null
          full_name?: string | null
          home_currency?: string
          id: string
          pace_preference?: Database["public"]["Enums"]["pace_pref"]
          preferred_language?: string
          traveler_type?: string
          wake_up_preference?: Database["public"]["Enums"]["wake_pref"]
        }
        Update: {
          budget_style?: Database["public"]["Enums"]["budget_style"]
          created_at?: string
          dietary_preference?: Database["public"]["Enums"]["dietary_pref"]
          disliked_activities?: string | null
          favorite_activities?: string | null
          full_name?: string | null
          home_currency?: string
          id?: string
          pace_preference?: Database["public"]["Enums"]["pace_pref"]
          preferred_language?: string
          traveler_type?: string
          wake_up_preference?: Database["public"]["Enums"]["wake_pref"]
        }
        Relationships: []
      }
      trip_documents: {
        Row: {
          file_name: string
          file_type: string
          id: string
          storage_path: string
          trip_id: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          file_name: string
          file_type?: string
          id?: string
          storage_path: string
          trip_id: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          file_name?: string
          file_type?: string
          id?: string
          storage_path?: string
          trip_id?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_itinerary_days: {
        Row: {
          created_at: string
          date: string | null
          day_number: number
          id: string
          notes: string | null
          trip_id: string
          weather_summary: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_number: number
          id?: string
          notes?: string | null
          trip_id: string
          weather_summary?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          day_number?: number
          id?: string
          notes?: string | null
          trip_id?: string
          weather_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_currency: string
          budget_total: number | null
          created_at: string
          destination: string
          end_date: string | null
          id: string
          origin: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          budget_currency?: string
          budget_total?: number | null
          created_at?: string
          destination: string
          end_date?: string | null
          id?: string
          origin?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          budget_currency?: string
          budget_total?: number | null
          created_at?: string
          destination?: string
          end_date?: string | null
          id?: string
          origin?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          content_text: string
          created_at: string
          feedback_type: Database["public"]["Enums"]["feedback_type"]
          id: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          content_text: string
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          content_text?: string
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type"]
          id?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memories_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      budget_style: "budget" | "mid" | "luxury"
      dietary_pref: "veg" | "vegan" | "halal" | "none" | "other"
      feedback_type: "liked" | "disliked" | "neutral"
      item_status: "proposed" | "confirmed" | "skipped"
      item_type: "transport" | "stay" | "activity" | "food"
      pace_pref: "relaxed" | "balanced" | "packed"
      trace_step:
        | "plan"
        | "tool_call"
        | "memory_read"
        | "memory_write"
        | "execute"
        | "replan"
      trip_status: "planning" | "confirmed" | "completed"
      wake_pref: "early" | "flexible" | "late"
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
    Enums: {
      budget_style: ["budget", "mid", "luxury"],
      dietary_pref: ["veg", "vegan", "halal", "none", "other"],
      feedback_type: ["liked", "disliked", "neutral"],
      item_status: ["proposed", "confirmed", "skipped"],
      item_type: ["transport", "stay", "activity", "food"],
      pace_pref: ["relaxed", "balanced", "packed"],
      trace_step: [
        "plan",
        "tool_call",
        "memory_read",
        "memory_write",
        "execute",
        "replan",
      ],
      trip_status: ["planning", "confirmed", "completed"],
      wake_pref: ["early", "flexible", "late"],
    },
  },
} as const
