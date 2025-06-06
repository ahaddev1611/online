
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/common/page-title";
import { Undo2, Search, Loader2 } from "lucide-react";
import { deleteSaleAndSave } from "@/lib/data"; 
import { useToast } from '@/hooks/use-toast';

export default function ReturnBillPage() {
  const [billIdToReturn, setBillIdToReturn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleReturnBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billIdToReturn.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Bill ID to return.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      const returnedBill = await deleteSaleAndSave(billIdToReturn.trim());

      if (!returnedBill) { 
        toast({
          title: "Return Failed",
          description: `Could not return bill ID "${billIdToReturn}". It might not exist or you may not have permission.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bill Returned Successfully",
          description: `Bill ID "${returnedBill.id.substring(0,8)}..." (Amount: PKR ${returnedBill.totalAmount.toFixed(2)}) has been returned (deleted from Supabase).`,
        });
        setBillIdToReturn(''); 
      }
    } catch (error: any) {
      toast({
        title: "Error Returning Bill",
        description: error.message || "An unexpected error occurred while returning the bill.",
        variant: "destructive",
      });
      console.error("Error returning bill:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle icon={Undo2} title="Return Bill" description="Process a bill return by entering its ID. This will remove the sale from Supabase records." />

      <Card className="w-full max-w-lg mx-auto">
        <form onSubmit={handleReturnBill}>
          <CardHeader>
            <CardTitle>Process Bill Return</CardTitle>
            <CardDescription>Enter the Bill ID you wish to mark as returned. The corresponding sales entry will be deleted from Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="billId">Bill ID to Return</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="billId"
                  type="text"
                  value={billIdToReturn}
                  onChange={(e) => setBillIdToReturn(e.target.value)}
                  placeholder="Enter exact Bill ID (UUID)"
                  required
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Processing Return...' : 'Return Bill & Delete Sale Record'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
