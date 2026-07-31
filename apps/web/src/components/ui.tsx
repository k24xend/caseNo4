import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Check, Clock3, CloudOff } from 'lucide-react';
import type { SyncStatus } from '../domain/models';
import { cn } from '../lib/utils';
import { Button as ShadButton } from './ui/button';
import { Card as ShadCard } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Skeleton as ShadSkeleton } from './ui/skeleton';
import { Badge as ShadBadge } from './ui/badge';

export function Button({ className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <ShadButton className={className} {...p} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <ShadCard className={cn('p-6', className)}>{children}</ShadCard>;
}

export function Field({
  label,
  error,
  className,
  ...p
}: { label: string; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = p.id ?? p.name;
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...p}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function Badge({ status }: { status: SyncStatus }) {
  const map = {
    synced: [Check, 'Синхронизировано', 'secondary' as const],
    pending: [Clock3, 'Ожидает', 'muted' as const],
    failed: [AlertCircle, 'Ошибка', 'outline' as const],
    conflict: [CloudOff, 'Конфликт', 'outline' as const],
  } as const;
  const [Icon, text, variant] = map[status];
  return (
    <ShadBadge variant={variant} className="gap-2">
      <Icon className="h-3 w-3" />
      {text}
    </ShadBadge>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-4" aria-label="Загрузка">
      <ShadSkeleton className="h-8 w-2/3" />
      <ShadSkeleton className="h-32 w-full" />
      <ShadSkeleton className="h-24 w-full" />
    </div>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <ShadCard className="space-y-2 p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        ○
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </ShadCard>
  );
}

export function Banner({
  kind = 'info',
  children,
}: {
  kind?: 'info' | 'danger' | 'offline';
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm',
        kind === 'danger' && 'border-destructive/30 bg-destructive/10 text-destructive',
        kind === 'offline' && 'border-border bg-muted text-muted-foreground',
        kind === 'info' && 'border-border bg-card text-foreground',
      )}
    >
      {children}
    </div>
  );
}
