
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, CalendarDays, DollarSign, Download, Trash2, Printer, Loader2 } from "lucide-react";
import { PageTitle } from "@/components/common/page-title";
import type { SaleEntry } from "@/lib/definitions";
import { getSales, clearAllSalesAndSave, clearSalesOlderThanAndSave } from "@/lib/data"; 
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format as formatDateFns, parseISO, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
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
import { ClientSideFormattedDate } from '@/components/common/client-side-formatted-date';

export default function SalesReportPage() {
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isConfirmPurgeOpen, setIsConfirmPurgeOpen] = useState(false);
  const [purgeCutoffDate, setPurgeCutoffDate] = useState<Date | undefined>(undefined);
  const { toast } = useToast();

  const fetchSalesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: { startDate?: string; endDate?: string } = {};
      if (dateRange?.from) filters.startDate = formatDateFns(dateRange.from, 'yyyy-MM-dd');
      if (dateRange?.to) filters.endDate = formatDateFns(dateRange.to, 'yyyy-MM-dd');
      
      const fetchedSales = await getSales(filters);
      setSales(fetchedSales);
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to fetch sales: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, dateRange]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    return sales.filter(sale =>
        sale.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.waiterName && sale.waiterName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.tableNumber && sale.tableNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.cashierId && sale.cashierId.toLowerCase().includes(searchTerm.toLowerCase())) 
      ).sort((a,b) => {
        const dateA = a.createdAt && isValid(parseISO(a.createdAt)) ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt && isValid(parseISO(b.createdAt)) ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [sales, searchTerm]);

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = filteredSales.length;

  const handleDownloadReport = () => {
    if (filteredSales.length === 0) {
      toast({ title: "No Data", description: "No sales data to download for the current filter.", variant: "destructive" });
      return;
    }
    const headers = ["Bill ID", "Date", "Cashier ID", "Customer", "Waiter", "Table", "Total (PKR)"];
    const csvRows = [
      headers.join(','),
      ...filteredSales.map(sale => [
        `"${sale.id}"`,
        `"${sale.createdAt && isValid(parseISO(sale.createdAt)) ? new Date(sale.createdAt).toLocaleString('en-PK') : 'Invalid Date'}"`,
        `"${sale.cashierId}"`,
        `"${sale.customerName || 'N/A'}"`,
        `"${sale.waiterName || 'N/A'}"`,
        `"${sale.tableNumber || 'N/A'}"`,
        sale.totalAmount.toFixed(2)
      ].join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const dateSuffix = dateRange?.from ? formatDateFns(dateRange.from, "yyyy-MM-dd") + (dateRange.to ? '_to_' + formatDateFns(dateRange.to, "yyyy-MM-dd") : '') : 'all_dates';
      link.setAttribute('download', `sales_report_${dateSuffix}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "CSV Report Downloaded", description: "The sales report has been downloaded." });
    }
  };
  
  const handlePrintAsPdf = () => {
    if (filteredSales.length === 0) {
      toast({ title: "No Data", description: "No sales data to print.", variant: "destructive" });
      return;
    }
    let dateRangeString = "All Time";
    if (dateRange?.from) {
      dateRangeString = formatDateFns(dateRange.from, "PPP");
      if (dateRange.to) {
        dateRangeString += ` - ${formatDateFns(dateRange.to, "PPP")}`;
      }
    }

    const reportHtml = `
      <html>
        <head><title>Sales Report - Alshawaya</title><style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #C0B3C5; text-align: center; }
          p { font-size: 10pt; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background-color: #F0F0F2; }
          td.text-right { text-align: right; }
          .report-header { margin-bottom: 20px; }
          .summary-section { margin-top: 20px; padding: 10px; background-color: #F0F0F2; border-radius: 5px;}
          .summary-section p { margin: 3px 0; }
        </style></head>
        <body>
          <div class="report-header">
            <h1>Alshawaya - Sales Report</h1>
            <p>Date Range: ${dateRangeString}</p>
          </div>
          <div class="summary-section">
            <p>Total Revenue: PKR ${totalRevenue.toFixed(2)}</p>
            <p>Total Transactions: ${totalTransactions}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Date</th>
                <th>Cashier ID</th>
                <th>Customer</th>
                <th>Waiter</th>
                <th>Table</th>
                <th class="text-right">Total (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSales.map(sale => `
                <tr>
                  <td>${sale.id.substring(0,8)}...</td>
                  <td>${sale.createdAt && isValid(parseISO(sale.createdAt)) ? new Date(sale.createdAt).toLocaleString('en-PK') : 'Invalid Date'}</td>
                  <td>${sale.cashierId ? sale.cashierId.substring(0,8)+'...' : 'N/A'}</td>
                  <td>${sale.customerName || 'N/A'}</td>
                  <td>${sale.waiterName || 'N/A'}</td>
                  <td>${sale.tableNumber || 'N/A'}</td>
                  <td class="text-right">${sale.totalAmount.toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500); 
      toast({ title: "Printing PDF", description: "Sales report sent for printing." });
    } else {
      toast({ title: "Popup Blocked", description: "Allow popups to print.", variant: "destructive" });
    }
  };

  const handleExecuteClearSales = async () => {
    setIsProcessing(true);
    try {
      await clearAllSalesAndSave();
      toast({ title: "Sales Cleared", description: "All sales data has been cleared from Supabase." });
      fetchSalesData(); 
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to clear sales: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setIsConfirmClearOpen(false);
    }
  };
  
  const handleExecutePurgeOldSales = async () => {
    if (!purgeCutoffDate) {
      toast({ title: "No Date", description: "Please select a cutoff date.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const cutoffDateString = formatDateFns(purgeCutoffDate, 'yyyy-MM-dd');
      const result = await clearSalesOlderThanAndSave(cutoffDateString);
      toast({ title: "Sales Purged", description: `${result.count || 0} old sales record(s) before ${formatDateFns(purgeCutoffDate, 'PPP')} have been purged.` });
      fetchSalesData();
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to purge sales: ${error.message}`, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      setIsConfirmPurgeOpen(false);
      setPurgeCutoffDate(undefined);
    }
  };

  if (isLoading && sales.length === 0) { 
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading sales reports...</span>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageTitle icon={BarChart3} title="Sales Report" description="View detailed sales transactions and summaries from Supabase." />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (Filtered)</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">PKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions (Filtered)</CardTitle>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <Input
                type="search"
                placeholder="Search transactions..."
                className="w-full sm:w-auto md:w-52"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {formatDateFns(dateRange.from, "LLL dd, y")} - {formatDateFns(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        formatDateFns(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {setDateRange(range); fetchSalesData();}}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button onClick={handleDownloadReport} className="w-full sm:w-auto" disabled={isLoading || filteredSales.length === 0}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button onClick={handlePrintAsPdf} variant="outline" className="w-full sm:w-auto" disabled={isLoading || filteredSales.length === 0}>
                <Printer className="mr-2 h-4 w-4" /> Print PDF
              </Button>
            </div>
          </div>
            <div className="mt-4 flex flex-col md:flex-row gap-2 items-end">
                 <div className="w-full md:w-auto">
                    <Label htmlFor="purge-date" className="text-xs">Clear Sales Older Than:</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button id="purge-date" variant="outline" className="w-full justify-start text-left font-normal mt-1" disabled={isProcessing || isLoading}>
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {purgeCutoffDate ? formatDateFns(purgeCutoffDate, "PPP") : <span>Pick cutoff date</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={purgeCutoffDate} onSelect={setPurgeCutoffDate} initialFocus disabled={(date) => date > new Date() || date < new Date("2000-01-01") || isProcessing || isLoading} />
                        </PopoverContent>
                    </Popover>
                </div>
                <Button variant="destructive" onClick={() => setIsConfirmPurgeOpen(true)} className="w-full md:w-auto" disabled={isProcessing || isLoading || !purgeCutoffDate}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Purge Old Sales
                </Button>
                 <Button variant="destructive" onClick={() => setIsConfirmClearOpen(true)} className="w-full md:w-auto" disabled={isProcessing || isLoading}>
                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Clear ALL Sales
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <div className="p-4 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>}
          {!isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill ID</TableHead>
                  <TableHead>Sale Timestamp</TableHead>
                  <TableHead>Business Day</TableHead>
                  <TableHead>Cashier ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Waiter</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead className="text-right">Total (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.length > 0 ? filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.id.substring(0,8)}...</TableCell>
                    <TableCell>
                      <ClientSideFormattedDate isoDateString={sale.createdAt} />
                    </TableCell>
                    <TableCell>{sale.business_day && isValid(parseISO(sale.business_day)) ? formatDateFns(parseISO(sale.business_day), 'PPP') : 'Invalid Date'}</TableCell>
                    <TableCell>{sale.cashierId ? sale.cashierId.substring(0,8)+'...' : 'N/A'}</TableCell>
                    <TableCell>{sale.customerName || 'N/A'}</TableCell>
                    <TableCell>{sale.waiterName || 'N/A'}</TableCell>
                    <TableCell>{sale.tableNumber || 'N/A'}</TableCell>
                    <TableCell className="text-right">{sale.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      {sales.length === 0 && !isLoading ? "No sales records found in Supabase." : "No sales transactions match your search or filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmClearOpen} onOpenChange={setIsConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete ALL sales records from Supabase.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecuteClearSales} className={buttonVariants({ variant: "destructive" })} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Clear All Sales
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmPurgeOpen} onOpenChange={setIsConfirmPurgeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purge Old Sales</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete all sales records older than{' '}
              <strong>{purgeCutoffDate ? formatDateFns(purgeCutoffDate, 'PPP') : 'the selected date'}</strong> from Supabase? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPurgeCutoffDate(undefined)} disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExecutePurgeOldSales} className={buttonVariants({variant: "destructive"})} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Yes, Purge Old Sales
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


    
