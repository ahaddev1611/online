
import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import type { MenuItem as SupabaseMenuItem, NewMenuItem, UpdatedMenuItem, Deal as SupabaseDeal, NewDeal, UpdatedDeal, Sale as SupabaseSale, NewSale, DeletedItemLog as SupabaseDeletedItemLog, NewDeletedItemLog, AppSetting as SupabaseAppSetting, UserProfile as SupabaseUserProfile, NewUserProfile, Json, AppSetting_Insert_Upsert, Deal_Insert_Upsert, MenuItem_Insert_Upsert } from './database.types';
import type { User, SaleEntry, DeletedItemLogEntry, Deal, BillItem, UserRole, MenuItem as AppMenuItemDefinition, DealItem, AppSettingDB } from './definitions';
import { format, add, parseISO, isValid, startOfDay, subDays } from 'date-fns';
import { ADMIN_EMAIL } from './config';


// --- Helper: Get current authenticated Supabase user ---
async function getCurrentSupabaseUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}
async function getCurrentSupabaseUserEmail(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.email || null;
}

export async function isAdminUser(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error('Error calling is_admin function:', error);
    return false;
  }
  return data === true;
}


// --- Menu Item Utilities ---
export function mapSupabaseItemToAppItem(supabaseItem: SupabaseMenuItem): AppMenuItemDefinition {
  return {
    id: supabaseItem.id,
    code: supabaseItem.code,
    name: supabaseItem.name,
    price: supabaseItem.price,
    category: supabaseItem.category || undefined,
  };
}

