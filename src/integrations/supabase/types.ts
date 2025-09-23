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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      games: {
        Row: {
          created_at: string
          id: string
          mvp_player: string | null
          team1_captain: string | null
          team1_goals: number
          team1_players: string[]
          team2_captain: string | null
          team2_goals: number
          team2_players: string[]
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mvp_player?: string | null
          team1_captain?: string | null
          team1_goals: number
          team1_players: string[]
          team2_captain?: string | null
          team2_goals: number
          team2_players: string[]
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mvp_player?: string | null
          team1_captain?: string | null
          team1_goals?: number
          team1_players?: string[]
          team2_captain?: string | null
          team2_goals?: number
          team2_players?: string[]
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_mvp_player_fkey"
            columns: ["mvp_player"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      games_schedule: {
        Row: {
          created_at: string
          created_by: string
          id: string
          pitch_size: string | null
          scheduled_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          pitch_size?: string | null
          scheduled_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          pitch_size?: string | null
          scheduled_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      games_schedule_signups: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          game_schedule_id: string
          guest_name: string | null
          id: string
          is_guest: boolean | null
          player_id: string | null
          signed_up_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          game_schedule_id: string
          guest_name?: string | null
          id?: string
          is_guest?: boolean | null
          player_id?: string | null
          signed_up_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          game_schedule_id?: string
          guest_name?: string | null
          id?: string
          is_guest?: boolean | null
          player_id?: string | null
          signed_up_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_schedule_signups_game_schedule_id_fkey"
            columns: ["game_schedule_id"]
            isOneToOne: false
            referencedRelation: "games_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_schedule_signups_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          avatar_url: string | null
          badges: Json | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          badges?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          badges?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          email: string
          favorite_club: string | null
          favorite_position: string | null
          football_skills: Json | null
          id: string
          skill_ratings: Json | null
          updated_at: string
          user_id: string
          years_playing: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          favorite_club?: string | null
          favorite_position?: string | null
          football_skills?: Json | null
          id?: string
          skill_ratings?: Json | null
          updated_at?: string
          user_id: string
          years_playing?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          favorite_club?: string | null
          favorite_position?: string | null
          football_skills?: Json | null
          id?: string
          skill_ratings?: Json | null
          updated_at?: string
          user_id?: string
          years_playing?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_player_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          draws: number
          games_played: number
          goal_difference: number
          id: string
          losses: number
          mvp_awards: number
          name: string
          points: number
          user_id: string
          wins: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
