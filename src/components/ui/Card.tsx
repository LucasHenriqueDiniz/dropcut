import type { PropsWithChildren } from 'react';
import { clsx } from 'clsx';

export function Card({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <section className={clsx('rounded-2xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur', className)}>
      {children}
    </section>
  );
}
