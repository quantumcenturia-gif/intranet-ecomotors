/* eslint-disable @next/next/no-img-element -- imágenes subidas por el equipo */
import { Megaphone, Send, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { requireMe } from "@/lib/me";
import { formatDate } from "@/lib/format";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export default async function NoticiasPage() {
  const { supabase, isManager: canPost, isAdmin } = await requireMe();
  const { data: news } = await supabase
    .from("announcements")
    .select("id,title,body,created_at,image_url,author:profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader icon={Megaphone} title="Comunicados" subtitle="Avisos oficiales para todo el equipo · cada comunicado nuevo llega como aviso 🔔 a todos" />

      {canPost && (
        <form action={createAnnouncement} className="mb-6 space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
          <input name="title" required placeholder="Título" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
          <textarea name="body" required rows={3} placeholder="Escribe el comunicado para todo el equipo…" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
          <input name="image" type="file" accept="image/*" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2" />
          <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Send className="h-4 w-4" /> Publicar para todos
          </button>
        </form>
      )}

      <div className="space-y-4">
        {news?.length ? (
          news.map((n) => {
            const author = Array.isArray(n.author) ? n.author[0] : n.author;
            return (
              <article key={n.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {n.image_url && <img src={n.image_url} alt="" className="max-h-80 w-full object-cover" />}
                <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold">{n.title}</h2>
                  {isAdmin && (
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={n.id} />
                      <button aria-label="Borrar" className="text-neutral-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
                <p className="mb-3 text-xs text-neutral-500">
                  {author?.full_name ?? "—"} · {formatDate(n.created_at)}
                </p>
                <p className="whitespace-pre-line text-neutral-700">{n.body}</p>
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-neutral-500">No hay comunicados publicados.</p>
        )}
      </div>
    </>
  );
}
