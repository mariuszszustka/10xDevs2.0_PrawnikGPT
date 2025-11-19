export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      legal_acts: {
        Row: {
          id: string
          publisher: string
          year: number
          position: number
          title: string
          typ_aktu: string
          status: Database["public"]["Enums"]["legal_act_status_enum"]
          organ_wydajacy: string | null
          published_date: string
          effective_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          publisher: string
          year: number
          position: number
          title: string
          typ_aktu: string
          status: Database["public"]["Enums"]["legal_act_status_enum"]
          organ_wydajacy?: string | null
          published_date: string
          effective_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          publisher?: string
          year?: number
          position?: number
          title?: string
          typ_aktu?: string
          status?: Database["public"]["Enums"]["legal_act_status_enum"]
          organ_wydajacy?: string | null
          published_date?: string
          effective_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_act_chunks: {
        Row: {
          id: string
          legal_act_id: string
          chunk_index: number
          content: string
          embedding: string // vector(1024) represented as string
          embedding_model_name: string
          metadata: Json | null
          content_tsvector: unknown | null
          created_at: string
        }
        Insert: {
          id?: string
          legal_act_id: string
          chunk_index: number
          content: string
          embedding: string
          embedding_model_name: string
          metadata?: Json | null
          content_tsvector?: unknown | null
          created_at?: string
        }
        Update: {
          id?: string
          legal_act_id?: string
          chunk_index?: number
          content?: string
          embedding?: string
          embedding_model_name?: string
          metadata?: Json | null
          content_tsvector?: unknown | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_act_chunks_legal_act_id_fkey"
            columns: ["legal_act_id"]
            isOneToOne: false
            referencedRelation: "legal_acts"
            referencedColumns: ["id"]
          }
        ]
      }
      query_history: {
        Row: {
          id: string
          user_id: string
          query_text: string
          fast_response_content: string
          accurate_response_content: string | null
          sources: Json
          fast_model_name: string
          accurate_model_name: string | null
          fast_generation_time_ms: number
          accurate_generation_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query_text: string
          fast_response_content: string
          accurate_response_content?: string | null
          sources?: Json
          fast_model_name: string
          accurate_model_name?: string | null
          fast_generation_time_ms: number
          accurate_generation_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query_text?: string
          fast_response_content?: string
          accurate_response_content?: string | null
          sources?: Json
          fast_model_name?: string
          accurate_model_name?: string | null
          fast_generation_time_ms?: number
          accurate_generation_time_ms?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "query_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      ratings: {
        Row: {
          id: string
          query_history_id: string
          user_id: string
          response_type: Database["public"]["Enums"]["response_type_enum"]
          rating_value: Database["public"]["Enums"]["rating_value_enum"]
          comment: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_history_id: string
          user_id: string
          response_type: Database["public"]["Enums"]["response_type_enum"]
          rating_value: Database["public"]["Enums"]["rating_value_enum"]
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_history_id?: string
          user_id?: string
          response_type?: Database["public"]["Enums"]["response_type_enum"]
          rating_value?: Database["public"]["Enums"]["rating_value_enum"]
          comment?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_query_history_id_fkey"
            columns: ["query_history_id"]
            isOneToOne: false
            referencedRelation: "query_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
      legal_act_status_enum: "obowiązująca" | "uchylona" | "nieobowiązująca"
      rating_value_enum: "up" | "down"
      relation_type_enum: "modifies" | "repeals" | "implements" | "based_on" | "amends"
      response_type_enum: "fast" | "accurate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
      PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
      PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

