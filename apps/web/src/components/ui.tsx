import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, Check, Clock3, CloudOff } from 'lucide-react';
import type { SyncStatus } from '../domain/models';
export function Button({ className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`button ${className}`} {...p} />;
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Field({
  label,
  error,
  ...p
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = p.id ?? p.name;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...p}
      />
      {error && (
        <small id={`${id}-error`} role="alert">
          {error}
        </small>
      )}
    </label>
  );
}
export function Badge({ status }: { status: SyncStatus }) {
  const map = {
    synced: [Check, 'Синхронизировано'],
    pending: [Clock3, 'Ожидает'],
    failed: [AlertCircle, 'Ошибка'],
    conflict: [CloudOff, 'Конфликт'],
  } as const;
  const [Icon, text] = map[status];
  return (
    <span className={`badge ${status}`}>
      <Icon size={13} />
      {text}
    </span>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-stack" aria-label="Загрузка">
      <i />
      <i />
      <i />
    </div>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <Card className="empty">
      <div className="empty-icon">○</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </Card>
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
    <div className={`banner ${kind}`} role="status">
      {children}
    </div>
  );
}
