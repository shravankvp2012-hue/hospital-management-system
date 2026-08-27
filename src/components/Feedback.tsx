import type { ReactNode } from 'react';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = '' }: SpinnerProps) {
  return (
    <div
      className={`h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500 ${className}`}
    />
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-20">
      <Spinner className="h-8 w-8" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
