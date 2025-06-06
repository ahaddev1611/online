
"use client";

import { useState, useMemo } from 'react';
import type { MenuItem, Deal } from '@/lib/definitions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Search, Tags, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ItemSearchProps {
  menuItems: MenuItem[];
  deals: Deal[];
  onAddMenuItem: (item: MenuItem) => void;
  onAddDeal: (deal: Deal) => void;
  disabled?: boolean; // To disable while parent is loading data
}

export function ItemSearch({ menuItems, deals, onAddMenuItem, onAddDeal, disabled = false }: ItemSearchProps) {
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [dealSearchTerm, setDealSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState("items");

  const filteredMenuItems = useMemo(() => {
    if (!itemSearchTerm.trim()) {
      return [];
    }
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(itemSearchTerm.toLowerCase())
    ).slice(0, 10);
  }, [menuItems, itemSearchTerm]);

  const filteredDeals = useMemo(() => {
    if (!dealSearchTerm.trim()) {
      return [];
    }
    return deals.filter(deal =>
      deal.is_active && (
        deal.name.toLowerCase().includes(dealSearchTerm.toLowerCase()) ||
        (deal.deal_number && deal.deal_number.toLowerCase().includes(dealSearchTerm.toLowerCase()))
      )
    ).slice(0, 10);
  }, [deals, dealSearchTerm]);

  return (
    <Tabs defaultValue="items" className="w-full" onValueChange={setActiveTab} value={activeTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="items" disabled={disabled}><Search className="mr-2 h-4 w-4" />Search Items</TabsTrigger>
        <TabsTrigger value="deals" disabled={disabled}><Tags className="mr-2 h-4 w-4" />Search Deals</TabsTrigger>
      </TabsList>
      <TabsContent value="items" className="mt-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items by name or code..."
              className="w-full pl-10 text-base"
              value={itemSearchTerm}
              onChange={(e) => setItemSearchTerm(e.target.value)}
              disabled={disabled} // Changed: Rely primarily on parent 'disabled' prop
            />
          </div>
          {disabled && menuItems.length === 0 && ( // This shows loader when parent is loading AND list is empty
            <div className="p-4 text-center text-muted-foreground flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading items...
            </div>
          )}
          {itemSearchTerm.trim() && !disabled && (
            <Card className="shadow-md">
              <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                  {filteredMenuItems.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {filteredMenuItems.map(item => (
                        <li key={item.id} className="p-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium text-foreground">{item.name} ({item.code})</p>
                            <p className="text-sm text-muted-foreground">PKR {item.price.toFixed(2)}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => onAddMenuItem(item)} disabled={disabled}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-4 text-center text-muted-foreground">
                      {menuItems.length === 0 && !itemSearchTerm.trim() ? "No items available." : "No items found matching your search."}
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
           {!itemSearchTerm.trim() && !disabled && menuItems.length === 0 && (
             <p className="p-4 text-center text-sm text-muted-foreground">No items available to search. Ensure items are added in the admin panel.</p>
           )}
        </div>
      </TabsContent>
      <TabsContent value="deals" className="mt-4">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search deals by name or number..."
              className="w-full pl-10 text-base"
              value={dealSearchTerm}
              onChange={(e) => setDealSearchTerm(e.target.value)}
              disabled={disabled} // Changed: Rely primarily on parent 'disabled' prop
            />
          </div>
           {disabled && deals.length === 0 && ( // This shows loader when parent is loading AND list is empty
            <div className="p-4 text-center text-muted-foreground flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading deals...
            </div>
          )}
          {dealSearchTerm.trim() && !disabled && (
            <Card className="shadow-md">
              <CardContent className="p-0">
                <ScrollArea className="h-[200px]">
                  {filteredDeals.length > 0 ? (
                    <ul className="divide-y divide-border">
                      {filteredDeals.map(deal => (
                        <li key={deal.id} className="p-3 flex justify-between items-center hover:bg-muted/50 transition-colors">
                          <div>
                            <p className="font-medium text-foreground">{deal.name} (#{deal.deal_number})</p>
                            <p className="text-sm text-muted-foreground">Total: PKR {(deal.calculated_total_deal_price || 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                                Items: {deal.items.map(di => `${di.quantity}x ${di.name}`).join(', ')}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => onAddDeal(deal)} disabled={disabled}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Deal
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                     <p className="p-4 text-center text-muted-foreground">
                      {deals.length === 0 && !dealSearchTerm.trim() ? "No active deals available." : "No active deals found matching your search."}
                    </p>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          {!dealSearchTerm.trim() && !disabled && deals.length === 0 && (
             <p className="p-4 text-center text-sm text-muted-foreground">No active deals available to search. Ensure deals are added and active in the admin panel.</p>
           )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