// --- Menu Item Management (Supabase) ---
export async function getMenuItems(): Promise<SupabaseMenuItem[]> {
  const { data, error } = await supabase.from('menu_items').select('*').order('name', { ascending: true });
  if (error) {
    const errorMessage = `Failed to fetch menu items from Supabase. RLS or table existence issue? Supabase error: ${error.message || JSON.stringify(error)}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  return data || [];
}

export async function addMenuItemAndSave(item: Omit<NewMenuItem, 'id' | 'created_at'>): Promise<SupabaseMenuItem | null> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  const newItemWithDefaults: NewMenuItem = {
    ...item,
  };
  const { data, error } = await supabase.from('menu_items').insert(newItemWithDefaults).select().single();
  if (error) {
    console.error('Error adding menu item to Supabase:', error);
    if (error.code === '23505') { 
        throw new Error('Menu item with this code already exists.');
    }
    throw new Error(error.message || 'Failed to add menu item.');
  }
  return data;
}

export async function updateMenuItemAndSave(updatedItem: UpdatedMenuItem): Promise<SupabaseMenuItem | null> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  if (!updatedItem.id) {
    console.error('Update failed: Item ID is missing.');
    throw new Error('Item ID is required for update.');
  }
  
  const { created_at, ...itemToUpdate } = updatedItem as any;


  const { data, error } = await supabase
    .from('menu_items')
    .update(itemToUpdate)
    .eq('id', updatedItem.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating menu item in Supabase:', error);
     if (error.code === '23505') { 
        throw new Error('Menu item with this code already exists.');
    }
    throw new Error(error.message || 'Failed to update menu item.');
  }
  return data;
}

export async function deleteMenuItemAndSave(itemId: string): Promise<SupabaseMenuItem | null> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  const { data, error } = await supabase.from('menu_items').delete().eq('id', itemId).select().single();
  if (error) {
    console.error('Error deleting menu item from Supabase:', error);
    throw new Error(error.message || 'Failed to delete menu item.');
  }
  return data;
}

// --- Deal Management (Supabase) ---
export async function getDeals(): Promise<Deal[]> {
  const { data, error } = await supabase.from('deals').select('*').order('name', { ascending: true });
  if (error) {
    const errorMessage = `Failed to fetch deals from Supabase. RLS or table existence issue? Supabase error: ${error.message || JSON.stringify(error)}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  return (data?.map(deal => {
    const dbDeal = deal as SupabaseDeal;
    return {
      id: dbDeal.id,
      dealNumber: dbDeal.deal_number,
      name: dbDeal.name,
      description: dbDeal.description || undefined,
      items: dbDeal.items as unknown as DealItem[], 
      calculatedTotalDealPrice: dbDeal.calculated_total_deal_price,
      isActive: dbDeal.is_active,
      created_at: dbDeal.created_at,
      updated_at: dbDeal.updated_at,
  } as Deal;
  }) ) || [];
}


export async function addDealAndSave(deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal | null> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  const newSupabaseDeal: NewDeal = {
    deal_number: deal.dealNumber,
    name: deal.name,
    description: deal.description,
    items: deal.items as unknown as Json, 
    calculated_total_deal_price: deal.calculatedTotalDealPrice,
    is_active: deal.isActive,
  };
  const { data, error } = await supabase.from('deals').insert(newSupabaseDeal).select().single();
  if (error) {
    console.error('Error adding deal to Supabase:', error);
     if (error.code === '23505' && error.message.includes('deal_number')) { 
        throw new Error('Deal with this number already exists.');
    }
    throw new Error(error.message || 'Failed to add deal.');
  }
  const dbDeal = data as SupabaseDeal;
  return dbDeal ? {
    id: dbDeal.id,
    dealNumber: dbDeal.deal_number,
    name: dbDeal.name,
    description: dbDeal.description || undefined,
    items: dbDeal.items as unknown as DealItem[],
    calculatedTotalDealPrice: dbDeal.calculated_total_deal_price,
    isActive: dbDeal.is_active,
    created_at: dbDeal.created_at,
    updated_at: dbDeal.updated_at,
  } : null;
}

export async function updateDealAndSave(updatedDeal: Deal): Promise<Deal | null> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  if (!updatedDeal.id) {
    throw new Error('Deal ID is required for update.');
  }
  
  const supabaseDealData: Omit<UpdatedDeal, 'id'|'created_at'|'updated_at'> = {
    deal_number: updatedDeal.dealNumber,
    name: updatedDeal.name,
    description: updatedDeal.description,
    items: updatedDeal.items as unknown as Json,
    calculated_total_deal_price: updatedDeal.calculatedTotalDealPrice,
    is_active: updatedDeal.isActive,
  };

  const { data, error } = await supabase
    .from('deals')
    .update(supabaseDealData)
    .eq('id', updatedDeal.id)
    .select()
    .single();
  if (error) {
    console.error('Error updating deal in Supabase:', error);
    if (error.code === '23505' && error.message.includes('deal_number')) { 
        throw new Error('Another deal with this number already exists.');
    }
    throw new Error(error.message || 'Failed to update deal.');
  }
  const dbDeal = data as SupabaseDeal;
  return dbDeal ? {
    id: dbDeal.id,
    dealNumber: dbDeal.deal_number,
    name: dbDeal.name,
    description: dbDeal.description || undefined,
    items: dbDeal.items as unknown as DealItem[],
    calculatedTotalDealPrice: dbDeal.calculated_total_deal_price,
    isActive: dbDeal.is_active,
    created_at: dbDeal.created_at,
    updated_at: dbDeal.updated_at,
  } : null;
}


export async function deleteDealAndSave(dealId: string): Promise<Deal | null> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  const { data, error } = await supabase.from('deals').delete().eq('id', dealId).select().single();
  if (error) {
    console.error('Error deleting deal from Supabase:', error);
    throw new Error(error.message || 'Failed to delete deal.');
  }
  const dbDeal = data as SupabaseDeal;
  return dbDeal ? {
    id: dbDeal.id,
    dealNumber: dbDeal.deal_number,
    name: dbDeal.name,
    description: dbDeal.description || undefined,
    items: dbDeal.items as unknown as DealItem[],
    calculatedTotalDealPrice: dbDeal.calculated_total_deal_price,
    isActive: dbDeal.is_active,
    created_at: dbDeal.created_at,
    updated_at: dbDeal.updated_at,
  } : null;
}

