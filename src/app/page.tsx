
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogIn, ReceiptText } from 'lucide-react';
import { CurrentYear } from '@/components/common/current-year';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 selection:bg-accent selection:text-accent-foreground">
      <main className="flex flex-col items-center w-full">
        <Card className="w-full max-w-lg shadow-2xl rounded-xl overflow-hidden">
          <CardHeader className="text-center bg-card p-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-md">
              <ReceiptText className="h-10 w-10 text-primary-foreground" />
            </div>
            <CardTitle className="text-4xl font-headline font-bold text-foreground">
              Alshawaya
            </CardTitle>
            <CardDescription className="text-muted-foreground text-lg mt-2">
              Efficient Restaurant Billing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <p className="text-center text-foreground text-base">
              Please select your login portal to continue.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Button asChild className="w-full py-6 text-lg" size="lg">
                <Link href="/login/admin">
                  <LogIn className="mr-3 h-6 w-6" /> Admin Login
                </Link>
              </Button>
              <Button asChild className="w-full py-6 text-lg" variant="secondary" size="lg">
                <Link href="/login/cashier">
                  <LogIn className="mr-3 h-6 w-6" /> Cashier Login
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; <CurrentYear /> Alshawaya. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
