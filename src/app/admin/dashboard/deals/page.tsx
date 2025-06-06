
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Tags, Search, XCircle, PackagePlus, Loader2, Download, Upload } from "lucide-react";
import { PageTitle } from "@/components/common/page-title";
import type { Deal, DealItem, MenuItem as AppMenuItemDefinition } from "@/lib/definitions";
import { getDeals, addDealAndSave, updateDealAndSave, deleteDealAndSave, getMenuItems, mapSupabaseItemToAppItem } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Papa from 'papaparse';
import type { MenuItem as SupabaseMenuItem } from '@/lib/database.types';

export default function ManageDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [menuItems, setMenuItems] = useState<AppMenuItemDefinition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentDeal, setCurrentDeal] = useState<Partial<Deal> | null>(null);
  
  const [dealId, setDealId] = useState('');
  const [dealNumber, setDealNumber] = useState('');
  const [dealName, setDealName] = useState('');
  const [dealDescription, setDealDescription] = useState('');
  const [dealItems, setDealItems] = useState<DealItem[]>([]);
  const [isDealActive, setIsDealActive] = useState(true);

  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [currentDealItemQuantity, setCurrentDealItemQuantity] = useState('1');
  const [currentDealItemPrice, setCurrentDealItemPrice] = useState('');

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [fetchedDeals, fetchedSupabaseMenuItems] = await Promise.all([
        getDeals(),
        getMenuItems()
      ]);
      setDeals(fetchedDeals);
      setMenuItems(fetchedSupabaseMenuItems.map(mapSupabaseItemToAppItem));
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to fetch data: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredDeals = deals.filter(deal =>
    deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (deal.deal_number && deal.deal_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setDealId('');
    setDealNumber('');
    setDealName('');
    setDealDescription('');
    setDealItems([]);
    setIsDealActive(true);
    setCurrentDeal(null);
    setSelectedMenuItemId('');
    setCurrentDealItemQuantity('1');
    setCurrentDealItemPrice('');
  };

  const handleOpenFormDialog = (deal?: Deal) => {
    resetForm();
    if (deal) {
      setCurrentDeal(deal);
      setDealId(deal.id);
      setDealNumber(deal.deal_number);
      setDealName(deal.name);
      setDealDescription(deal.description || '');
      setDealItems(Array.isArray(deal.items) ? [...deal.items] : []);
      setIsDealActive(deal.is_active);
    } else {
      setCurrentDeal({});
    }
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    if (isFormSubmitting) return;
    setIsFormDialogOpen(false);
    resetForm();
  };

  const handleAddMenuItemToDeal = () => {
    if (!selectedMenuItemId) {
      toast({ title: "Select Item", description: "Please select a menu item to add.", variant: "destructive" });
      return;
    }
    const menuItem = menuItems.find(mi => mi.id === selectedMenuItemId);
    if (!menuItem) return;

    const quantity = parseInt(currentDealItemQuantity);
    const price = parseFloat(currentDealItemPrice);

    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be a positive number.", variant: "destructive" });
      return;
    }
    if (isNaN(price) || price < 0) {
      toast({ title: "Invalid Price", description: "Deal price must be a non-negative number.", variant: "destructive" });
      return;
    }

    const existingDealItemIndex = dealItems.findIndex(di => di.menuItemId === menuItem.id);
    const newDealItem: DealItem = {
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity,
      dealPricePerItem: price,
      originalPricePerItem: menuItem.price,
    };

    if (existingDealItemIndex > -1) {
      const updatedDealItems = [...dealItems];
      updatedDealItems[existingDealItemIndex] = newDealItem;
      setDealItems(updatedDealItems);
    } else {
      setDealItems(prev => [...prev, newDealItem]);
    }
    
    setSelectedMenuItemId('');
    setCurrentDealItemQuantity('1');
    setCurrentDealItemPrice('');
  };

  const handleRemoveMenuItemFromDeal = (menuItemIdToRemove: string) => {
    setDealItems(prev => prev.filter(di => di.menuItemId !== menuItemIdToRemove));
  };

  const calculateTotalDealPrice = useCallback(() => {
    return dealItems.reduce((total, item) => {
      const itemPrice = Number(item.dealPricePerItem) || 0;
      const itemQuantity = Number(item.quantity) || 0;
      return total + (itemPrice * itemQuantity);
    }, 0);
  }, [dealItems]);

  const handleSubmitDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealNumber || !dealName || dealItems.length === 0) {
      toast({ title: "Error", description: "Deal Number, Name, and at least one item are required.", variant: "destructive" });
      return;
    }

    setIsFormSubmitting(true);
    const totalDealPrice = calculateTotalDealPrice();
    
    const dealData = {
      deal_number: dealNumber,
      name: dealName,
      description: dealDescription,
      items: dealItems,
      calculated_total_deal_price: totalDealPrice,
      is_active: isDealActive,
    };

    try {
      if (currentDeal && currentDeal.id) { 
        await updateDealAndSave({ ...dealData, id: currentDeal.id } as Deal);
        toast({ title: "Success", description: `Deal "${dealName}" updated.` });
      } else { 
        await addDealAndSave(dealData as Omit<Deal, 'id' | 'created_at' | 'updated_at'>);
        toast({ title: "Success", description: `Deal "${dealName}" added.` });
      }
      fetchData();
      handleCloseFormDialog();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save deal.", variant: "destructive" });
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleOpenDeleteConfirmationDialog = (deal: Deal) => {
    setDealToDelete(deal);
    setIsConfirmDeleteDialogOpen(true);
  };

  const executeDeleteDeal = async () => {
    if (dealToDelete) {
      setIsFormSubmitting(true);
      try {
        await deleteDealAndSave(dealToDelete.id);
        toast({ title: "Success", description: `Deal "${dealToDelete.name}" deleted.` });
        fetchData();
      } catch (error: any) {
        toast({ title: "Error", description: error.message || `Failed to delete deal "${dealToDelete.name}".`, variant: "destructive" });
      } finally {
        setIsConfirmDeleteDialogOpen(false);
        setDealToDelete(null);
        setIsFormSubmitting(false);
      }
    }
  };
  
  useEffect(() => {
    const menuItem = menuItems.find(mi => mi.id === selectedMenuItemId);
    if (menuItem) {
      setCurrentDealItemPrice(menuItem.price.toString());
    } else {
      setCurrentDealItemPrice('');
    }
  }, [selectedMenuItemId, menuItems]);

  const handleDownloadDealsCSV = () => {
    if (deals.length === 0) {
      toast({ title: "No Data", description: "No deals to download.", variant: "destructive" });
      return;
    }
    const csvData = deals.map(deal => ({
      "Deal Number": deal.deal_number,
      "Name": deal.name,
      "Description": deal.description || '',
      "Items (JSON)": JSON.stringify(deal.items),
      "Total Price": (deal.calculated_total_deal_price || 0).toFixed(2),
      "Is Active": deal.is_active ? "TRUE" : "FALSE"
    }));
    const csvString = Papa.unparse(csvData);
    const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'deals_backup.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded", description: "Deals backup downloaded." });
  };

  const handleDealsFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsFormSubmitting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedDeals = results.data as Array<Record<string, string>>;
        let successCount = 0;
        let errorCount = 0;
        let updatedCount = 0;
        let addedCount = 0;

        const operations = parsedDeals.map(async (row) => {
          const dealNumberStr = row["Deal Number"]?.trim();
          const nameStr = row["Name"]?.trim();
          const descriptionStr = row["Description"]?.trim() || '';
          const itemsJsonStr = row["Items (JSON)"]?.trim();
          const isActiveStr = row["Is Active"]?.trim().toUpperCase();

          if (!dealNumberStr || !nameStr || !itemsJsonStr) {
            console.warn("Skipping deal row due to missing Deal Number, Name, or Items (JSON):", row);
            errorCount++;
            return;
          }

          let parsedItems: DealItem[];
          try {
            parsedItems = JSON.parse(itemsJsonStr);
            if (!Array.isArray(parsedItems) || parsedItems.some(item => typeof item.menuItemId !== 'string' || typeof item.name !== 'string' || typeof item.quantity !== 'number' || typeof item.dealPricePerItem !== 'number' || typeof item.originalPricePerItem !== 'number')) {
              throw new Error("Invalid items JSON structure.");
            }
          } catch (e: any) {
            console.warn(`Skipping deal row due to invalid Items (JSON) format for deal number ${dealNumberStr}: ${e.message}`, row);
            errorCount++;
            return;
          }

          const isActive = isActiveStr === "TRUE" || isActiveStr === "1";
          
          // Calculate total price based on parsed items for accuracy
          const calculatedTotalDealPrice = parsedItems.reduce((total, item) => {
            return total + (Number(item.dealPricePerItem) * Number(item.quantity));
          }, 0);


          const dealData: Omit<Deal, 'id' | 'created_at' | 'updated_at'> = {
            deal_number: dealNumberStr,
            name: nameStr,
            description: descriptionStr,
            items: parsedItems,
            calculated_total_deal_price: calculatedTotalDealPrice,
            is_active: isActive,
          };
          
          try {
            const existingDeal = deals.find(d => d.deal_number === dealNumberStr);
            if (existingDeal) {
              await updateDealAndSave({ ...dealData, id: existingDeal.id } as Deal);
              updatedCount++;
            } else {
              await addDealAndSave(dealData);
              addedCount++;
            }
            successCount++;
          } catch (uploadError: any) {
            console.error(`Failed to process deal with number ${dealNumberStr}:`, uploadError.message);
            toast({ title: `Error for Deal ${dealNumberStr}`, description: uploadError.message, variant: "destructive" });
            errorCount++;
          }
        });

        await Promise.allSettled(operations);

        toast({
          title: "Deals CSV Upload Complete",
          description: `${addedCount} deals added, ${updatedCount} deals updated, ${errorCount} rows failed.`,
        });
        fetchData(); // Refresh list
        setIsFormSubmitting(false);
        if(fileInputRef.current) fileInputRef.current.value = ''; 
      },
      error: (error: any) => {
        toast({ title: "CSV Parse Error", description: error.message, variant: "destructive" });
        setIsFormSubmitting(false);
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };


  if (isLoadingData) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading deals...</span>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Tags} title="Manage Deals" description="Create, edit, or delete promotional deals.">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => handleOpenFormDialog()} disabled={isFormSubmitting || isLoadingData}>
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Deal
          </Button>
           <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleDealsFileUpload}
            className="hidden"
            disabled={isFormSubmitting || isLoadingData}
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isFormSubmitting || isLoadingData}>
            <Upload className="mr-2 h-5 w-5" /> Upload CSV
          </Button>
          <Button onClick={handleDownloadDealsCSV} variant="outline" disabled={isFormSubmitting || isLoadingData || deals.length === 0}>
            <Download className="mr-2 h-5 w-5" /> Download CSV
          </Button>
        </div>
      </PageTitle>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by deal name or number..."
          className="pl-10 w-full md:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoadingData || isFormSubmitting}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total Price (PKR)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeals.length > 0 ? filteredDeals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.deal_number}</TableCell>
                  <TableCell>{deal.name}</TableCell>
                  <TableCell>{deal.items.map(di => `${Number(di.quantity) || 0}x ${di.name || 'Unknown Item'}`).join(', ')}</TableCell>
                  <TableCell className="text-right">{(Number(deal.calculated_total_deal_price) || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${deal.is_active ? 'bg-green-100 text-green-700 dark:bg-green-800/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-800/30 dark:text-red-300'}`}>
                      {deal.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center space-x-2">
                    <Button variant="outline" size="icon" onClick={() => handleOpenFormDialog(deal)} disabled={isFormSubmitting}>
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleOpenDeleteConfirmationDialog(deal)} disabled={isFormSubmitting}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    {deals.length === 0 ? "No deals found. Add new deals to get started." : "No deals match your search."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleCloseFormDialog(); else setIsFormDialogOpen(true);}}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{currentDeal?.id ? 'Edit Deal' : 'Add New Deal'}</DialogTitle>
            <DialogDescription>
              {currentDeal?.id ? 'Update the details of the deal.' : 'Enter the details for the new deal.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitDeal}>
            <ScrollArea className="max-h-[70vh] p-1">
              <div className="grid gap-6 py-4 pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="deal-number">Deal Number <span className="text-destructive">*</span></Label>
                    <Input id="deal-number" value={dealNumber} onChange={(e) => setDealNumber(e.target.value)} required disabled={isFormSubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="deal-name">Deal Name <span className="text-destructive">*</span></Label>
                    <Input id="deal-name" value={dealName} onChange={(e) => setDealName(e.target.value)} required disabled={isFormSubmitting}/>
                  </div>
                </div>
                <div>
                  <Label htmlFor="deal-description">Description</Label>
                  <Textarea id="deal-description" value={dealDescription} onChange={(e) => setDealDescription(e.target.value)} placeholder="Optional details about the deal" disabled={isFormSubmitting} />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="deal-active" checked={isDealActive} onCheckedChange={setIsDealActive} disabled={isFormSubmitting}/>
                  <Label htmlFor="deal-active">Deal is Active</Label>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Add Items to Deal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <Label htmlFor="menu-item-select">Menu Item <span className="text-destructive">*</span></Label>
                         <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId} disabled={isFormSubmitting || menuItems.length === 0}>
                          <SelectTrigger id="menu-item-select">
                            <SelectValue placeholder={menuItems.length === 0 ? "No menu items available" : "Select an item..."} />
                          </SelectTrigger>
                          <SelectContent>
                            {menuItems.map(mi => (
                              <SelectItem key={mi.id} value={mi.id}>{mi.name} ({mi.code}) - PKR {(Number(mi.price) || 0).toFixed(2)}</SelectItem>
                            ))}
                            {menuItems.length === 0 && <p className="p-2 text-sm text-muted-foreground">Load menu items first.</p>}
                          </SelectContent>
                        </Select>
                      </div>
                       <div>
                        <Label htmlFor="deal-item-qty">Quantity <span className="text-destructive">*</span></Label>
                        <Input id="deal-item-qty" type="number" value={currentDealItemQuantity} onChange={e => setCurrentDealItemQuantity(e.target.value)} placeholder="1" min="1" disabled={isFormSubmitting}/>
                      </div>
                       <div>
                        <Label htmlFor="deal-item-price">Deal Price/Item <span className="text-destructive">*</span></Label>
                        <Input id="deal-item-price" type="number" value={currentDealItemPrice} onChange={e => setCurrentDealItemPrice(e.target.value)} placeholder="e.g., 100" min="0" step="0.01" disabled={isFormSubmitting}/>
                      </div>
                    </div>
                     <Button type="button" onClick={handleAddMenuItemToDeal} disabled={!selectedMenuItemId || isFormSubmitting}>
                        <PackagePlus className="mr-2 h-4 w-4" /> Add/Update Item in Deal
                      </Button>
                  </CardContent>
                </Card>

                {dealItems.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Items in this Deal</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {dealItems.map(di => (
                          <li key={di.menuItemId} className="flex justify-between items-center p-2 border rounded-md">
                            <div>
                              <p className="font-medium">{(di.name || 'Unknown Item')} (x{Number(di.quantity) || 0})</p>
                              <p className="text-sm text-muted-foreground">
                                Deal Price: PKR {(Number(di.dealPricePerItem) || 0).toFixed(2)} each (Original: PKR {(Number(di.originalPricePerItem) || 0).toFixed(2)})
                              </p>
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMenuItemFromDeal(di.menuItemId)} disabled={isFormSubmitting}>
                              <XCircle className="h-5 w-5 text-destructive" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-4 text-right font-semibold text-lg">
                        Calculated Total Deal Price: PKR {(calculateTotalDealPrice() || 0).toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isFormSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isFormSubmitting || isLoadingData}>
                {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentDeal?.id ? 'Save Changes' : 'Create Deal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the deal
              "{dealToDelete?.name || 'this deal'}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDealToDelete(null)} disabled={isFormSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteDeal} className={buttonVariants({variant: "destructive"})} disabled={isFormSubmitting || isLoadingData}>
             {isFormSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

