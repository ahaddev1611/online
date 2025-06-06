
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ItemSearch } from '@/components/cashier/item-search';
import { CurrentBill } from '@/components/cashier/current-bill';
import { InvoiceModal } from '@/components/cashier/invoice-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageTitle } from '@/components/common/page-title';
import { FileText, Receipt, AlertCircle, Loader2 } from 'lucide-react';
import type { MenuItem as AppMenuItemDefinition, BillItem, Bill, DeletedItemLogEntry, Deal, User } from '@/lib/definitions';
import {
    getMenuItems, addSaleAndSave, addDeletedItemLogAndSave, getDeals,
    getCurrentBusinessDay, mapSupabaseItemToAppItem, getCurrentAuthenticatedUser
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format, parseISO, isValid } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import type { MenuItem as SupabaseMenuItem } from '@/lib/database.types';

interface AuthenticatedUser {
  id: string;
  email: string | undefined;
  role: 'admin' | 'cashier' | 'guest';
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cashierIdFromQuery = searchParams.get('cashierId');

  const [availableMenuItems, setAvailableMenuItems] = useState<AppMenuItemDefinition[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [availableDeals, setAvailableDeals] = useState<Deal[]>([]);
  const [currentBillItems, setCurrentBillItems] = useState<BillItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [waiterName, setWaiterName] = useState('');
  const [currentAuthUser, setCurrentAuthUser] = useState<AuthenticatedUser | null>(null);
  const [currentBusinessDay, setCurrentBusinessDay] = useState<string>('');

  const [generatedInvoice, setGeneratedInvoice] = useState<Bill | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState(false);

  const { toast } = useToast();

  const initializePageData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const authUser = await getCurrentAuthenticatedUser();
      if (!authUser || (cashierIdFromQuery && authUser.id !== cashierIdFromQuery)) {
        await supabase.auth.signOut();
        router.push('/login/cashier');
        return;
      }
      setCurrentAuthUser(authUser);

      const [supabaseItems, deals, businessDay] = await Promise.all([
        getMenuItems(),
        getDeals(),
        getCurrentBusinessDay()
      ]);

      setAvailableMenuItems(supabaseItems.map(mapSupabaseItemToAppItem));
      setAvailableDeals(deals.filter(d => d.is_active));

      if (businessDay && isValid(parseISO(businessDay))) {
        setCurrentBusinessDay(businessDay);
      } else {
        const fallbackToday = format(new Date(), 'yyyy-MM-dd');
        setCurrentBusinessDay(fallbackToday);
        console.warn(`Invalid or missing business day (${businessDay}), defaulted to system today: ${fallbackToday}`);
        toast({ title: "Warning", description: "Business day was not properly set, defaulted to today. Please check admin settings if this persists.", variant: "default" });
      }

    } catch (error: any) {
      console.error("Failed to fetch initial data:", error);
      toast({ title: "Error", description: `Could not load page data: ${error.message}`, variant: "destructive" });
      if (error.message.includes("authentication")) router.push('/login/cashier');
    } finally {
      setIsLoadingData(false);
    }
  }, [cashierIdFromQuery, router, toast]);


  useEffect(() => {
    initializePageData();
  }, [initializePageData]);

  const handleAddMenuItemToBill = (itemToAdd: AppMenuItemDefinition) => {
    setCurrentBillItems(prevItems => {
      const existingItem = prevItems.find(item =>
        item.menuItemId === itemToAdd.id &&
        item.price === itemToAdd.price &&
        !item.dealContext
      );

      if (existingItem) {
        return prevItems.map(item =>
          item.billItemId === existingItem.billItemId
            ? { ...item, quantity: item.quantity + 1, totalPrice: item.price * (item.quantity + 1) }
            : item
        );
      }
      const newBillItem: BillItem = {
        billItemId: `billItem_${itemToAdd.id}_${Date.now()}`,
        menuItemId: itemToAdd.id,
        code: itemToAdd.code,
        name: itemToAdd.name,
        price: itemToAdd.price,
        quantity: 1,
        totalPrice: itemToAdd.price,
        category: itemToAdd.category,
      };
      return [...prevItems, newBillItem];
    });
    toast({ title: "Item Added", description: `${itemToAdd.name} added to bill.`});
  };

  const handleAddDealToBill = (dealToAdd: Deal) => {
    const dealBillItems: BillItem[] = [];

    for (const dealItem of dealToAdd.items) {
      const baseMenuItem = availableMenuItems.find(mi => mi.id === dealItem.menuItemId);
      if (!baseMenuItem) {
        toast({ title: "Error", description: `Menu item ${dealItem.name} (ID: ${dealItem.menuItemId}) in deal not found. Skipping.`, variant: "destructive" });
        continue;
      }
      const newBillItem: BillItem = {
        billItemId: `billItem_deal_${dealItem.menuItemId}_${Date.now()}`,
        menuItemId: baseMenuItem.id,
        code: baseMenuItem.code,
        name: baseMenuItem.name,
        price: dealItem.dealPricePerItem,
        quantity: dealItem.quantity,
        totalPrice: dealItem.dealPricePerItem * dealItem.quantity,
        category: baseMenuItem.category || undefined,
        dealContext: {
          dealId: dealToAdd.id,
          dealName: dealToAdd.name,
          originalPricePerItem: dealItem.originalPricePerItem,
        }
      };
      dealBillItems.push(newBillItem);
    }
    if (dealBillItems.length > 0) {
      setCurrentBillItems(prevItems => [...prevItems, ...dealBillItems]);
      toast({ title: "Deal Added", description: `Deal "${dealToAdd.name}" added to bill.`});
    }
  };

  const handleUpdateQuantity = (billItemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      const itemBeingRemoved = currentBillItems.find(item => item.billItemId === billItemId);
      if (itemBeingRemoved && currentAuthUser) {
        logRemovedItem(itemBeingRemoved, itemBeingRemoved.quantity, currentAuthUser.id, true);
      }
      setCurrentBillItems(prevItems => prevItems.filter(item => item.billItemId !== billItemId));
      return;
    }
    setCurrentBillItems(prevItems =>
      prevItems.map(item =>
        item.billItemId === billItemId
          ? { ...item, quantity: newQuantity, totalPrice: item.price * newQuantity }
          : item
      )
    );
  };

  const logRemovedItem = async (itemToRemove: BillItem, quantityRemoved: number, cashierSupabaseId: string, isUpdateLeadingToRemoval = false) => {
      const logEntryData: Omit<DeletedItemLogEntry, 'id' | 'timestamp'> = {
        menuItemId: itemToRemove.menuItemId,
        itemName: itemToRemove.name,
        itemCode: itemToRemove.code,
        quantityRemoved: quantityRemoved,
        pricePerItem: itemToRemove.price,
        removedByCashierId: cashierSupabaseId,
        reason: isUpdateLeadingToRemoval ? 'Quantity reduced to zero' : 'Removed by cashier',
        billId: generatedInvoice?.id,
        isDealItem: !!itemToRemove.dealContext,
        dealName: itemToRemove.dealContext?.dealName,
      };
      try {
        await addDeletedItemLogAndSave(logEntryData);
      } catch (error: any) {
        toast({ title: "Logging Error", description: `Failed to log removed item: ${error.message}`, variant: "destructive"});
      }
  };

  const handleRemoveItemFromBill = (billItemId: string) => {
    const itemToRemove = currentBillItems.find(item => item.billItemId === billItemId);
    if (itemToRemove && currentAuthUser) {
      logRemovedItem(itemToRemove, itemToRemove.quantity, currentAuthUser.id, false);
      setCurrentBillItems(prevItems => prevItems.filter(item => item.billItemId !== billItemId));
      toast({ title: "Item Removed", description: `${itemToRemove.name} removed from bill.`, variant: "destructive" });
    }
  };

  const handleGenerateInvoice = async () => {
    if (!currentAuthUser?.id) {
      toast({ title: "Error", description: "Cashier not authenticated. Please re-login.", variant: "destructive" });
      return;
    }
    if (currentBillItems.length === 0) {
      toast({ title: "Error", description: "Cannot generate an empty invoice.", variant: "destructive" });
      return;
    }
    if (!currentBusinessDay || !isValid(parseISO(currentBusinessDay))) {
      toast({ title: "Error", description: "Business day is not set or invalid. Please try refreshing or contact admin.", variant: "destructive" });
      return;
    }
    setIsProcessingInvoice(true);

    try {
      const subtotal = currentBillItems.reduce((sum, item) => sum + item.totalPrice, 0);

      const now = new Date();
      const businessDatePart = parseISO(currentBusinessDay); // Use parseISO for robust date parsing

      const saleTimestamp = new Date(
        businessDatePart.getFullYear(),
        businessDatePart.getMonth(),
        businessDatePart.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
      );

      const newBillData: Omit<Bill, 'id' | 'created_db_entry_at'> = {
        tableNumber,
        customerName,
        waiterName,
        items: currentBillItems,
        subtotal,
        totalAmount: subtotal,
        createdAt: saleTimestamp.toISOString(),
        business_day: format(businessDatePart, 'yyyy-MM-dd'), // Ensure business_day is correctly formatted
        cashierId: currentAuthUser.id,
      };

      console.log('Client-side newBillData before sending to addSaleAndSave:', JSON.stringify(newBillData, null, 2));

      const savedBill = await addSaleAndSave(newBillData);
      if (savedBill) {
        setGeneratedInvoice(savedBill);
        setIsInvoiceModalOpen(true);
        setCurrentBillItems([]);
        setTableNumber('');
        setCustomerName('');
        setWaiterName('');
        toast({ title: "Invoice Generated", description: `Bill ${savedBill.id.substring(0,8)}... processed and recorded.`});
      } else {
        throw new Error("Failed to save invoice to database (addSaleAndSave returned null).");
      }
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      toast({ title: "Error Generating Invoice", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsProcessingInvoice(false);
    }
  };

  if (isLoadingData || !currentAuthUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" /> Loading Billing Station...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        icon={Receipt}
        title="Billing Station"
        description={`Cashier: ${currentAuthUser?.displayName || currentAuthUser?.email || 'N/A'} | Business Day: ${currentBusinessDay ? format(parseISO(currentBusinessDay), 'PPP') : 'Loading...'}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="tableNumber">Table Number</Label>
                <Input id="tableNumber" value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g., 5A" disabled={isProcessingInvoice} />
              </div>
              <div>
                <Label htmlFor="customerName">Customer Name (Optional)</Label>
                <Input id="customerName" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g., John Doe" disabled={isProcessingInvoice} />
              </div>
              <div>
                <Label htmlFor="waiterName">Waiter Name (Optional)</Label>
                <Input id="waiterName" value={waiterName} onChange={e => setWaiterName(e.target.value)} placeholder="e.g., Ali" disabled={isProcessingInvoice} />
              </div>
            </CardContent>
          </Card>

          <ItemSearch
              menuItems={availableMenuItems}
              deals={availableDeals}
              onAddMenuItem={handleAddMenuItemToBill}
              onAddDeal={handleAddDealToBill}
              disabled={isLoadingData}
          />
        </div>

        <div className="lg:col-span-2">
          <CurrentBill
            billItems={currentBillItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItemFromBill}
          />
           <Button
            className="w-full mt-6 py-3 text-lg"
            onClick={handleGenerateInvoice}
            disabled={currentBillItems.length === 0 || !currentAuthUser?.id || isProcessingInvoice || isLoadingData}
          >
            {isProcessingInvoice && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            <FileText className="mr-2 h-5 w-5" /> Generate Invoice
          </Button>
        </div>
      </div>

      <InvoiceModal
        bill={generatedInvoice}
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="mr-2 h-8 w-8 animate-spin" />Loading Billing...</div>}>
      <BillingPageContent />
    </Suspense>
  );
}
