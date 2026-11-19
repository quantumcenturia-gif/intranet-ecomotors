import type { LucideIcon } from "lucide-react";

export default function PageHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
