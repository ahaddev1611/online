
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { PlusCircle, Edit, Trash2, Package, Search, Loader2, Download, Upload } from "lucide-react";
import { PageTitle } from "@/components/common/page-title";
import type { MenuItem as AppMenuItemDefinition } from "@/lib/definitions"; 
import type { MenuItem as SupabaseMenuItem, NewMenuItem, UpdatedMenuItem } from "@/lib/database.types"; 
import { getMenuItems, addMenuItemAndSave, updateMenuItemAndSave, deleteMenuItemAndSave, mapSupabaseItemToAppItem } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import Papa from 'papaparse';

export default function ManageItemsPage() {
  const [items, setItems] = useState<AppMenuItemDefinition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true); 
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<AppMenuItemDefinition> | null>(null); 
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCategory, setItemCategory] = useState('');

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AppMenuItemDefinition | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedSupabaseItems = await getMenuItems(); 
      setItems(fetchedSupabaseItems.map(mapSupabaseItemToAppItem)); 
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch menu items.", variant: "destructive" });
      console.error("Failed to fetch menu items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setItemName('');
    setItemCode('');
    setItemPrice('');
    setItemCategory('');
    setCurrentItem(null);
  }

  const handleOpenFormDialog = (item?: AppMenuItemDefinition) => {
    resetForm();
    if (item) {
      setCurrentItem(item);
      setItemName(item.name);
      setItemCode(item.code);
      setItemPrice(item.price.toString());
      setItemCategory(item.category || '');
    } else {
      setCurrentItem({}); 
    }
    setIsFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    if (isSubmitting) return;
    setIsFormDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName || !itemCode || !itemPrice) {
      toast({ title: "Error", description: "Name, Code, and Price are required.", variant: "destructive" });
      return;
    }
    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      toast({ title: "Error", description: "Invalid price.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentItem && currentItem.id) { 
        const updatedItemData: UpdatedMenuItem = { 
          id: currentItem.id, 
          name: itemName, 
          code: itemCode, 
          price, 
          category: itemCategory || null 
        };
        const result = await updateMenuItemAndSave(updatedItemData);
        if (result) {
          toast({ title: "Success", description: `Item "${itemName}" updated.` });
        }
      } else { 
        const newItemData: Omit<NewMenuItem, 'id' | 'created_at'> = {
          name: itemName,
          code: itemCode,
          price,
          category: itemCategory || null,
        };
        const result = await addMenuItemAndSave(newItemData);
        if (result) {
          toast({ title: "Success", description: `Item "${itemName}" added.` });
        }
      }
      await fetchItems(); 
      handleCloseFormDialog();
    } catch (error: any) {
        const errorMessage = error.message || `Failed to save item "${itemName}".`;
        toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDeleteConfirmationDialog = (item: AppMenuItemDefinition) => {
    setItemToDelete(item);
    setIsConfirmDeleteDialogOpen(true);
  };

  const executeDeleteItem = async () => {
    if (itemToDelete && itemToDelete.id) {
      setIsSubmitting(true);
      try {
        await deleteMenuItemAndSave(itemToDelete.id);
        toast({ title: "Success", description: `Item "${itemToDelete.name}" deleted.` });
        await fetchItems();
      } catch (error: any) {
        toast({ title: "Error", description: error.message || `Failed to delete item "${itemToDelete.name}".`, variant: "destructive" });
      } finally {
        setIsConfirmDeleteDialogOpen(false);
        setItemToDelete(null);
        setIsSubmitting(false);
      }
    }
  };

  const handleDownloadCSV = () => {
    if (items.length === 0) {
      toast({ title: "No Data", description: "No items to download.", variant: "destructive" });
      return;
    }
    const csvData = items.map(item => ({
      Code: item.code,
      Name: item.name,
      Price: item.price.toFixed(2),
      Category: item.category || ''
    }));
    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'menu_items_backup.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded", description: "Menu items backup downloaded." });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedItems = results.data as Array<Record<string, string>>;
        let successCount = 0;
        let errorCount = 0;
        let updatedCount = 0;
        let addedCount = 0;

        const operations = parsedItems.map(async (row) => {
          const code = row.Code?.trim();
          const name = row.Name?.trim();
          const priceStr = row.Price?.trim();
          const category = row.Category?.trim() || null;

          if (!code || !name || !priceStr) {
            console.warn("Skipping row due to missing required fields:", row);
            errorCount++;
            return;
          }

          const price = parseFloat(priceStr);
          if (isNaN(price) || price < 0) {
            console.warn("Skipping row due to invalid price:", row);
            errorCount++;
            return;
          }

          try {
            const existingItem = items.find(item => item.code === code);
            if (existingItem) {
              await updateMenuItemAndSave({ id: existingItem.id, code, name, price, category });
              updatedCount++;
            } else {
              await addMenuItemAndSave({ code, name, price, category });
              addedCount++;
            }
            successCount++;
          } catch (uploadError: any) {
            console.error(`Failed to process item with code ${code}:`, uploadError.message);
            errorCount++;
          }
        });

        await Promise.allSettled(operations);

        toast({
          title: "CSV Upload Complete",
          description: `${addedCount} items added, ${updatedCount} items updated, ${errorCount} rows failed.`,
        });
        await fetchItems(); // Refresh list
        setIsSubmitting(false);
        if(fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
      },
      error: (error: any) => {
        toast({ title: "CSV Parse Error", description: error.message, variant: "destructive" });
        setIsSubmitting(false);
        if(fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
      }
    });
  };


  return (
    <div className="space-y-6">
      <PageTitle icon={Package} title="Manage Menu Items" description="Add, edit, or delete menu items.">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => handleOpenFormDialog()} disabled={isLoading || isSubmitting}>
            <PlusCircle className="mr-2 h-5 w-5" /> Add New Item
          </Button>
           <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            disabled={isSubmitting}
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={isLoading || isSubmitting}>
            <Upload className="mr-2 h-5 w-5" /> Upload CSV
          </Button>
          <Button onClick={handleDownloadCSV} variant="outline" disabled={isLoading || isSubmitting || items.length === 0}>
            <Download className="mr-2 h-5 w-5" /> Download CSV
          </Button>
        </div>
      </PageTitle>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by item name or code..."
          className="pl-10 w-full md:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                <span className="text-muted-foreground">Loading menu items...</span>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price (PKR)</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length > 0 ? filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category || 'N/A'}</TableCell>
                    <TableCell className="text-right">{item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-center space-x-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenFormDialog(item)} disabled={isSubmitting}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleOpenDeleteConfirmationDialog(item)} disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                      {items.length === 0 ? "No items found. Add new items to get started or upload a CSV." : "No items match your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsFormDialogOpen(open); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{currentItem?.id ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {currentItem?.id ? 'Update the details of the menu item.' : 'Enter the details for the new menu item.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item-code" className="text-right">Code</Label>
                <Input id="item-code" value={itemCode} onChange={(e) => setItemCode(e.target.value)} className="col-span-3" required disabled={isSubmitting}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item-name" className="text-right">Name</Label>
                <Input id="item-name" value={itemName} onChange={(e) => setItemName(e.target.value)} className="col-span-3" required disabled={isSubmitting}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item-category" className="text-right">Category</Label>
                <Input id="item-category" value={itemCategory} onChange={(e) => setItemCategory(e.target.value)} className="col-span-3" placeholder="e.g., Main Course" disabled={isSubmitting}/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="item-price" className="text-right">Price (PKR)</Label>
                <Input id="item-price" type="number" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} className="col-span-3" required min="0" step="0.01" disabled={isSubmitting}/>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseFormDialog} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentItem?.id ? 'Save Changes' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={(open) => { if (!isSubmitting) setIsConfirmDeleteDialogOpen(open); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item
              "{itemToDelete?.name || 'this item'}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)} disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteItem} className={buttonVariants({variant: "destructive"})} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
