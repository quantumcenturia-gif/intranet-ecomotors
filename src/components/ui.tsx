import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition hover:border-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
export const selectSm =
  "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm transition hover:border-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-900/20 transition hover:bg-brand-700 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";
export const btnDark =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";
export const card = "rounded-xl border border-neutral-200 bg-white";

export function Label({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ""}`}>{children}</span>;
}
