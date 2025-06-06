
import type { ReactNode } from 'react';
import { ReceiptText } from 'lucide-react';
import Link from 'next/link';
import { CurrentYear } from '@/components/common/current-year';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 selection:bg-accent selection:text-accent-foreground">
      <Link href="/" className="mb-8 flex items-center space-x-3 rtl:space-x-reverse">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <ReceiptText className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="self-center text-3xl font-headline font-semibold whitespace-nowrap text-foreground">
            Alshawaya
          </span>
      </Link>
      {children}
       <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>&copy; <CurrentYear /> Alshawaya. All rights reserved.</p>
        </footer>
    </div>
  );
}
