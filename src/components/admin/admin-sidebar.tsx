
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LayoutDashboard, Package, BarChart3, Trash2, Undo2, Wrench, Tags, ClipboardList } from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/dashboard/items', label: 'Manage Items', icon: Package },
  { href: '/admin/dashboard/deals', label: 'Manage Deals', icon: Tags },
  { href: '/admin/dashboard/sales', label: 'Sales Report', icon: BarChart3 },
  { href: '/admin/dashboard/deleted-items', label: 'Deleted Items Log', icon: Trash2 },
  { href: '/admin/dashboard/returns', label: 'Return Bill', icon: Undo2 },
  { href: '/admin/dashboard/cashier-report', label: 'Cashier Report', icon: ClipboardList },
  // { href: '/admin/dashboard/closing', label: 'Closing System', icon: XCircle }, // Link removed as per request
  { href: '/admin/dashboard/utilities', label: 'System Utilities', icon: Wrench },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r bg-card p-4 hidden md:block">
      <ScrollArea className="h-full">
        <nav className="space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              asChild
              variant={pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href)) ? 'default' : 'ghost'}
              className={cn(
                "w-full justify-start text-base h-11",
                (pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href)))
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
