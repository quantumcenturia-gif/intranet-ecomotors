import type { LucideIcon } from "lucide-react";

export default function PageHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="animate-pop-in rounded-xl bg-black p-2.5 text-brand-500">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h1 className="animate-rise text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
      </div>
    </div>
  );
}
