
"use client";

import { useState, useRef } from 'react';
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/common/page-title";
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
import { Wrench, Eraser, DatabaseZap, AlertTriangle, CalendarDays, Archive, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  resetAllApplicationData, 
  clearSalesOlderThanAndSave,
} from "@/lib/data";
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function SystemUtilitiesPage() {
  const { toast } = useToast();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);
  
  const [purgeCutoffDate, setPurgeCutoffDate] = useState<Date | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleResetSystem = async () => {
    setIsProcessing(true);
    try {
      await resetAllApplicationData();
      toast({
        title: "System Data Reset Successful",
        description: "Applicable data in Supabase has been reset. Please reload related pages.",
      });
    } catch (error: any) {
      toast({
        title: "System Reset Failed",
        description: error.message || "An error occurred during system reset.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setIsResetConfirmOpen(false);
    }
  };
  
  const handlePurgeOldSales = async () => {
    if (!purgeCutoffDate) {
      toast({ title: "No Date Selected", description: "Please select a cutoff date.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const cutoffDateString = format(purgeCutoffDate, 'yyyy-MM-dd');
      const result = await clearSalesOlderThanAndSave(cutoffDateString);
      toast({
        title: "Sales Purged",
        description: `${result.count || 0} old sales record(s) before ${format(purgeCutoffDate, 'PPP')} have been purged from Supabase.`,
      });
      setPurgeCutoffDate(undefined);
    } catch (error: any) {
      toast({ title: "Error Purging Sales", description: error.message || "Failed to purge sales.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setIsPurgeConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageTitle icon={Wrench} title="System Utilities" description="Manage system data stored in Supabase. Use with extreme caution." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><DatabaseZap className="mr-2 h-5 w-5" /> Supabase Data Management</CardTitle>
            <CardDescription>Data is primarily managed in Supabase. Backups should be handled through the Supabase dashboard.</CardDescription>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground mb-4">For full point-in-time recovery, please use your Supabase project dashboard.</p></CardContent>
          <CardFooter><Button onClick={() => window.open('https://supabase.com/dashboard', '_blank')} className="w-full" variant="outline">Go to Supabase Dashboard</Button></CardFooter>
        </Card>
        
        <Card className="border-orange-500 dark:border-orange-400">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600 dark:text-orange-400"><Archive className="mr-2 h-5 w-5" /> Purge Old Sales Data</CardTitle>
            <CardDescription>Permanently delete sales records older than a selected date from Supabase.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <p className="text-sm text-muted-foreground">This action is permanent. Ensure you have Supabase backups if needed.</p>
            <div><Label htmlFor="purge-date">Clear Sales Older Than</Label>
                <Popover><PopoverTrigger asChild>
                    <Button id="purge-date" variant="outline" className="w-full justify-start text-left font-normal mt-1" disabled={isProcessing}>
                        <CalendarDays className="mr-2 h-4 w-4" />{purgeCutoffDate ? format(purgeCutoffDate, "PPP") : <span>Pick a cutoff date</span>}
                    </Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={purgeCutoffDate} onSelect={setPurgeCutoffDate} initialFocus disabled={(date) => date > new Date() || date < new Date("2000-01-01") || isProcessing} />
                    </PopoverContent>
                </Popover>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={() => setIsPurgeConfirmOpen(true)} disabled={!purgeCutoffDate || isProcessing} className="w-full">
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-5 w-5" />} Purge Old Sales
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-destructive md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5" /> Reset Application Data in Supabase</CardTitle>
            <CardDescription>Permanently delete ALL transactional data (menu items, deals, sales, logs) from Supabase. This action cannot be undone. User accounts in Supabase Auth will NOT be affected.</CardDescription>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground mb-4">This resets application-specific tables in your Supabase database.</p></CardContent>
          <CardFooter>
            <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)} className="w-full" disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eraser className="mr-2 h-5 w-5" />} Full Application Data Reset (Supabase)
            </Button>
          </CardFooter>
        </Card>
      </div>

      <AlertDialog open={isResetConfirmOpen} onOpenChange={(open) => !isProcessing && setIsResetConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action will permanently delete ALL application data from Supabase, including menu items, deals, sales history, and logs. This cannot be undone. User accounts will remain. Do you want to proceed?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetSystem} className={buttonVariants({variant: "destructive"})} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Yes, Reset Application Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isPurgeConfirmOpen} onOpenChange={(open) => !isProcessing && setIsPurgeConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Purge Old Sales</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to permanently delete all sales records older than{' '}
              <strong>{purgeCutoffDate ? format(purgeCutoffDate, 'PPP') : 'the selected date'}</strong> from Supabase? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurgeCutoffDate(undefined)} disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurgeOldSales} className={buttonVariants({variant: "destructive"})} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Yes, Purge Old Sales
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
