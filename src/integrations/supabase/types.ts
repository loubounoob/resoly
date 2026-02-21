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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      challenges: {
        Row: {
          bet_per_month: number
          coins_awarded: number
          created_at: string
          duration_months: number
          first_week_sessions: number | null
          id: string
          odds: number
          payment_status: string
          sessions_per_week: number
          social_challenge_id: string | null
          started_at: string
          status: string
          stripe_payment_intent_id: string | null
          total_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bet_per_month?: number
          coins_awarded?: number
          created_at?: string
          duration_months?: number
          first_week_sessions?: number | null
          id?: string
          odds?: number
          payment_status?: string
          sessions_per_week?: number
          social_challenge_id?: string | null
          started_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bet_per_month?: number
          coins_awarded?: number
          created_at?: string
          duration_months?: number
          first_week_sessions?: number | null
          id?: string
          odds?: number
          payment_status?: string
          sessions_per_week?: number
          social_challenge_id?: string | null
          started_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          total_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_social_challenge_id_fkey"
            columns: ["social_challenge_id"]
            isOneToOne: false
            referencedRelation: "social_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      check_ins: {
        Row: {
          challenge_id: string
          checked_in_at: string
          created_at: string
          id: string
          photo_url: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          challenge_id: string
          checked_in_at?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          challenge_id?: string
          checked_in_at?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_orders: {
        Row: {
          coins_spent: number
          created_at: string
          email: string | null
          id: string
          price_amount: number | null
          price_currency: string | null
          product_title: string
          selected_options: Json | null
          shipping_address1: string | null
          shipping_address2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_first_name: string | null
          shipping_last_name: string | null
          shipping_phone: string | null
          shipping_zip: string | null
          status: string
          user_id: string
          variant_id: string
          variant_title: string | null
        }
        Insert: {
          coins_spent: number
          created_at?: string
          email?: string | null
          id?: string
          price_amount?: number | null
          price_currency?: string | null
          product_title: string
          selected_options?: Json | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_first_name?: string | null
          shipping_last_name?: string | null
          shipping_phone?: string | null
          shipping_zip?: string | null
          status?: string
          user_id: string
          variant_id: string
          variant_title?: string | null
        }
        Update: {
          coins_spent?: number
          created_at?: string
          email?: string | null
          id?: string
          price_amount?: number | null
          price_currency?: string | null
          product_title?: string
          selected_options?: Json | null
          shipping_address1?: string | null
          shipping_address2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_first_name?: string | null
          shipping_last_name?: string | null
          shipping_phone?: string | null
          shipping_zip?: string | null
          status?: string
          user_id?: string
          variant_id?: string
          variant_title?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_payouts: {
        Row: {
          amount: number
          challenge_id: string
          created_at: string
          iban: string
          id: string
          social_challenge_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          challenge_id: string
          created_at?: string
          iban: string
          id?: string
          social_challenge_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          challenge_id?: string
          created_at?: string
          iban?: string
          id?: string
          social_challenge_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address1: string | null
          address2: string | null
          age: number | null
          avatar_url: string | null
          city: string | null
          coins: number
          country: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          gender: string | null
          gym_latitude: number | null
          gym_longitude: number | null
          gym_name: string | null
          iban: string | null
          id: string
          invite_code: string | null
          last_name: string | null
          phone: string | null
          referral_bonus_paid: boolean
          referred_by: string | null
          updated_at: string
          user_id: string
          username: string | null
          zip: string | null
        }
        Insert: {
          address1?: string | null
          address2?: string | null
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          coins?: number
          country?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          gender?: string | null
          gym_latitude?: number | null
          gym_longitude?: number | null
          gym_name?: string | null
          iban?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          phone?: string | null
          referral_bonus_paid?: boolean
          referred_by?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          zip?: string | null
        }
        Update: {
          address1?: string | null
          address2?: string | null
          age?: number | null
          avatar_url?: string | null
          city?: string | null
          coins?: number
          country?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          gender?: string | null
          gym_latitude?: number | null
          gym_longitude?: number | null
          gym_name?: string | null
          iban?: string | null
          id?: string
          invite_code?: string | null
          last_name?: string | null
          phone?: string | null
          referral_bonus_paid?: boolean
          referred_by?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          challenge_id: string
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          name: string
          tier: number
          unlocked: boolean
          user_id: string
          value: string | null
        }
        Insert: {
          challenge_id: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name: string
          tier?: number
          unlocked?: boolean
          user_id: string
          value?: string | null
        }
        Update: {
          challenge_id?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          name?: string
          tier?: number
          unlocked?: boolean
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          coins_spent: number
          created_at: string
          id: string
          product_id: string
          status: string
          user_id: string
        }
        Insert: {
          coins_spent: number
          created_at?: string
          id?: string
          product_id: string
          status?: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          created_at?: string
          id?: string
          product_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          active: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price_coins: number
          stock: number
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price_coins: number
          stock?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price_coins?: number
          stock?: number
        }
        Relationships: []
      }
      shopify_tokens: {
        Row: {
          access_token: string
          created_at: string
          id: string
          scopes: string | null
          shop_domain: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          scopes?: string | null
          shop_domain: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          scopes?: string | null
          shop_domain?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_challenge_members: {
        Row: {
          bet_amount: number
          challenge_id: string | null
          created_at: string
          iban: string | null
          id: string
          payment_status: string
          social_challenge_id: string
          status: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          bet_amount?: number
          challenge_id?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          payment_status?: string
          social_challenge_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          bet_amount?: number
          challenge_id?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          payment_status?: string
          social_challenge_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_challenge_members_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_challenge_members_social_challenge_id_fkey"
            columns: ["social_challenge_id"]
            isOneToOne: false
            referencedRelation: "social_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      social_challenges: {
        Row: {
          bet_amount: number
          created_at: string
          created_by: string
          duration_months: number
          group_id: string | null
          id: string
          sessions_per_week: number
          status: string
          target_user_id: string | null
          type: string
        }
        Insert: {
          bet_amount?: number
          created_at?: string
          created_by: string
          duration_months?: number
          group_id?: string | null
          id?: string
          sessions_per_week?: number
          status?: string
          target_user_id?: string | null
          type: string
        }
        Update: {
          bet_amount?: number
          created_at?: string
          created_by?: string
          duration_months?: number
          group_id?: string | null
          id?: string
          sessions_per_week?: number
          status?: string
          target_user_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_social_challenge_member: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
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
