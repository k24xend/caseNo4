import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Page({
  title,
  sub,
  children,
  backLabel,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  backLabel?: string;
}) {
  return (
    <div className="page">
      {backLabel && (
        <Link className="back" to="/plan">
          <ArrowLeft />
          {backLabel}
        </Link>
      )}
      <header className="page-title">
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </header>
      {children}
    </div>
  );
}
