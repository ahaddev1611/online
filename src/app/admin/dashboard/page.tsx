
"use client";
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, AlertTriangle, CalendarClock, PlayCircle, Loader2 } from "lucide-react";
import { PageTitle } from "@/components/common/page-title";
import { getMenuItems, getSales, getDeletedItemLogs, getCurrentBusinessDay, advanceToNextBusinessDay } from "@/lib/data";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Legend } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO, isValid, subDays } from 'date-fns';
import type { SaleEntry } from '@/lib/definitions';

export default function AdminDashboardPage() {
  const [totalSalesAmount, setTotalSalesAmount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [totalMenuItems, setTotalMenuItems] = useState(0);
  const [totalDeletedLogEntries, setTotalDeletedLogEntries] = useState(0);
  const [recentSalesChartData, setRecentSalesChartData] = useState<any[]>([]);
  const [currentBusinessDayDisplay, setCurrentBusinessDayDisplay] = useState('');
  const [isConfirmDayEndOpen, setIsConfirmDayEndOpen] = useState(false);
  const [isAdvancingDay, setIsAdvancingDay] = useState(false);
  const [isLoadingDashboardData, setIsLoadingDashboardData] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoadingDashboardData(true);
    try {
      const today = new Date();
      const sevenDaysAgo = subDays(today, 6); 

      const [
        currentSales, 
        currentMenuItems, 
        currentDeletedLogs, 
        businessDayStr
      ] = await Promise.all([
        getSales({ startDate: format(sevenDaysAgo, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') }),
        getMenuItems(),
        getDeletedItemLogs({ startDate: format(sevenDaysAgo, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') }),
        getCurrentBusinessDay()
      ]);

      if (businessDayStr && isValid(parseISO(businessDayStr))) {
          setCurrentBusinessDayDisplay(format(parseISO(businessDayStr), "PPP"));
      } else {
          const fallbackDate = format(new Date(), "PPP");
          setCurrentBusinessDayDisplay(fallbackDate);
          console.warn("Fetched businessDay is invalid, using system current date as fallback for display.");
      }
      
      const calculatedTotalSales = currentSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      setTotalSalesAmount(calculatedTotalSales);
      setSalesCount(currentSales.length);
      setTotalMenuItems(currentMenuItems.length);
      setTotalDeletedLogEntries(currentDeletedLogs.length);

      const sortedSalesForChart = [...currentSales] 
        .sort((a, b) => {
          const dateA = a.createdAt && typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt && typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 7) 
        .map(sale => ({
          name: `Bill ${sale.id.slice(-6)}`, 
          total: sale.totalAmount, // Corrected to camelCase
          date: sale.createdAt && typeof sale.createdAt === 'string' && isValid(parseISO(sale.createdAt)) ? format(parseISO(sale.createdAt), 'MMM d') : 'Invalid Date' // Corrected to camelCase
        }))
        .reverse(); 
      setRecentSalesChartData(sortedSalesForChart);
    } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        toast({ title: "Error", description: `Could not load dashboard data: ${error.message}`, variant: "destructive" });
    } finally {
        setIsLoadingDashboardData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const chartConfig = {
    total: { 
      label: "Sales (PKR)",
      color: "hsl(var(--primary))", 
    },
  } satisfies ChartConfig;

  const handleAdvanceDay = async () => {
    setIsAdvancingDay(true);
    try {
        const newBusinessDayStr = await advanceToNextBusinessDay();
        if (newBusinessDayStr && isValid(parseISO(newBusinessDayStr))) {
            setCurrentBusinessDayDisplay(format(parseISO(newBusinessDayStr), "PPP"));
            toast({
                title: "Business Day Advanced",
                description: `The current business day is now ${format(parseISO(newBusinessDayStr), "PPP")}.`,
            });
            toast({
              title: "Data Note",
              description: "Data is now stored in Supabase. Backups are managed via the Supabase platform.",
              variant: "default"
            })

        } else {
            throw new Error("Advancing day returned an invalid date.");
        }
    } catch (error: any) {
        console.error("Failed to advance business day:", error);
        toast({ title: "Error", description: error.message || "Could not advance business day.", variant: "destructive"});
    } finally {
        setIsAdvancingDay(false);
        setIsConfirmDayEndOpen(false);
        fetchData(); 
    }
  };

  if (isLoadingDashboardData) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
            <span className="text-muted-foreground">Loading dashboard...</span>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Admin Dashboard" description="Overview of your restaurant's performance (data from Supabase)." />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Revenue (Last 7 Days)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {totalSalesAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {salesCount} transactions (Supabase)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menu Items</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMenuItems}</div>
            <p className="text-xs text-muted-foreground">Currently in Supabase</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Logged Deletions (Last 7 Days)</CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeletedLogEntries}</div>
            <p className="text-xs text-muted-foreground">Item deletions from bills (Supabase)</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Business Day</CardTitle>
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{currentBusinessDayDisplay || 'Loading...'}</div>
            <Button 
              size="sm" 
              className="mt-2 w-full" 
              onClick={() => setIsConfirmDayEndOpen(true)}
              disabled={isAdvancingDay}
            >
              {isAdvancingDay && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <PlayCircle className="mr-2 h-4 w-4" /> End Day & Start Next
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales Activity (Last 7 Transactions in selected period)</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          {recentSalesChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={recentSalesChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickFormatter={(value) => `PKR ${value / 1000}k`} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} name="Sales (PKR)" />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground">No recent sales data to display from Supabase.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmDayEndOpen} onOpenChange={setIsConfirmDayEndOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Day End</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to end the current business day ({currentBusinessDayDisplay}) and start the next one? 
              Supabase data will be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAdvancingDay}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAdvanceDay}
              disabled={isAdvancingDay}
            >
              {isAdvancingDay && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End Day & Start Next
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
