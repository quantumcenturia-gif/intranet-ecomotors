import { ExternalLink } from "lucide-react";
import { quickLinks } from "@/data/eco-motors";

export default function QuickLinks() {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <ExternalLink className="h-5 w-5 text-brand-600" /> Enlaces rápidos
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map(({ label, href, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="group flex flex-col items-center gap-2 rounded-lg border border-neutral-100 p-3 text-center text-sm text-neutral-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            <Icon className="h-5 w-5 transition duration-300 group-hover:-translate-y-1 group-hover:scale-110" /> {label}
          </a>
        ))}
      </div>
    </section>
  );
}
