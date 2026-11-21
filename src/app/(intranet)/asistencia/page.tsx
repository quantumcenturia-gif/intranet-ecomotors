import Link from "next/link";
import { connection } from "next/server";
import { ChevronRight, ClipboardCheck, DoorOpen, LogIn, LogOut, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import AttendanceHistory, { HISTORY_SELECT, type HistoryRow } from "@/components/attendance/AttendanceHistory";
import { Badge, Label, btnDark, btnPrimary, card, inputCls } from "@/components/ui";
import { SESSION_STYLES, TIPO_STYLES, dayLabel, hhmm, type AttendanceRecord, type Session } from "@/lib/attendance";
import { requireMe } from "@/lib/me";
import { flattenTree, subtree } from "@/lib/units";
import { markAttendance, openSession } from "./actions";

export default async function AsistenciaPage() {
  await connection();
  const { supabase, member, units, manageable, isAdmin, isManager } = await requireMe();
  const unitName = new Map(units.map((u) => [u.id, u.name]));

  const [{ data: sessions }, { data: mine }, { data: history }] = await Promise.all([
    supabase.from("attendance_sessions").select("*").order("opened_at", { ascending: false }).limit(60).returns<Session[]>(),
    member
      ? supabase.from("attendance_records").select("*").eq("member_id", member.id).returns<AttendanceRecord[]>()
      : Promise.resolve({ data: [] as AttendanceRecord[] }),
    member
      ? supabase.from("attendance_records").select(HISTORY_SELECT).eq("member_id", member.id).order("id", { ascending: false }).limit(200).returns<HistoryRow[]>()
      : Promise.resolve({ data: [] as HistoryRow[] }),
  ]);

  const all = sessions ?? [];
  const myRec = new Map((mine ?? []).map((r) => [r.session_id, r]));
  const eligible = (s: Session) => !!member && (s.unit_id === null || subtree(units, s.unit_id).includes(member.unit_id));
  const openForMe = all.filter((s) => s.estado === "Abierta" && eligible(s));
  const canManage = (s: Session) => (s.unit_id === null ? isAdmin : manageable.has(s.unit_id));
  const managed = all.filter(canManage);
  const unitsForOpen = flattenTree(units, manageable).filter(({ unit }) => unit.id !== "por-asignar");
  const where = (s: Session) => (s.unit_id ? unitName.get(s.unit_id) : "Todo el equipo");

  return (
    <>
      <PageHeader icon={ClipboardCheck} title="Asistencia" subtitle="Marca tu entrada y salida en las sesiones de tu área" />

      {/* Marcar asistencia */}
      <section className="mb-6">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><DoorOpen className="h-5 w-5 text-brand-600" /> Asistencias abiertas para ti</h2>
        {openForMe.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {openForMe.map((s) => {
              const r = myRec.get(s.id);
              return (
                <div key={s.id} className={`${card} border-l-4 border-l-emerald-500 p-5`}>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge className={TIPO_STYLES[s.tipo]}>{s.tipo}</Badge>
                    <span className="text-xs text-neutral-500">{where(s)} · abierta a las {hhmm(s.opened_at)}</span>
                  </div>
                  <p className="font-semibold">{s.titulo}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {!r?.entrada ? (
                      <form action={markAttendance}>
                        <input type="hidden" name="session_id" value={s.id} />
                        <input type="hidden" name="kind" value="entrada" />
                        <button className={btnPrimary}><LogIn className="h-4 w-4" /> Marcar entrada</button>
                      </form>
                    ) : (
                      <span className="text-sm">Entrada: <b>{hhmm(r.entrada)}</b></span>
                    )}
                    {r?.entrada && !r.salida && (
                      <form action={markAttendance}>
                        <input type="hidden" name="session_id" value={s.id} />
                        <input type="hidden" name="kind" value="salida" />
                        <button className={btnDark}><LogOut className="h-4 w-4" /> Marcar salida</button>
                      </form>
                    )}
                    {r?.salida && <span className="text-sm">Salida: <b>{hhmm(r.salida)}</b> · {r.horas} h ✅</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-500">
            {member ? "No hay ninguna asistencia abierta para tu área ahora mismo." : "Tu cuenta aún no está vinculada a tu ficha."}
          </p>
        )}
      </section>

      {/* Abrir y gestionar (directores/encargados y dirección general) */}
      {isManager && (
        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5 [&>*]:min-w-0">
          <form action={openSession} className={`${card} space-y-4 p-5 lg:col-span-2`}>
            <h2 className="flex items-center gap-2 font-semibold"><DoorOpen className="h-5 w-5 text-brand-600" /> Abrir asistencia</h2>
            {isAdmin && (
              <Label label="Tipo">
                <select name="tipo" defaultValue="Área" className={inputCls}>
                  <option value="Área">Asistencia de área</option>
                  <option value="Reunión">Reunión (especial)</option>
                  <option value="Práctica">Práctica (especial)</option>
                </select>
              </Label>
            )}
            <Label label="Para">
              <select name="unit_id" required defaultValue={member?.unit_id && manageable.has(member.unit_id) ? member.unit_id : ""} className={inputCls}>
                {isAdmin && <option value="__todos__">Todo el equipo (solo reuniones y prácticas)</option>}
                {unitsForOpen.map(({ unit, depth }) => (
                  <option key={unit.id} value={unit.id}>{"  ".repeat(depth)}{unit.name}</option>
                ))}
              </select>
            </Label>
            <Label label="Título (opcional)">
              <input name="titulo" placeholder="Ej. Taller del sábado" className={inputCls} />
            </Label>
            <p className="text-xs text-neutral-500">
              Solo puede haber una asistencia abierta por área y, como máximo, una de área por día.
              {isAdmin && " Las reuniones y prácticas especiales solo las abre dirección general."}
            </p>
            <button className={btnPrimary}><DoorOpen className="h-4 w-4" /> Abrir asistencia</button>
          </form>

          <section className={`${card} overflow-hidden lg:col-span-3`}>
            <h2 className="flex items-center gap-2 border-b border-neutral-100 p-4 font-semibold"><Users className="h-5 w-5 text-brand-600" /> Asistencias que gestionas</h2>
            {managed.length ? (
              <ul className="divide-y divide-neutral-100">
                {managed.slice(0, 20).map((s) => (
                  <li key={s.id}>
                    <Link href={`/asistencia/${s.id}`} className="flex items-center gap-3 p-4 hover:bg-neutral-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{s.titulo}</p>
                        <p className="text-xs text-neutral-500">{dayLabel(s.fecha)} · {where(s)}</p>
                      </div>
                      <Badge className={TIPO_STYLES[s.tipo]}>{s.tipo}</Badge>
                      <Badge className={SESSION_STYLES[s.estado]}>{s.estado === "Cerrada" ? "Por verificar" : s.estado}</Badge>
                      <ChevronRight className="h-4 w-4 text-neutral-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-neutral-500">Todavía no has abierto ninguna asistencia.</p>
            )}
          </section>
        </div>
      )}

      {member && <AttendanceHistory rows={history ?? []} />}
    </>
  );
}
