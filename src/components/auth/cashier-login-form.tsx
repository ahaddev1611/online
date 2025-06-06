
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client

export function CashierLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState(''); // Changed from username to email
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
        // For cashier, we don't need a specific email check like admin,
        // but you might want to verify a role from a 'profiles' table in a real app.
        // For now, any successful login here is considered a cashier for this portal.
        // localStorage.setItem('zippybill_currentUserRole', 'cashier'); // Simple role flag
        router.push(`/cashier/billing?cashierId=${data.user.id}`); // Pass Supabase user ID as cashierId
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-md">
          <User className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-headline">Cashier Login</CardTitle>
        <CardDescription>Access the Al-Shawaya billing system. <br /> (Use your Supabase cashier credentials)</CardDescription>
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
              placeholder="e.g., ca1@alshawaya.com"
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
             <Link href="/login/admin">Switch to Admin Login</Link>
           </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
