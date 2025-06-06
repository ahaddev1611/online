
"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, CalendarDays, Loader2 } from "lucide-react";
import { PageTitle } from "@/components/common/page-title";
import type { DeletedItemLogEntry } from "@/lib/definitions";
import { getDeletedItemLogs } from "@/lib/data";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { ClientSideFormattedDate } from '@/components/common/client-side-formatted-date';
import { useToast } from "@/hooks/use-toast";

export default function DeletedItemsLogPage() {
  const [logs, setLogs] = useState<DeletedItemLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchLogsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: { startDate?: string; endDate?: string } = {};
      if (dateRange?.from) filters.startDate = format(dateRange.from, 'yyyy-MM-dd');
      if (dateRange?.to) filters.endDate = format(dateRange.to, 'yyyy-MM-dd');
      
      const fetchedLogs = await getDeletedItemLogs(filters);
      setLogs(fetchedLogs);
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to fetch deletion logs: ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, dateRange]);

  useEffect(() => {
    fetchLogsData();
  }, [fetchLogsData]);

  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    return logs.filter(log =>
        log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.removedByCashierId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.billId && log.billId.toLowerCase().includes(searchTerm.toLowerCase()))
      ).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, searchTerm]);

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
        <span className="text-muted-foreground">Loading deletion logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle icon={Trash2} title="Deleted Items Log" description="Track items removed from bills by cashiers, data from Supabase." />
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <CardTitle>Deletion Records</CardTitle>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Input
                type="search"
                placeholder="Search logs..."
                className="w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoading}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto" disabled={isLoading}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
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
                    onSelect={(range) => {setDateRange(range); fetchLogsData();}} // Re-fetch on date change
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
           {isLoading && <div className="p-4 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>}
           {!isLoading && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Price/Item (PKR)</TableHead>
                  <TableHead>Cashier ID</TableHead>
                  <TableHead>Bill ID</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <ClientSideFormattedDate isoDateString={log.timestamp} />
                    </TableCell>
                    <TableCell>{log.itemCode}</TableCell>
                    <TableCell>{log.itemName}</TableCell>
                    <TableCell className="text-center">{log.quantityRemoved}</TableCell>
                    <TableCell className="text-right">{log.pricePerItem.toFixed(2)}</TableCell>
                    <TableCell>{log.removedByCashierId.substring(0,8)}...</TableCell>
                    <TableCell>{log.billId ? log.billId.substring(0,8)+'...' : 'N/A'}</TableCell>
                    <TableCell>{log.reason || 'N/A'}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      {logs.length === 0 && !isLoading ? "No deletion logs found in Supabase." : "No logs match your search or filters."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
