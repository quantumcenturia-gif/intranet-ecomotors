import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { btnGhost, card } from "@/components/ui";
import { requireMe } from "@/lib/me";
import { markAllRead } from "./actions";

export default async function AvisosPage() {
  const { supabase, member } = await requireMe();
  const { data } = member
    ? await supabase.from("notifications").select("*").eq("member_id", member.id).order("created_at", { ascending: false }).limit(100)
    : { data: [] };
  const unread = data?.filter((n) => !n.read_at).length ?? 0;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader icon={Bell} title="Avisos" subtitle={unread ? `${unread} sin leer` : "Estás al día"} />
        {unread > 0 && (
          <form action={markAllRead}><button className={btnGhost}><CheckCheck className="h-4 w-4" /> Marcar todo como leído</button></form>
        )}
      </div>
      <div className={`${card} overflow-hidden`}>
        {data?.length ? (
          <ul className="divide-y divide-neutral-100">
            {data.map((n) => (
              <li key={n.id}>
                <Link href={`/aviso/${n.id}`} className={`flex gap-3 p-4 hover:bg-neutral-50 ${n.read_at ? "" : "bg-brand-50/50"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-brand-600"}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${n.read_at ? "" : "font-semibold"}`}>{n.title}</p>
                    {n.body && <p className="truncate text-sm text-neutral-600">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {new Date(n.created_at).toLocaleString("es-PE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Lima" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-sm text-neutral-500">
            {member ? "No tienes avisos. Aquí aparecerán tareas asignadas, revisiones y comentarios." : "Tu cuenta aún no está vinculada a tu ficha de integrante."}
          </p>
        )}
      </div>
    </>
  );
}
