
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface PageTitleProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode; // For action buttons or extra content
}

export function PageTitle({ icon: Icon, title, description, children }: PageTitleProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-7 w-7 text-primary" />}
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">{title}</h1>
        </div>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  );
}
