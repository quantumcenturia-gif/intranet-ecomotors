/* eslint-disable @next/next/no-img-element -- imágenes subidas por el equipo */
import { Megaphone, Send, Trash2 } from "lucide-react";
import AudienceBadge from "@/components/AudienceBadge";
import PageHeader from "@/components/PageHeader";
import { Label, card, inputCls } from "@/components/ui";
import { requireMe } from "@/lib/me";
import { formatDate } from "@/lib/format";
import { flattenTree } from "@/lib/units";
import { createAnnouncement, deleteAnnouncement } from "./actions";

type News = {
  id: number; title: string; body: string; created_at: string; image_url: string | null; unit_id: string | null; author_id: string | null;
  author: { full_name: string | null } | null; unit: { name: string } | null;
};

export default async function NoticiasPage() {
  const { supabase, user, isManager, isAdmin, manageable, units } = await requireMe();
  const { data: news } = await supabase
    .from("announcements")
    .select("id,title,body,created_at,image_url,unit_id,author_id,author:profiles(full_name),unit:units(name)")
    .order("created_at", { ascending: false })
    .returns<News[]>();

  const canPost = isAdmin || isManager;
  const targets = flattenTree(units, isAdmin ? undefined : manageable);
  const canDelete = (n: News) => isAdmin || (n.author_id === user.id && !!n.unit_id && manageable.has(n.unit_id));

  return (
    <>
      <PageHeader icon={Megaphone} title="Comunicados" subtitle="Avisos oficiales · cada comunicado llega como aviso 🔔 a sus destinatarios" />

      {canPost && (
        <form action={createAnnouncement} className={`${card} mb-6 space-y-3 p-5`}>
          <Label label="¿Para quién es?">
            <select name="para" defaultValue={isAdmin ? "__todos__" : targets[0]?.unit.id} className={inputCls}>
              {isAdmin && <option value="__todos__">📢 Todo el equipo</option>}
              {targets.map(({ unit, depth }) => (
                <option key={unit.id} value={unit.id}>
                  {"  ".repeat(depth)}{depth ? "↳ " : ""}{unit.name} {unit.kind === "subarea" ? "(subárea)" : "(área completa)"}
                </option>
              ))}
            </select>
          </Label>
          <input name="title" required placeholder="Título" className={inputCls} />
          <textarea name="body" required rows={3} placeholder="Escribe el comunicado…" className={inputCls} />
          <input name="image" type="file" accept="image/*" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2" />
          <p className="text-xs text-neutral-500">Si eliges un área, lo verán y recibirán el aviso solo sus miembros (incluidas sus subáreas).</p>
          <button className="group flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            <Send className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /> Publicar comunicado
          </button>
        </form>
      )}

      <div className="space-y-4">
        {news?.length ? (
          news.map((n) => (
            <article key={n.id} className={`${card} overflow-hidden`}>
              {n.image_url && <img src={n.image_url} alt="" className="max-h-80 w-full object-cover" />}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-lg font-semibold">{n.title}</h2>
                  {canDelete(n) && (
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={n.id} />
                      <button aria-label="Borrar" className="text-neutral-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>
                <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                  <AudienceBadge name={n.unit?.name} />
                  <span>{n.author?.full_name ?? "—"} · {formatDate(n.created_at)}</span>
                </p>
                <p className="whitespace-pre-line text-neutral-700">{n.body}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-neutral-500">No hay comunicados publicados.</p>
        )}
      </div>
    </>
  );
}
