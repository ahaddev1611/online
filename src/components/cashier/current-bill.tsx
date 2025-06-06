
"use client";

import type { BillItem } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MinusCircle, PlusCircle, Trash2, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CurrentBillProps {
  billItems: BillItem[];
  onUpdateQuantity: (billItemId: string, newQuantity: number) => void;
  onRemoveItem: (billItemId: string) => void;
}

export function CurrentBill({ billItems, onUpdateQuantity, onRemoveItem }: CurrentBillProps) {
  const subtotal = billItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalAmount = subtotal;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-semibold">
          <ShoppingCart className="mr-3 h-6 w-6 text-primary" />
          Current Bill
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh_-_450px)] min-h-[200px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Item</TableHead>
                <TableHead className="w-[25%] text-center">Quantity</TableHead>
                <TableHead className="w-[20%] text-right">Price (PKR)</TableHead>
                <TableHead className="w-[15%] text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billItems.length > 0 ? billItems.map(item => (
                <TableRow key={item.billItemId}>
                  <TableCell>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Code: {item.code}</p>
                    {item.dealContext && (
                        <p className="text-xs text-accent_foreground bg-accent/70 px-1 rounded-sm inline-block">
                            Deal: {item.dealContext.dealName}
                        </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.billItemId, item.quantity - 1)}
                        disabled={item.quantity <= (item.dealContext ? item.quantity : 1) && !!item.dealContext} // Prevent reducing quantity of deal item below its deal quantity
                      >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        className="h-7 w-12 text-center px-1"
                        value={item.quantity}
                        onChange={(e) => {
                            const newQty = parseInt(e.target.value);
                            if (!isNaN(newQty) && newQty > 0) onUpdateQuantity(item.billItemId, newQty);
                            else if (e.target.value === '') onUpdateQuantity(item.billItemId, 1);
                        }}
                        min={item.dealContext ? item.quantity : 1} // Deal items quantity is fixed as part of deal bundle.
                        readOnly={!!item.dealContext} // Deal items quantity is fixed for now
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.billItemId, item.quantity + 1)}
                        disabled={!!item.dealContext} // Prevent increasing quantity of deal item bundle.
                      >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{(item.price * item.quantity).toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onRemoveItem(item.billItemId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No items added to the bill yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
      {billItems.length > 0 && (
        <CardFooter className="flex flex-col space-y-2 border-t p-4 mt-2">
            <div className="w-full flex justify-between text-lg font-semibold">
              <span>Subtotal:</span>
              <span>PKR {subtotal.toFixed(2)}</span>
            </div>
            <div className="w-full flex justify-between text-xl font-bold text-primary">
              <span>Total Amount:</span>
              <span>PKR {totalAmount.toFixed(2)}</span>
            </div>
        </CardFooter>
      )}
    </Card>
  );
}
