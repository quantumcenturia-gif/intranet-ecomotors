import { ExternalLink } from "lucide-react";
import { quickLinks } from "@/data/eco-motors";

export default function QuickLinks() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <ExternalLink className="h-5 w-5 text-blue-600" /> Enlaces rápidos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="flex flex-col items-center gap-2 rounded-lg border border-slate-100 p-3 text-center text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            <Icon className="h-5 w-5" /> {label}
          </a>
        ))}
      </div>
    </section>
  );
}
