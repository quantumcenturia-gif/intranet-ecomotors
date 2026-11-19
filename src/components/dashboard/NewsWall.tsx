import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import { formatDate } from "@/lib/format";

type News = { id: number; title: string; body: string; created_at: string };

export default function NewsWall({ news }: { news: News[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <Megaphone className="h-5 w-5 text-blue-600" /> Noticias y anuncios
        </h2>
        <Link href="/noticias" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          Ver todas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {news.length ? (
        <ul className="space-y-4">
          {news.map((n) => (
            <li key={n.id} className="border-l-4 border-blue-500 pl-4">
              <p className="font-medium">{n.title}</p>
              <p className="line-clamp-2 text-sm text-slate-600">{n.body}</p>
              <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Todavía no hay anuncios.</p>
      )}
    </section>
  );
}
