
export type UserRole = 'admin' | 'cashier';

// This User interface is primarily for mock/client-side representation if needed,
// actual user management is via Supabase Auth.
export interface User {
  id: string; // Corresponds to Supabase auth.users.id
  username: string; // Typically user's email
  role: UserRole;
  // password field should NOT be stored or managed here.
}

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  price: number;
  category?: string;
}

export interface DealItem {
  menuItemId: string;
  name: string;
  quantity: number;
  dealPricePerItem: number;
  originalPricePerItem: number;
}

export interface Deal {
  id: string;
  dealNumber: string; // Renamed from deal_number for consistency
  name: string;
  description?: string;
  items: DealItem[];
  calculatedTotalDealPrice: number; // Renamed
  isActive: boolean; // Renamed
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BillItem {
  billItemId: string; // Client-side unique ID for item in current bill instance
  menuItemId: string;
  code: string;
  name: string;
  price: number; // Price charged per unit (could be deal or regular price)
  quantity: number;
  totalPrice: number; // price * quantity
  category?: string;
  dealContext?: {
    dealId: string;
    dealName: string;
    originalPricePerItem?: number;
  };
}

// Represents a Bill/Sale structure, maps to 'sales' table in Supabase
export interface Bill {
  id: string; // Supabase UUID for the sale
  tableNumber?: string; // camelCase for app
  customerName?: string; // camelCase for app
  waiterName?: string; // camelCase for app
  items: BillItem[]; // This will be stored as JSONB in Supabase
  subtotal: number;
  tax?: number;
  discount?: number;
  totalAmount: number; // camelCase for app
  createdAt: string; // camelCase for app: ISO date string for the actual time of sale
  business_day: string; // snake_case as it directly maps to DB for filtering often
  cashierId: string; // camelCase for app: Supabase auth user ID
  created_db_entry_at?: string | null; // snake_case from DB
}

export interface SaleEntry extends Bill {} // Alias for clarity

// Represents a Deleted Item Log, maps to 'deleted_item_logs' table
export interface DeletedItemLogEntry {
  id: string; // Supabase UUID
  menuItemId: string | null; // camelCase for app
  itemName: string; // camelCase for app
  itemCode: string; // camelCase for app
  quantityRemoved: number; // camelCase for app
  pricePerItem: number; // camelCase for app
  removedByCashierId: string; // camelCase for app: Supabase auth user ID
  billId?: string | null; // camelCase for app
  timestamp: string; // ISO date string of when deletion occurred
  reason?: string;
  isDealItem?: boolean; // camelCase for app
  dealName?: string; // camelCase for app
}

export interface AppSettingDB {
  setting_key: string;
  value: string;
  updated_at: string | null;
}
