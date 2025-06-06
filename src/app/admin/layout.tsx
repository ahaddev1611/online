
import type { ReactNode } from 'react';
import { AppHeader, ThemeProvider } from '@/components/common/app-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { Toaster } from '@/components/ui/toaster';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
        <AppHeader userRole="admin" />
        <div className="flex flex-1">
          <AdminSidebar />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
