import { Rocket } from "lucide-react";
import { projects } from "@/data/eco-motors";

export default function Projects() {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 lg:col-span-3">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Rocket className="h-5 w-5 text-brand-600" /> Nuestros proyectos
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {projects.map((p) => (
          <a
            key={p.name}
            href={p.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-neutral-100 p-4 transition hover:border-brand-200 hover:bg-brand-50"
          >
            <p className="text-2xl">{p.emoji}</p>
            <p className="mt-2 text-sm font-semibold">{p.name}</p>
            <p className="text-xs text-neutral-500">{p.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
