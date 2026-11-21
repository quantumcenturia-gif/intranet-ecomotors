import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Lock, Save, Trash2, XCircle } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Badge, btnDark, btnPrimary, card } from "@/components/ui";
import { SESSION_STYLES, TIPO_STYLES, dayLabel, fmtHours, hhmm, type AttendanceRecord, type Session } from "@/lib/attendance";
import { requireMe, type Member } from "@/lib/me";
import { subtree } from "@/lib/units";
import { closeSession, deleteSession, setRecord, verifySession } from "../actions";

export default async function SesionPage({ params }: PageProps<"/asistencia/[id]">) {
  const id = Number((await params).id);
  const { supabase, units, manageable, isAdmin } = await requireMe();
  const { data: s } = await supabase.from("attendance_sessions").select("*").eq("id", id).maybeSingle<Session>();
  if (!s) notFound();
  const canManage = s.unit_id === null ? isAdmin : manageable.has(s.unit_id);
  if (!canManage) redirect("/asistencia");

  const scope = s.unit_id ? subtree(units, s.unit_id) : null;
  let mq = supabase.from("members").select("id,full_name,avatar_url,unit_id").eq("es_prueba", false).neq("estado", "Miembro retirado").order("full_name");
  if (scope) mq = mq.in("unit_id", scope);
  const [{ data: members }, { data: records }, { data: people }] = await Promise.all([
    mq.returns<Pick<Member, "id" | "full_name" | "avatar_url" | "unit_id">[]>(),
    supabase.from("attendance_records").select("*").eq("session_id", id).returns<AttendanceRecord[]>(),
    supabase.from("members").select("id,full_name").eq("es_prueba", false).in("id", [s.opened_by, s.verified_by].filter(Boolean) as string[]),
  ]);
  const rec = new Map((records ?? []).map((r) => [r.member_id, r]));
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const presentes = (records ?? []).filter((r) => r.entrada).length;
  const incompletos = (records ?? []).filter((r) => !r.entrada || !r.salida).length;
  const totalH = (records ?? []).reduce((a, r) => a + Number(r.horas ?? 0), 0);
  const locked = s.estado === "Verificada";
  const timeCls = "w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm disabled:border-transparent disabled:bg-transparent";

  return (
    <>
      <Link href="/asistencia" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Asistencia
      </Link>

      <section className={`${card} mb-6 p-6`}>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge className={TIPO_STYLES[s.tipo]}>{s.tipo}</Badge>
          <Badge className={SESSION_STYLES[s.estado]}>{s.estado === "Cerrada" ? "Cerrada · por verificar" : s.estado === "Verificada" ? "Verificada y guardada" : "Abierta"}</Badge>
        </div>
        <h1 className="text-2xl font-bold">{s.titulo}</h1>
        <p className="text-sm text-neutral-500">
          {dayLabel(s.fecha)} · {s.unit_id ? unitName.get(s.unit_id) : "Todo el equipo"} · abierta por {name.get(s.opened_by ?? "") ?? "—"} a las {hhmm(s.opened_at)}
          {s.closed_at && ` · cerrada a las ${hhmm(s.closed_at)}`}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-neutral-100 px-3 py-1.5"><b>{presentes}</b> de {members?.length ?? 0} presentes</span>
          <span className="rounded-lg bg-neutral-100 px-3 py-1.5"><b>{fmtHours(totalH)}</b> en total</span>
          {incompletos > 0 && !locked && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-800">{incompletos} sin entrada o salida</span>}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {s.estado === "Abierta" && (
            <form action={closeSession}>
              <input type="hidden" name="session_id" value={s.id} />
              <button className={btnDark}><XCircle className="h-4 w-4" /> Cerrar asistencia</button>
            </form>
          )}
          {s.estado === "Cerrada" && (
            <form action={verifySession} className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3">
              <input type="hidden" name="session_id" value={s.id} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirm" className="h-4 w-4 accent-brand-600" /> He revisado las entradas y salidas
              </label>
              <button className={btnPrimary}><CheckCircle2 className="h-4 w-4" /> Verificar y guardar</button>
            </form>
          )}
          {locked && (
            <p className="flex items-center gap-2 text-sm text-neutral-600">
              <Lock className="h-4 w-4" /> Verificada por {name.get(s.verified_by ?? "") ?? "—"}. Ya no se puede modificar.
            </p>
          )}
          {(!locked || isAdmin) && (
            <form action={deleteSession} className="ml-auto">
              <input type="hidden" name="session_id" value={s.id} />
              <button className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-brand-600"><Trash2 className="h-4 w-4" /> Borrar</button>
            </form>
          )}
        </div>
        {s.estado === "Abierta" && (
          <p className="mt-3 text-xs text-neutral-500">Mientras esté abierta, cada miembro marca su entrada y salida desde «Asistencia». Al terminar, ciérrala, revisa y verifica.</p>
        )}
      </section>

      <section className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-black text-left text-xs uppercase tracking-wide text-neutral-300">
            <tr><th className="px-4 py-3">Miembro</th><th className="px-2">Entrada</th><th className="px-2">Salida</th><th className="px-2">Horas</th><th className="px-2">Observación</th><th className="px-4"></th></tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {members?.map((m) => {
              const r = rec.get(m.id);
              const incompleto = r && (!r.entrada || !r.salida);
              return (
                <tr key={m.id} className={incompleto && !locked ? "bg-amber-50/60" : r ? "" : "text-neutral-400"}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={m.full_name} src={m.avatar_url} size={28} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-800">{m.full_name}</p>
                        {!s.unit_id || scope!.length > 1 ? <p className="text-xs text-neutral-400">{unitName.get(m.unit_id)}</p> : null}
                      </div>
                    </div>
                  </td>
                  <td colSpan={5} className="px-2">
                    <form action={setRecord} className="flex items-center gap-2">
                      <input type="hidden" name="session_id" value={s.id} />
                      <input type="hidden" name="member_id" value={m.id} />
                      <input type="hidden" name="fecha" value={s.fecha} />
                      <input type="time" name="entrada" defaultValue={hhmm(r?.entrada ?? null)} disabled={locked} className={timeCls} />
                      <input type="time" name="salida" defaultValue={hhmm(r?.salida ?? null)} disabled={locked} className={timeCls} />
                      <span className="w-16 font-medium text-neutral-800">{r?.horas ? fmtHours(Number(r.horas)) : r ? "—" : "Ausente"}</span>
                      <input name="observacion" defaultValue={r?.observacion ?? ""} disabled={locked} placeholder={locked ? "" : "Opcional"} className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm disabled:border-transparent disabled:bg-transparent" />
                      {!locked && (
                        <button className="rounded-md bg-black p-1.5 text-white hover:bg-neutral-800" aria-label="Guardar fila" title="Guardar corrección">
                          <Save className="h-4 w-4" />
                        </button>
                      )}
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {!locked && <p className="mt-2 text-xs text-neutral-500">Para corregir una fila cambia las horas y pulsa 💾. Si dejas entrada y salida vacías, la persona queda como ausente.</p>}
    </>
  );
}
