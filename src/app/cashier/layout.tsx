
import type { ReactNode } from 'react';
import { AppHeader, ThemeProvider } from '@/components/common/app-header';
import { Toaster } from '@/components/ui/toaster';

export default function CashierLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
        <AppHeader userRole="cashier" />
        <main className="flex-1 container mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
