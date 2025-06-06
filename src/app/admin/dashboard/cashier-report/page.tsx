
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { PageTitle } from "@/components/common/page-title";
import { ClipboardList, CalendarDays, User, RotateCcw, Printer, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSales, getCurrentBusinessDay, getSupabaseUsersByRole, getCashierDisplayName } from "@/lib/data";
import type { SaleEntry } from '@/lib/definitions';
import { format, parseISO, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useToast } from '@/hooks/use-toast';

interface CashierUser {
  id: string;
  email: string | undefined;
}

export default function CashierReportPage() {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedCashierSupabaseId, setSelectedCashierSupabaseId] = useState<string | undefined>(undefined);
  const [availableCashiers, setAvailableCashiers] = useState<CashierUser[]>([]); 
  
  const [systemSales, setSystemSales] = useState(0);
  const [physicalCash, setPhysicalCash] = useState('');
  const [returnAmount, setReturnAmount] = useState('');
  const [onlineBills, setOnlineBills] = useState('');
  const [expenses, setExpenses] = useState('');
  const [others, setOthers] = useState('');

  const [isCalculatingSales, setIsCalculatingSales] = useState(false);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [selectedCashierName, setSelectedCashierName] = useState('N/A');
  const { toast } = useToast();

  const initializePage = useCallback(async () => {
    setIsLoadingPageData(true);
    try {
      const businessDayStr = await getCurrentBusinessDay();
      let defaultDate = new Date(); 
      if (businessDayStr && isValid(parseISO(businessDayStr))) {
          defaultDate = parseISO(businessDayStr);
      } else {
          console.warn("Cashier Report: Invalid or missing business day from Supabase. Defaulting to system's current date.");
      }
      setSelectedDateRange({ from: defaultDate, to: defaultDate }); 
      
      // Fetch actual Supabase users with 'cashier' role (simplified version)
      const cashiers = await getSupabaseUsersByRole('cashier');
      setAvailableCashiers(cashiers.map(c => ({ id: c.id, email: c.email })));
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to initialize page: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoadingPageData(false);
    }
  }, [toast]);

  useEffect(() => {
    initializePage();
  }, [initializePage]);

  useEffect(() => {
    const calculateSales = async () => {
      if (selectedDateRange?.from && selectedCashierSupabaseId) {
        setIsCalculatingSales(true);
        try {
          const filters = {
            startDate: format(selectedDateRange.from, 'yyyy-MM-dd'),
            endDate: selectedDateRange.to ? format(selectedDateRange.to, 'yyyy-MM-dd') : format(selectedDateRange.from, 'yyyy-MM-dd'),
            cashierId: selectedCashierSupabaseId
          };
          const salesData = await getSales(filters);
          const total = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
          setSystemSales(total);

          const name = await getCashierDisplayName(selectedCashierSupabaseId);
          setSelectedCashierName(name);

        } catch (error: any) {
          toast({ title: "Error", description: `Failed to calculate system sales: ${error.message}`, variant: "destructive"});
          setSystemSales(0);
          setSelectedCashierName('Error loading name');
        } finally {
          setIsCalculatingSales(false);
        }
      } else {
        setSystemSales(0);
        setSelectedCashierName('N/A');
      }
    };
    calculateSales();
  }, [selectedDateRange, selectedCashierSupabaseId, toast]);

  const netPhysicalBalance = useMemo(() => {
    const pc = parseFloat(physicalCash || '0');
    const ra = parseFloat(returnAmount || '0');
    const ob = parseFloat(onlineBills || '0');
    const ex = parseFloat(expenses || '0');
    const ot = parseFloat(others || '0');
    return (pc + ob + ot) - (ra + ex);
  }, [physicalCash, returnAmount, onlineBills, expenses, others]);

  const difference = useMemo(() => {
    return netPhysicalBalance - systemSales;
  }, [netPhysicalBalance, systemSales]);

  const resetFormFields = () => {
    setPhysicalCash('');
    setReturnAmount('');
    setOnlineBills('');
    setExpenses('');
    setOthers('');
    toast({ title: "Form Cleared", description: "All input fields have been reset." });
  };

  const displayDateRange = useMemo(() => {
    if (!selectedDateRange?.from) return "Pick a date range";
    const fromFormatted = format(selectedDateRange.from, 'PPP');
    if (!selectedDateRange.to || format(selectedDateRange.from, 'yyyy-MM-dd') === format(selectedDateRange.to, 'yyyy-MM-dd')) {
      return fromFormatted;
    }
    return `${fromFormatted} - ${format(selectedDateRange.to, 'PPP')}`;
  }, [selectedDateRange]);

  const generateReportHtml = () => {
    // ... (HTML generation logic remains the same, uses selectedCashierName for display)
     const pcNum = parseFloat(physicalCash || '0');
    const raNum = parseFloat(returnAmount || '0');
    const obNum = parseFloat(onlineBills || '0');
    const exNum = parseFloat(expenses || '0');
    const otNum = parseFloat(others || '0');
    
    const subtotalInflows = pcNum + obNum + otNum;
    const subtotalOutflows = raNum + exNum;

    return `
      <html>
        <head><title>Cashier Report - Alshawaya</title><style>/* ... styles ... */</style></head>
        <body>
          <div class="report-container">
            <div class="report-header">
              <h1>Alshawaya - Cashier Reconciliation Report</h1>
              <p>Cashier: ${selectedCashierName} (ID: ${selectedCashierSupabaseId?.substring(0,8)}...)</p>
              <p>Date Range: ${displayDateRange}</p>
            </div>
            <div class="section-title">System Sales Summary</div>
            <dl class="details-grid"><dt>Total System Sales:</dt><dd>PKR ${systemSales.toFixed(2)}</dd></dl>
            <div class="section-title">Physical Balance Declared</div>
            <dl class="details-grid">
              <dt>Physical Cash Counted:</dt> <dd>PKR ${pcNum.toFixed(2)}</dd>
              <dt>Online Bills Received:</dt> <dd>PKR ${obNum.toFixed(2)}</dd>
              <dt>Other Amounts (+/-):</dt> <dd>PKR ${otNum.toFixed(2)}</dd>
              <dt>Subtotal (Inflows):</dt> <dd>PKR ${subtotalInflows.toFixed(2)}</dd>
              <dt>Return Amount (Cash Out):</dt> <dd>PKR ${raNum.toFixed(2)}</dd>
              <dt>Expenses Paid (Cash Out):</dt> <dd>PKR ${exNum.toFixed(2)}</dd>
              <dt>Subtotal (Outflows):</dt> <dd>PKR ${subtotalOutflows.toFixed(2)}</dd>
            </dl>
            <div class="summary-section">
              <div class="section-title">Reconciliation Summary</div>
              <div class="summary-item total"><span>Total System Sales:</span><span>PKR ${systemSales.toFixed(2)}</span></div>
              <div class="summary-item total"><span>Net Physical Balance:</span><span>PKR ${netPhysicalBalance.toFixed(2)}</span></div>
              <hr class="dashed" />
              <div class="summary-item total ${difference === 0 ? '' : (difference > 0 ? 'text-green-600' : 'text-red-600')}">
                <span>Difference:</span><span>PKR ${difference.toFixed(2)}</span>
              </div>
            </div>
          </div></body></html>`;
  };

  const handlePrintReport = () => {
    if (!selectedDateRange?.from || !selectedCashierSupabaseId) {
      toast({ title: "Incomplete Criteria", description: "Please select a date range and a cashier.", variant: "destructive" });
      return;
    }
    const reportHtml = generateReportHtml();
    const printWindow = window.open('', '_blank', 'height=800,width=1000,scrollbars=yes');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 250);
      toast({ title: "Report Sent for Printing/PDF", description: "Cashier report is being prepared." });
    } else {
      toast({ title: "Popup Blocked", description: "Please allow popups for this site.", variant: "destructive" });
    }
  };

  if (isLoadingPageData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading report page...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={ClipboardList} title="Cashier Report" description="Generate a reconciliation report for a cashier." />

      <Card>
        <CardHeader>
          <CardTitle>Report Criteria</CardTitle>
          <CardDescription>Select date range and cashier.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="report-date-range">Report Date Range</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button id="report-date-range" variant="outline" className="w-full justify-start text-left font-normal mt-1" disabled={isCalculatingSales}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {displayDateRange}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="range" selected={selectedDateRange} onSelect={setSelectedDateRange} initialFocus defaultMonth={selectedDateRange?.from || new Date()} numberOfMonths={2}/>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="cashier-select">Select Cashier</Label>
            <Select value={selectedCashierSupabaseId} onValueChange={setSelectedCashierSupabaseId} disabled={isCalculatingSales || availableCashiers.length === 0}>
              <SelectTrigger id="cashier-select" className="w-full mt-1">
                <SelectValue placeholder={availableCashiers.length === 0 ? "No cashiers found" : "Select a cashier..."} />
              </SelectTrigger>
              <SelectContent>
                {availableCashiers.map(cashier => (
                  <SelectItem key={cashier.id} value={cashier.id}> 
                    {cashier.email || `ID: ${cashier.id.substring(0,8)}...`}
                  </SelectItem>
                ))}
                 {availableCashiers.length === 0 && <p className="p-2 text-sm text-muted-foreground">No cashiers loaded from Supabase.</p>}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {(selectedDateRange?.from && selectedCashierSupabaseId) ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Sales Summary</CardTitle>
                <CardDescription>
                  Total sales for cashier <strong>{selectedCashierName}</strong> from <strong>{displayDateRange}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCalculatingSales ? (
                  <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculating...</div>
                ) : (
                  <p className="text-3xl font-bold text-primary">PKR {systemSales.toFixed(2)}</p>
                )}
                {!isCalculatingSales && systemSales === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">No system sales found for this criteria.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Physical Balance Calculation</CardTitle>
                <CardDescription>Enter amounts as declared by the cashier.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input fields for physical balance remain the same */}
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="physical-cash">Physical Cash Counted</Label>
                    <Input id="physical-cash" type="number" value={physicalCash} onChange={e => setPhysicalCash(e.target.value)} placeholder="e.g., 50000" />
                  </div>
                  <div>
                    <Label htmlFor="online-bills">Online Bills Received</Label>
                    <Input id="online-bills" type="number" value={onlineBills} onChange={e => setOnlineBills(e.target.value)} placeholder="e.g., 10000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="return-amount">Return Amount (Cash Out)</Label>
                    <Input id="return-amount" type="number" value={returnAmount} onChange={e => setReturnAmount(e.target.value)} placeholder="e.g., 500" />
                  </div>
                  <div>
                    <Label htmlFor="expenses">Expenses Paid (Cash Out)</Label>
                    <Input id="expenses" type="number" value={expenses} onChange={e => setExpenses(e.target.value)} placeholder="e.g., 200" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="others">Other Amounts (+/-)</Label>
                  <Input id="others" type="number" value={others} onChange={e => setOthers(e.target.value)} placeholder="e.g., 100 or -50" />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                  <Button variant="outline" onClick={resetFormFields}><RotateCcw className="mr-2 h-4 w-4" /> Clear Inputs</Button>
              </CardFooter>
            </Card>
          </div>
          
          <Card className="bg-card border-2 border-primary/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Reconciliation Summary</CardTitle>
               <CardDescription>Report for cashier <strong>{selectedCashierName}</strong> from <strong>{displayDateRange}</strong>.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-lg">
              <div className="flex justify-between"><span>Total System Sales:</span><span className="font-semibold">PKR {systemSales.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Net Physical Balance Accounted For:</span><span className="font-semibold">PKR {netPhysicalBalance.toFixed(2)}</span></div>
              <hr className="my-2 border-border" />
              <div className={`flex justify-between font-bold ${difference === 0 ? 'text-green-600 dark:text-green-400' : (difference > 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive')}`}>
                <span>Difference:</span><span>PKR {difference.toFixed(2)}</span>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start space-y-2">
              <Button onClick={handlePrintReport} className="w-full md:w-auto" disabled={isCalculatingSales}>
                <Printer className="mr-2 h-4 w-4" /> Download PDF / Print Report
              </Button>
              <p className="text-xs text-muted-foreground">A positive difference means more physical balance. A negative difference means less.</p>
            </CardFooter>
          </Card>
        </>
      ) : (
        <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">Please select a date range and a cashier.</p></CardContent></Card>
      )}
    </div>
  );
}
