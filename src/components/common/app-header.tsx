
"use client";
import Link from 'next/link';
import { ReceiptText, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User as AuthUser } from '@supabase/supabase-js';
import { ADMIN_EMAIL } from '@/lib/config'; // Import ADMIN_EMAIL

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, theme } = useTheme() ?? {};
  
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState('User');
  const [userRole, setUserRole] = useState<'admin' | 'cashier' | 'guest' | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (user) {
        setDisplayName(user.email || 'User');
        if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setUserRole('admin');
        } else {
          setUserRole('cashier'); 
        }
      } else {
        setDisplayName('Guest');
        setUserRole('guest');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
       if (user) {
        setDisplayName(user.email || 'User');
        if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setUserRole('admin');
        } else {
          setUserRole('cashier');
        }
      } else {
        setDisplayName('Guest');
        setUserRole('guest');
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setDisplayName('Guest');
    setUserRole('guest');
    router.push('/');
  };
  
  const getAvatarFallback = () => {
    if (currentUser?.email) {
      return currentUser.email.substring(0, 2).toUpperCase();
    }
    return displayName.charAt(0).toUpperCase();
  }

  const getHomeLink = () => {
    if (currentUser) {
      if (userRole === 'admin') return '/admin/dashboard';
      if (userRole === 'cashier') return `/cashier/billing?cashierId=${currentUser.id}`;
    }
    return '/';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link 
          href={getHomeLink()} 
          className="flex items-center space-x-2"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <ReceiptText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-headline text-xl font-semibold text-foreground">Alshawaya</span>
        </Link>
        
        <div className="flex items-center space-x-3">
          {mounted && setTheme && (
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                aria-label="Toggle theme"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
          )}
         
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={`https://placehold.co/100x100.png?text=${getAvatarFallback()}`} alt={displayName} data-ai-hint="avatar profile" />
                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    {userRole !== 'guest' && (
                        <p className="text-xs leading-none text-muted-foreground">
                        Role: {userRole}
                        </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

export function ThemeProvider({ children, ...props }: React.PropsWithChildren<import("next-themes/dist/types").ThemeProviderProps>) {
  const NextThemesProvider = require("next-themes").ThemeProvider; 
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
