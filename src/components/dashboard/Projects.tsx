/* eslint-disable @next/next/no-img-element -- imágenes subidas por el equipo */
import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";

type Project = { id: string; name: string; description: string | null; emoji: string | null; image_url: string | null };

export default function Projects({ projects }: { projects: Project[] }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 lg:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Rocket className="h-5 w-5 text-brand-600" /> Nuestros proyectos
        </h2>
        <Link href="/proyectos" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
          Ver todos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {projects.map((p) => (
          <Link key={p.id} href="/proyectos" className="overflow-hidden rounded-lg border border-neutral-100 transition hover:border-brand-200 hover:shadow">
            <div className="flex h-20 items-center justify-center bg-black">
              {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <span className="text-3xl">{p.emoji}</span>}
            </div>
            <div className="p-3">
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="line-clamp-2 text-xs text-neutral-500">{p.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
