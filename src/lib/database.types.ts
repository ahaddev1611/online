
// This is a placeholder file.
// You MUST generate this file based on your Supabase project schema.
// Run the following command in your terminal:
// npx supabase gen types typescript --project-id YOUR_PROJECT_ID --schema public > src/lib/database.types.ts
// Replace YOUR_PROJECT_ID with your actual Supabase project ID.
// After running, ensure the new tables (deals, sales, deleted_item_logs, app_settings) are present.

import type { DealItem as AppDealItem, BillItem as AppBillItem } from "./definitions";

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
      menu_items: {
        Row: {
          id: string
          code: string
          name: string
          price: number
          category: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          price: number
          category?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          price?: number
          category?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          deal_number: string
          name: string
          description: string | null
          items: Json // Stored as JSONB in Supabase, maps to AppDealItem[]
          calculated_total_deal_price: number
          is_active: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          deal_number: string
          name: string
          description?: string | null
          items: Json 
          calculated_total_deal_price: number
          is_active?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          deal_number?: string
          name?: string
          description?: string | null
          items?: Json
          calculated_total_deal_price?: number
          is_active?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          id: string
          table_number: string | null
          customer_name: string | null
          waiter_name: string | null
          items: Json // Stored as JSONB, maps to AppBillItem[]
          subtotal: number
          tax: number | null
          discount: number | null
          total_amount: number
          created_at: string // App-generated timestamp for the sale moment
          business_day: string // YYYY-MM-DD format
          cashier_id: string // Supabase auth user ID
          created_db_entry_at: string | null // DB record creation time
        }
        Insert: {
          id?: string
          table_number?: string | null
          customer_name?: string | null
          waiter_name?: string | null
          items: Json
          subtotal: number
          tax?: number | null
          discount?: number | null
          total_amount: number
          created_at: string
          business_day: string
          cashier_id: string
          created_db_entry_at?: string | null
        }
        Update: { 
          id?: string
          table_number?: string | null
          customer_name?: string | null
          waiter_name?: string | null
          items?: Json
          subtotal?: number
          tax?: number | null
          discount?: number | null
          total_amount?: number
          created_at?: string
          business_day?: string
          cashier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cashier_id_fkey"
            columns: ["cashier_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      deleted_item_logs: {
        Row: {
          id: string
          menu_item_id: string | null
          item_name: string
          item_code: string
          quantity_removed: number
          price_per_item: number
          removed_by_cashier_id: string // Supabase auth user ID
          bill_id: string | null // Reference to sales.id
          timestamp: string // Timestamp of deletion
          reason: string | null
          is_deal_item: boolean | null
          deal_name: string | null
        }
        Insert: {
          id?: string
          menu_item_id?: string | null
          item_name: string
          item_code: string
          quantity_removed: number
          price_per_item: number
          removed_by_cashier_id: string
          bill_id?: string | null
          timestamp?: string
          reason?: string | null
          is_deal_item?: boolean | null
          deal_name?: string | null
        }
        Update: { 
          id?: string
          menu_item_id?: string | null
          item_name?: string
          item_code?: string
          quantity_removed?: number
          price_per_item?: number
          removed_by_cashier_id?: string
          bill_id?: string | null
          timestamp?: string
          reason?: string | null
          is_deal_item?: boolean | null
          deal_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deleted_item_logs_menu_item_id_fkey"
            columns: ["menu_item_id"]
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_item_logs_removed_by_cashier_id_fkey"
            columns: ["removed_by_cashier_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deleted_item_logs_bill_id_fkey"
            columns: ["bill_id"]
            referencedRelation: "sales"
            referencedColumns: ["id"]
          }
        ]
      }
      app_settings: {
        Row: {
          setting_key: string 
          value: string 
          updated_at: string | null
        }
        Insert: {
          setting_key: string
          value: string 
          updated_at?: string | null
        }
        Update: {
          setting_key?: string
          value?: string 
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: { // Added based on usage in data.ts
        Row: {
          id: string // user_id from auth.users
          role: string // 'admin' or 'cashier'
          display_name: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role: string
          display_name?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string
          display_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
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
      is_admin: { // Added based on usage
        Args: Record<PropertyKey, never>
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

// Helper types based on your definitions.ts, adapt as needed
export type MenuItem = Database['public']['Tables']['menu_items']['Row'];
export type NewMenuItem = Database['public']['Tables']['menu_items']['Insert'];
export type UpdatedMenuItem = Database['public']['Tables']['menu_items']['Update'];
export type MenuItem_Insert_Upsert = Database['public']['Tables']['menu_items']['Insert'];


export type Deal = Database['public']['Tables']['deals']['Row'];
export type NewDeal = Database['public']['Tables']['deals']['Insert'];
export type UpdatedDeal = Database['public']['Tables']['deals']['Update'];
export type Deal_Insert_Upsert = Database['public']['Tables']['deals']['Insert'];


export type Sale = Database['public']['Tables']['sales']['Row'];
export type NewSale = Database['public']['Tables']['sales']['Insert'];

export type DeletedItemLog = Database['public']['Tables']['deleted_item_logs']['Row'];
export type NewDeletedItemLog = Database['public']['Tables']['deleted_item_logs']['Insert'];

export type AppSetting = Database['public']['Tables']['app_settings']['Row'];
export type NewAppSetting = Database['public']['Tables']['app_settings']['Insert'];
export type UpdatedAppSetting = Database['public']['Tables']['app_settings']['Update'];
export type AppSetting_Insert_Upsert = Database['public']['Tables']['app_settings']['Insert'];


export type SupabaseUserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type NewUserProfile = Database['public']['Tables']['user_profiles']['Insert'];