// --- Sales Management (Supabase) ---
export async function getSales(filters?: { startDate?: string, endDate?: string, cashierId?: string }): Promise<SaleEntry[]> {
  let query = supabase.from('sales').select('*');

  if (filters?.startDate) {
    query = query.gte('business_day', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('business_day', filters.endDate);
  }
  if (filters?.cashierId) {
    query = query.eq('cashier_id', filters.cashierId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    const errorMessage = `Failed to fetch sales from Supabase. This could be due to a network issue or a Row Level Security policy preventing access. Please check your RLS policies for the 'sales' table. Supabase error: ${error.message || JSON.stringify(error)}`;
    console.error(errorMessage);
    throw new Error(errorMessage); 
  }
  
  return (data?.map(sale => {
    const dbSale = sale as SupabaseSale; // Explicit cast
    return {
        id: dbSale.id,
        tableNumber: dbSale.table_number || undefined,
        customerName: dbSale.customer_name || undefined,
        waiterName: dbSale.waiter_name || undefined,
        items: dbSale.items as unknown as BillItem[], 
        subtotal: dbSale.subtotal,
        tax: dbSale.tax || undefined,
        discount: dbSale.discount || undefined,
        totalAmount: dbSale.total_amount,
        createdAt: dbSale.created_at, 
        business_day: dbSale.business_day,
        cashierId: dbSale.cashier_id, 
        created_db_entry_at: dbSale.created_db_entry_at
    } as SaleEntry;
  })) || [];
}

export async function addSaleAndSave(sale: Omit<SaleEntry, 'id' | 'created_db_entry_at'>): Promise<SaleEntry | null> {
  const currentAuthUserId = await getCurrentSupabaseUserId();
  if (!currentAuthUserId || currentAuthUserId !== sale.cashierId) {
     throw new Error("Operation not allowed: Cashier ID mismatch or not authenticated.");
  }

  const newSupabaseSalePayload: NewSale = {
    id: uuidv4(), 
    table_number: sale.tableNumber || null,
    customer_name: sale.customerName || null,
    waiter_name: sale.waiterName || null,
    items: sale.items as unknown as Json, 
    subtotal: sale.subtotal,
    tax: sale.tax || null,
    discount: sale.discount || null,
    total_amount: sale.totalAmount,
    created_at: sale.createdAt, 
    business_day: sale.business_day,
    cashier_id: sale.cashierId,
  };

  console.log("Attempting to insert sale into Supabase with data:", JSON.stringify(newSupabaseSalePayload, null, 2));

  const { data, error } = await supabase
    .from('sales')
    .insert(newSupabaseSalePayload) 
    .select()
    .single();

  if (error) {
    let detailedMessage = `Failed to save sale. Supabase error code: ${error.code || 'N/A'}. `;
    if (error.message && Object.keys(error).length > 0 && error.message !== '{}') { 
        detailedMessage += `Message: ${error.message}.`;
    } else {
        detailedMessage += `Details: ${JSON.stringify(error)}. An empty error object often indicates an RLS 'WITH CHECK' violation (e.g., cashier_id in the sale does not match the authenticated user's ID for the RLS policy on the 'sales' table) or a 'NOT NULL' constraint violation where the database failed to provide a specific message. Please verify RLS policies on 'sales' and ensure all required fields (items, subtotal, total_amount, created_at, business_day, cashier_id) are correctly populated. The payload sent was: ${JSON.stringify(newSupabaseSalePayload, null, 2)}`;
    }
    console.error('Error adding sale to Supabase (full error object):', error);
    throw new Error(detailedMessage);
  }

  const dbSale = data as SupabaseSale;
  return dbSale ? {
    id: dbSale.id,
    tableNumber: dbSale.table_number || undefined,
    customerName: dbSale.customer_name || undefined,
    waiterName: dbSale.waiter_name || undefined,
    items: dbSale.items as unknown as BillItem[],
    subtotal: dbSale.subtotal,
    tax: dbSale.tax || undefined,
    discount: dbSale.discount || undefined,
    totalAmount: dbSale.total_amount,
    createdAt: dbSale.created_at,
    business_day: dbSale.business_day,
    cashierId: dbSale.cashier_id,
    created_db_entry_at: dbSale.created_db_entry_at
  } as SaleEntry : null;
}


export async function deleteSaleAndSave(saleId: string): Promise<SaleEntry | null> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin for returning bills.");
  }
  const { data, error } = await supabase.from('sales').delete().eq('id', saleId).select().single();
  if (error) {
    console.error('Error deleting sale from Supabase:', error);
    throw new Error(error.message || 'Failed to delete sale.');
  }
  const dbSale = data as SupabaseSale;
  return dbSale ? { 
    id: dbSale.id,
    tableNumber: dbSale.table_number || undefined,
    customerName: dbSale.customer_name || undefined,
    waiterName: dbSale.waiter_name || undefined,
    items: dbSale.items as unknown as BillItem[],
    subtotal: dbSale.subtotal,
    tax: dbSale.tax || undefined,
    discount: dbSale.discount || undefined,
    totalAmount: dbSale.total_amount,
    createdAt: dbSale.created_at,
    business_day: dbSale.business_day,
    cashierId: dbSale.cashier_id,
    created_db_entry_at: dbSale.created_db_entry_at
  } as SaleEntry : null;
}

