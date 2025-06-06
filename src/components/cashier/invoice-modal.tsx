
"use client";

import type { Bill } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer, X, ChefHat } from 'lucide-react';
import { ClientSideFormattedDate } from '@/components/common/client-side-formatted-date';
import { useToast } from '@/hooks/use-toast';

interface InvoiceModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceModal({ bill, isOpen, onClose }: InvoiceModalProps) {
  const { toast } = useToast();

  if (!bill) return null;

  const thermalPrintStyles = `
    body.thermal-print-body { 
      font-family: Arial, sans-serif;
      font-size: 10pt; 
      color: #000;
      margin: 0;
      padding: 0;
      width: 72mm; /* Common thermal paper width */
      box-sizing: border-box;
    }
    .invoice-thermal { 
      width: 100%; 
      padding: 2mm;
      box-sizing: border-box;
    }
    .header-thermal { text-align: center; margin-bottom: 4px; }
    .header-thermal h1 { margin: 0 0 2px 0; font-size: 14pt; font-weight: bold; }
    .header-thermal h2 { margin: 0 0 2px 0; font-size: 12pt; font-weight: bold; }
    .header-thermal p { margin: 1px 0; font-size: 8pt; }
    .header-thermal strong { font-size: 12pt; }

    .separator-thermal { border: none; border-top: 1px dashed #000; margin: 4px 0; }

    .info-section-thermal p { margin: 1px 0; font-size: 8pt; }

    .items-table-thermal { width: 100%; border-collapse: collapse; margin-top: 4px; margin-bottom: 4px; font-size: 8pt; }
    .items-table-thermal th, .items-table-thermal td { padding: 1px; text-align: left; vertical-align: top; }
    .items-table-thermal th { font-weight: bold; border-bottom: 1px solid #000; }
    .items-table-thermal td.item-name { word-break: break-all; }
    .items-table-thermal .text-right { text-align: right; }
    .items-table-thermal .col-qty { width: 12%; }
    .items-table-thermal .col-item { width: 43%; }
    .items-table-thermal .col-price { width: 20%; text-align: right; }
    .items-table-thermal .col-total { width: 25%; text-align: right; }
    .items-table-thermal .deal-info { font-size: 7pt; font-style: italic; }


    .totals-thermal { margin-top: 4px; font-size: 9pt; }
    .totals-thermal div { display: flex; justify-content: space-between; margin-bottom: 1px; }
    .totals-thermal .grand-total span { font-weight: bold; font-size: 10pt; }

    .footer-thermal { text-align: center; margin-top: 4px; font-size: 8pt; }
    .footer-thermal p { margin: 1px 0; }

    .kitchen-copy .header-thermal p { font-size: 9pt; }
    .items-list-kitchen { margin-top: 4px; }
    .kitchen-item { margin: 2px 0; font-size: 10pt; }
    .kitchen-item .item-qty { font-weight: bold; }
    .kitchen-item .deal-info-kitchen { font-size: 8pt; font-style: italic; display: block; }
    .order-time-thermal { font-size: 8pt; text-align: center; margin-top: 4px; }

    @page { size: 72mm auto; margin: 1mm; }
  `;

