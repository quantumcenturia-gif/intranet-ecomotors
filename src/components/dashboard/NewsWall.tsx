/* eslint-disable @next/next/no-img-element -- imágenes subidas por el equipo */
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/format";

type News = { id: number; title: string; body: string; created_at: string; image_url?: string | null };

export default function NewsWall({ news }: { news: News[] }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Megaphone className="h-5 w-5 text-brand-600" /> Comunicados
        </h2>
        <Link href="/noticias" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
          Ver todas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {news.length ? (
        <ul className="space-y-4">
          {news.map((n) => (
            <li key={n.id} className="flex gap-4 border-l-4 border-brand-500 pl-4">
              {n.image_url && <img src={n.image_url} alt="" className="h-16 w-24 shrink-0 rounded-md object-cover" />}
              <div className="min-w-0">
              <p className="font-medium">{n.title}</p>
              <p className="line-clamp-2 text-sm text-neutral-600">{n.body}</p>
              <p className="mt-1 text-xs text-neutral-400">{formatDate(n.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">Todavía no hay comunicados.</p>
      )}
    </section>
  );
}
