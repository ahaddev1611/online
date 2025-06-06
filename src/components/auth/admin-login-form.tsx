
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserCog, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient'; 
import { ADMIN_EMAIL } from '@/lib/config'; // Import ADMIN_EMAIL

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        if (data.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          router.push('/admin/dashboard');
        } else {
          await supabase.auth.signOut(); 
          setError('Access denied. Not an authorized admin user.');
        }
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (catchError: any) {
      setError(catchError.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <UserCog className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-headline">Admin Login</CardTitle>
        <CardDescription>Access the Al-Shawaya management panel. <br /> (Use Supabase credentials for: {ADMIN_EMAIL})</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-destructive/10">
              <AlertCircle className="h-4 w-4 !text-destructive" />
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={ADMIN_EMAIL}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-base"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
           <Button variant="link" asChild className="text-sm">
             <Link href="/login/cashier">Switch to Cashier Login</Link>
           </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