export async function clearAllSalesAndSave(): Promise<{ count: number | null }> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  const { error, count } = await supabase.from('sales').delete().neq('id', uuidv4()); 
  if (error) {
    console.error('Error clearing all sales from Supabase:', error);
    throw new Error(error.message || 'Failed to clear sales.');
  }
  return { count };
}

export async function clearSalesOlderThanAndSave(cutoffDateString: string): Promise<{ count: number | null }> {
 if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  if (!isValid(parseISO(cutoffDateString))) {
    console.error("Invalid cutoff date provided for purging sales.");
    throw new Error("Invalid cutoff date.");
  }
  const { error, count } = await supabase.from('sales').delete().lt('business_day', cutoffDateString);
  if (error) {
    console.error('Error clearing old sales from Supabase:', error);
    throw new Error(error.message || 'Failed to clear old sales.');
  }
  return { count };
}

// --- Deleted Item Log Management (Supabase) ---
export async function getDeletedItemLogs(filters?: { startDate?: string, endDate?: string }): Promise<DeletedItemLogEntry[]> {
   let query = supabase.from('deleted_item_logs').select('*').order('timestamp', { ascending: false });
    if (filters?.startDate) {
        query = query.gte('timestamp', startOfDay(parseISO(filters.startDate)).toISOString());
    }
    if (filters?.endDate) {
        const endDateEndOfDay = new Date(parseISO(filters.endDate));
        endDateEndOfDay.setHours(23, 59, 59, 999); 
        query = query.lte('timestamp', endDateEndOfDay.toISOString());
    }
  const { data, error } = await query;

  if (error) {
    const errorMessage = `Failed to fetch deleted item logs from Supabase. RLS or table existence issue? Supabase error: ${error.message || JSON.stringify(error)}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  return (data?.map(log => {
    const supabaseLog = log as SupabaseDeletedItemLog; 
    return {
      id: supabaseLog.id,
      menuItemId: supabaseLog.menu_item_id || null,
      itemName: supabaseLog.item_name,
      itemCode: supabaseLog.item_code,
      quantityRemoved: supabaseLog.quantity_removed,
      pricePerItem: supabaseLog.price_per_item,
      removedByCashierId: supabaseLog.removed_by_cashier_id,
      billId: supabaseLog.bill_id || null,
      timestamp: supabaseLog.timestamp,
      reason: supabaseLog.reason || undefined,
      isDealItem: supabaseLog.is_deal_item || false,
      dealName: supabaseLog.deal_name || undefined,
    } as DeletedItemLogEntry;
  })) || [];
}

export async function addDeletedItemLogAndSave(log: Omit<DeletedItemLogEntry, 'id' | 'timestamp'>): Promise<DeletedItemLogEntry | null> {
  const currentAuthUserId = await getCurrentSupabaseUserId();
   if (!currentAuthUserId || currentAuthUserId !== log.removedByCashierId) {
     throw new Error("Operation not allowed: Cashier ID mismatch for logging or not authenticated.");
  }
  const newSupabaseLog: NewDeletedItemLog = {
    menu_item_id: log.menuItemId || undefined, 
    item_name: log.itemName,
    item_code: log.itemCode,
    quantity_removed: log.quantityRemoved,
    price_per_item: log.pricePerItem,
    removed_by_cashier_id: log.removedByCashierId,
    bill_id: log.billId || undefined,
    reason: log.reason,
    is_deal_item: log.isDealItem,
    deal_name: log.dealName,
  };
  const { data, error } = await supabase.from('deleted_item_logs').insert(newSupabaseLog).select().single();
  if (error) {
    console.error('Error adding deleted item log to Supabase:', error);
    throw new Error(error.message || 'Failed to save deleted item log.');
  }
  const dbLog = data as SupabaseDeletedItemLog;
  return dbLog ? {
    id: dbLog.id,
    menuItemId: dbLog.menu_item_id || null,
    itemName: dbLog.item_name,
    itemCode: dbLog.item_code,
    quantityRemoved: dbLog.quantity_removed,
    pricePerItem: dbLog.price_per_item,
    removedByCashierId: dbLog.removed_by_cashier_id,
    billId: dbLog.bill_id || null,
    timestamp: dbLog.timestamp,
    reason: dbLog.reason || undefined,
    isDealItem: dbLog.is_deal_item || false,
    dealName: dbLog.deal_name || undefined,
  } : null;
}

// --- App Settings (Supabase) ---
export async function getAppSettings(): Promise<AppSettingDB[]> {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) {
        console.error('Failed to fetch app settings:', error);
        throw new Error(`Failed to fetch app settings: ${error.message}`);
    }
    return data || [];
}

// --- Business Day Management (Supabase) ---
const BUSINESS_DAY_SETTING_KEY = 'current_business_day';

export async function getCurrentBusinessDay(): Promise<string> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('setting_key', BUSINESS_DAY_SETTING_KEY)
    .single();

  if (error || !data || !data.value) {
    const today = format(new Date(), 'yyyy-MM-dd');
    console.warn(`Failed to fetch business day from Supabase or not set (error: ${error?.message}), attempting to initialize to today: ${today}`);
    const { error: upsertError } = await supabase.from('app_settings').upsert(
        { setting_key: BUSINESS_DAY_SETTING_KEY, value: today, updated_at: new Date().toISOString() } as AppSetting_Insert_Upsert,
        { onConflict: 'setting_key' }
    );
    if (upsertError) {
        console.error('Failed to initialize business day in Supabase:', upsertError);
        throw new Error(`Failed to initialize business day setting: ${upsertError.message}`);
    }
    return today;
  }
  if (!isValid(parseISO(data.value as string))) {
    const today = format(new Date(), 'yyyy-MM-dd');
    console.warn(`Invalid business day format '${data.value}' in Supabase, defaulting to today and attempting to update.`);
    const { error: updateError } = await supabase.from('app_settings').update({ value: today, updated_at: new Date().toISOString() }).eq('setting_key', BUSINESS_DAY_SETTING_KEY);
    if (updateError) {
        console.error('Failed to update invalid business day in Supabase:', updateError);
    }
    return today;
  }
  return data.value as string;
}

export async function advanceToNextBusinessDay(): Promise<string> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  const currentDay = await getCurrentBusinessDay();
  if (!currentDay || !isValid(parseISO(currentDay))) {
    console.error("Cannot advance business day: current business day is invalid or not found.");
    throw new Error("Current business day is invalid. Cannot advance.");
  }
  const parsedCurrentDay = parseISO(currentDay);
  const nextDayDate = add(parsedCurrentDay, { days: 1 });
  const newBusinessDay = format(nextDayDate, 'yyyy-MM-dd');

  const { error } = await supabase
    .from('app_settings')
    .update({ value: newBusinessDay, updated_at: new Date().toISOString() })
    .eq('setting_key', BUSINESS_DAY_SETTING_KEY);

  if (error) {
    console.error('Failed to advance business day in Supabase:', error);
    throw new Error(`Failed to advance business day: ${error.message}`);
  }
  return newBusinessDay;
}


// --- Data Management Utilities (Reset & CSV Restore) ---
export async function resetAllApplicationData(): Promise<void> {
  if (!await isAdminUser()) {
    throw new Error("Operation not allowed: User is not an admin.");
  }
  console.warn("Attempting to reset all application data in Supabase. This is highly destructive.");

  const tablesToClear = ['deleted_item_logs', 'sales', 'deals', 'menu_items'];

  for (const table of tablesToClear) {
    const { error } = await supabase.from(table).delete().neq('id', uuidv4()); 
    if (error) {
      console.error(`Error clearing table ${table}:`, error);
      throw new Error(`Failed to clear table ${table}. Error: ${error.message}`);
    }
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const { error: settingError } = await supabase
    .from('app_settings')
    .update({ value: today, updated_at: new Date().toISOString() })
    .eq('setting_key', BUSINESS_DAY_SETTING_KEY);
  if (settingError) {
     const { error: upsertError } = await supabase.from('app_settings').upsert(
        { setting_key: BUSINESS_DAY_SETTING_KEY, value: today, updated_at: new Date().toISOString() } as AppSetting_Insert_Upsert,
        { onConflict: 'setting_key' }
    );
    if (upsertError) {
        console.error('Failed to reset/initialize business day in Supabase:', upsertError);
        throw new Error(`Failed to reset business day. Error: ${upsertError.message}`);
    }
  }
  console.log("Supabase tables (menu_items, deals, sales, deleted_item_logs) cleared and business day reset.");
}

// --- User Profile Management ---
export async function getCashierDisplayName(cashierId: string): Promise<string> {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('display_name, id') 
        .eq('id', cashierId)
        .single();

    if (error && error.code !== 'PGRST116') { 
        console.warn(`Error fetching profile for cashier ${cashierId}: ${error.message}`);
    }
    if (data?.display_name) return data.display_name;
    
    return cashierId.substring(0,8) + "...";
}

export async function getSupabaseUsersByRole(role: UserRole): Promise<SupabaseUserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('role', role);

  if (error) {
    console.error(`Error fetching users with role ${role}: ${error.message}`);
    return [];
  }
  return data || [];
}

export async function getCurrentAuthenticatedUser(): Promise<{id: string, email: string | undefined, role: UserRole | 'guest', displayName?: string | null } | null> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        console.error("Error getting session:", sessionError.message);
        return null;
    }
    if (session?.user) {
        const userId = session.user.id;
        const userEmail = session.user.email;

        const { data: userProfile, error: profileError } = await supabase
            .from('user_profiles')
            .select('role, display_name')
            .eq('id', userId)
            .single();

        let determinedRole: UserRole | 'guest' = 'guest';
        if (profileError && profileError.code !== 'PGRST116') { 
            console.warn(`Could not fetch profile for user ${userId}: ${profileError.message}. Defaulting role based on ADMIN_EMAIL constant.`);
            determinedRole = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'cashier';
        } else if (userProfile?.role) {
            determinedRole = userProfile.role as UserRole;
        } else {
            console.warn(`User profile or role not found for ${userId}. Defaulting role based on ADMIN_EMAIL. Ensure a profile entry exists for this user.`);
            determinedRole = userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'cashier';
        }

        return {
            id: userId,
            email: userEmail,
            role: determinedRole,
            displayName: userProfile?.display_name || userEmail 
        };
    }
    return null;
}