  const generateCustomerCopyHtml = () => {
    let itemsHtml = '';
    bill.items.forEach(item => {
      const dealInfoHtml = item.dealContext ? `<span class="deal-info">(Deal: ${item.dealContext.dealName})</span><br/>` : '';
      itemsHtml += `
        <tr>
          <td class="col-qty">${item.quantity}</td>
          <td class="col-item item-name">${dealInfoHtml}${item.name} (${item.code})</td>
          <td class="col-price">${item.price.toFixed(2)}</td>
          <td class="col-total">${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    });

    const formattedDateTime = new Date(bill.createdAt).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return `
      <html>
        <head>
          <title>Alshawaya Customer Invoice - Bill ${bill.id}</title>
          <style>${thermalPrintStyles}</style>
        </head>
        <body class="thermal-print-body">
          <div class="invoice-thermal">
            <div class="header-thermal">
              <h1>Alshawaya</h1>
              <p>Date: ${formattedDateTime}</p>
              <p>Bill ID: ${bill.id}</p>
              <p>Cashier: ${bill.cashierId}</p>
            </div>
            <div class="info-section-thermal">
              ${bill.tableNumber ? `<p>Table No: ${bill.tableNumber}</p>` : ''}
              ${bill.customerName ? `<p>Customer: ${bill.customerName}</p>` : ''}
              ${bill.waiterName ? `<p>Waiter: ${bill.waiterName}</p>` : ''}
            </div>
            <hr class="separator-thermal">
            <table class="items-table-thermal">
              <thead>
                <tr>
                  <th class="col-qty">Qty</th>
                  <th class="col-item">Item</th>
                  <th class="col-price">Price</th>
                  <th class="col-total">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <hr class="separator-thermal">
            <div class="totals-thermal">
              <div><span>Subtotal:</span> <span>PKR ${bill.subtotal.toFixed(2)}</span></div>
              ${bill.tax ? `<div><span>Tax:</span> <span>PKR ${bill.tax.toFixed(2)}</span></div>` : ''}
              ${bill.discount ? `<div><span>Discount:</span> <span>PKR ${bill.discount.toFixed(2)}</span></div>` : ''}
              <div class="grand-total"><span>TOTAL:</span> <span>PKR ${bill.totalAmount.toFixed(2)}</span></div>
            </div>
            <hr class="separator-thermal">
            <div class="footer-thermal">
              <p>Thank you for dining with us!</p>
              <p>Alshawaya</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generateKitchenCopyHtml = () => {
    let itemsListHtml = '';
    bill.items.forEach(item => {
      const dealInfoKitchenHtml = item.dealContext ? `<span class="deal-info-kitchen">(Deal: ${item.dealContext.dealName})</span>` : '';
      itemsListHtml += `
        <p class="kitchen-item">
          <span class="item-qty">${item.quantity} x </span>
          <span class="item-name">${item.name}</span>
          ${dealInfoKitchenHtml}
        </p>
      `;
    });
  
    const formattedTime = new Date(bill.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

    return `
      <html>
        <head>
          <title>Alshawaya Kitchen Order - Bill ${bill.id}</title>
          <style>${thermalPrintStyles}</style>
        </head>
        <body class="thermal-print-body">
          <div class="invoice-thermal kitchen-copy">
            <div class="header-thermal">
              <h2>KITCHEN ORDER</h2>
              <p>Bill ID: ${bill.id}</p>
              ${bill.tableNumber ? `<p>Table: <strong>${bill.tableNumber}</strong></p>` : ''}
              ${bill.waiterName ? `<p>Waiter: ${bill.waiterName}</p>` : ''}
            </div>
            <hr class="separator-thermal">
            <div class="items-list-kitchen">${itemsListHtml}</div>
            <hr class="separator-thermal">
            <p class="order-time-thermal">Time: ${formattedTime}</p>
          </div>
        </body>
      </html>
    `;
  };
  
  const handlePrint = (htmlContent: string, copyType: 'Customer' | 'Kitchen') => {
    const printWindow = window.open('', '_blank', 'height=600,width=800,scrollbars=yes');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close(); // Necessary for some browsers.
      
      // Give the browser a moment to load content before printing
      setTimeout(() => {
        printWindow.focus(); // Required for some browsers
        printWindow.print();
        // Optional: Close the window after printing, but this can be abrupt.
        // printWindow.close(); 
      }, 250);

      toast({
        title: `${copyType} Copy Sent to Printer`,
        description: `The ${copyType.toLowerCase()} copy is being prepared for printing. Please check your browser's print dialog.`,
      });
    } else {
      toast({
        title: "Popup Blocked",
        description: `Could not open print window for ${copyType} copy. Please allow popups for this site.`,
        variant: "destructive",
      });
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Invoice - Bill ID: {bill.id}</DialogTitle>
          <DialogDescription>
            Generated on <ClientSideFormattedDate isoDateString={bill.createdAt} placeholder="loading date..." />
          </DialogDescription>
        </DialogHeader>
        
        <div id="invoice-modal-display">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 my-4 text-sm">
                {bill.tableNumber && <p><strong>Table No:</strong> {bill.tableNumber}</p>}
                {bill.customerName && <p><strong>Customer Name:</strong> {bill.customerName}</p>}
                {bill.waiterName && <p><strong>Waiter Name:</strong> {bill.waiterName}</p>}
                <p><strong>Cashier ID:</strong> {bill.cashierId}</p>
            </div>

            <ScrollArea className="max-h-[300px] border rounded-md">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {bill.items.map(item => (
                    <TableRow key={item.billItemId}>
                    <TableCell>
                        {item.name} ({item.code})
                        {item.dealContext && (
                            <span className="block text-xs text-accent_foreground bg-accent/70 px-1 rounded-sm">
                                Deal: {item.dealContext.dealName}
                            </span>
                        )}
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">PKR {item.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">PKR {(item.price * item.quantity).toFixed(2)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </ScrollArea>

            <div className="mt-4 space-y-1 text-right">
                <p className="text-md"><strong>Subtotal:</strong> PKR {bill.subtotal.toFixed(2)}</p>
                {bill.tax && <p className="text-md"><strong>Tax:</strong> PKR {bill.tax.toFixed(2)}</p>}
                {bill.discount && <p className="text-md"><strong>Discount:</strong> PKR {bill.discount.toFixed(2)}</p>}
                <p className="text-lg font-bold"><strong>Total Amount:</strong> PKR {bill.totalAmount.toFixed(2)}</p>
            </div>
        </div>

        <DialogFooter className="mt-6 sm:justify-between flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto order-last sm:order-first">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button type="button" onClick={() => handlePrint(generateCustomerCopyHtml(), 'Customer')} className="w-full sm:w-auto">
              <Printer className="mr-2 h-4 w-4" /> Print Customer Copy
            </Button>
            <Button type="button" onClick={() => handlePrint(generateKitchenCopyHtml(), 'Kitchen')} variant="secondary" className="w-full sm:w-auto">
              <ChefHat className="mr-2 h-4 w-4" /> Print Kitchen Copy
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
