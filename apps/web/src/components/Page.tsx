import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

export function Page({
  title,
  sub,
  children,
  backLabel,
  backTo = '/today',
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  backLabel?: string;
  backTo?: string;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        {backLabel && (
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2 text-muted-foreground">
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted-foreground leading-relaxed">{sub}</p>}
      </header>
      {children}
    </div>
  );
}
