import { Megaphone, Send, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { createAnnouncement, deleteAnnouncement } from "./actions";

export default async function NoticiasPage() {
  const { supabase, profile } = (await getCurrentUser())!;
  const isAdmin = profile?.role === "admin";
  const { data: news } = await supabase
    .from("announcements")
    .select("id,title,body,created_at,author:profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader icon={Megaphone} title="Noticias" subtitle="Comunicados de la empresa" />

      {isAdmin && (
        <form action={createAnnouncement} className="mb-6 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <input name="title" required placeholder="Título" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <textarea name="body" required rows={3} placeholder="Escribe el comunicado…" className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Send className="h-4 w-4" /> Publicar
          </button>
        </form>
      )}

      <div className="space-y-4">
        {news?.length ? (
          news.map((n) => {
            const author = Array.isArray(n.author) ? n.author[0] : n.author;
            return (
              <article key={n.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold">{n.title}</h2>
                  {isAdmin && (
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={n.id} />
                      <button aria-label="Borrar" className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  {author?.full_name ?? "—"} · {formatDate(n.created_at)}
                </p>
                <p className="whitespace-pre-line text-slate-700">{n.body}</p>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">No hay noticias publicadas.</p>
        )}
      </div>
    </>
  );
}
