import Link from "next/link";
import { connection } from "next/server";
import { ChevronLeft, ChevronRight, Clock, Plus, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { Label, btnPrimary, card, inputCls } from "@/components/ui";
import { requireMe } from "@/lib/me";
import { monthRange, shiftMonth, todayLima } from "@/lib/months";
import { addHours, deleteHours } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const fmtH = (n: number) => `${Number(n.toFixed(2))} h`;

export default async function HorasPage({ searchParams }: PageProps<"/horas">) {
  await connection();
  const sp = await searchParams;
  const { month, from, to, label } = monthRange(typeof sp.mes === "string" ? sp.mes : undefined);
  const { supabase, member, manageable, isManager, units } = await requireMe();

  const [{ data: entries }, { data: myTasks }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id,fecha,horas,actividad,member_id,origen,task:tasks(id,title),member:members(id,full_name,avatar_url,unit_id)")
      .gte("fecha", from)
      .lt("fecha", to)
      .order("fecha", { ascending: false }),
    member
      ? supabase.from("tasks").select("id,title").eq("assignee_id", member.id).not("estado", "in", "(Completada y validada,Cancelada)")
      : Promise.resolve({ data: [] as { id: number; title: string }[] }),
  ]);

  type Entry = NonNullable<typeof entries>[number];
  const one = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] : x);
  const mine = (entries ?? []).filter((e) => e.member_id === member?.id);
  const myTotal = mine.reduce((s, e) => s + Number(e.horas), 0);

  // Resumen del equipo (solo gestores): horas por persona en las unidades que gestiona
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const team = new Map<string, { name: string; avatar: string | null; unit: string; total: number; n: number }>();
  if (isManager) {
    for (const e of entries ?? ([] as Entry[])) {
      const m = one(e.member);
      if (!m || !manageable.has(m.unit_id)) continue;
      const row = team.get(m.id) ?? { name: m.full_name, avatar: m.avatar_url, unit: unitName.get(m.unit_id) ?? "", total: 0, n: 0 };
      row.total += Number(e.horas);
      row.n += 1;
      team.set(m.id, row);
    }
  }
  const teamRows = [...team.values()].sort((a, b) => b.total - a.total);
  const maxTeam = Math.max(1, ...teamRows.map((r) => r.total));

  return (
    <>
      <PageHeader icon={Clock} title="Registro de horas" subtitle="Lo que dedicas al semillero · las tareas validadas suman sus horas solas" />

      <div className="mb-6 flex items-center gap-2">
        <Link href={`/horas?mes=${shiftMonth(month, -1)}`} className="rounded-lg p-2 hover:bg-neutral-200" aria-label="Mes anterior"><ChevronLeft className="h-5 w-5" /></Link>
        <span className="min-w-40 text-center font-semibold first-letter:uppercase">{label}</span>
        <Link href={`/horas?mes=${shiftMonth(month, 1)}`} className="rounded-lg p-2 hover:bg-neutral-200" aria-label="Mes siguiente"><ChevronRight className="h-5 w-5" /></Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          {member ? (
            <form action={addHours} className={`${card} grid gap-4 p-5 sm:grid-cols-[auto_auto_minmax(0,1fr)]`}>
              <Label label="Fecha"><input name="fecha" type="date" required defaultValue={todayLima()} className={inputCls} /></Label>
              <Label label="Horas"><input name="horas" type="number" step="0.25" min="0.25" max="24" required placeholder="2" className={`${inputCls} w-24`} /></Label>
              <Label label="Tarea (opcional)">
                <select name="task_id" defaultValue="" className={inputCls}>
                  <option value="">— Sin tarea —</option>
                  {myTasks?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </Label>
              <Label label="¿Qué hiciste?" className="sm:col-span-3"><input name="actividad" required placeholder="Ej. Soldadura de soportes en taller" className={inputCls} /></Label>
              <div><SubmitButton className={btnPrimary}><Plus className="h-4 w-4" /> Registrar</SubmitButton></div>
            </form>
          ) : (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">Tu cuenta aún no está vinculada a tu ficha. Pide a coordinación que añada tu correo.</p>
          )}

          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-neutral-100 p-4">
              <h2 className="font-semibold">Mis horas</h2>
              <span className="rounded-full bg-black px-3 py-1 text-sm font-semibold text-white">{fmtH(myTotal)}</span>
            </div>
            {mine.length ? (
              <ul className="divide-y divide-neutral-100">
                {mine.map((e) => {
                  const task = one(e.task);
                  return (
                    <li key={e.id} className="flex items-center gap-3 p-4">
                      <span className="w-16 shrink-0 text-xs text-neutral-500">{new Date(e.fecha + "T12:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          {e.origen === "tarea" && <span className="mr-1.5 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">✅ Automática</span>}
                          {e.actividad}
                        </p>
                        {task && <Link href={`/tareas/${task.id}`} className="text-xs text-brand-600 hover:underline">{task.title}</Link>}
                      </div>
                      <span className="font-semibold">{fmtH(Number(e.horas))}</span>
                      {e.origen === "tarea" ? (
                        <span className="w-4" title="Sumada al validar la tarea" />
                      ) : (
                        <form action={deleteHours}>
                          <input type="hidden" name="id" value={e.id} />
                          <SubmitButton aria-label="Borrar" className="text-neutral-300 hover:text-brand-600"><Trash2 className="h-4 w-4" /></SubmitButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-5 text-sm text-neutral-500">Aún no has registrado horas este mes.</p>
            )}
          </section>
        </div>

        {isManager && (
          <section className={`${card} h-fit p-5`}>
            <h2 className="mb-1 font-semibold">Horas de mi equipo</h2>
            <p className="mb-4 text-xs text-neutral-500">Total del mes por persona</p>
            {teamRows.length ? (
              <ul className="stagger space-y-3">
                {teamRows.map((r) => (
                  <li key={r.name}>
                    <div className="flex items-center gap-2">
                      <Avatar name={r.name} src={r.avatar} size={28} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="truncate text-xs text-neutral-500">{r.unit} · {r.n} registros</p>
                      </div>
                      <span className="text-sm font-semibold">{fmtH(r.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className="grow-x h-full bg-brand-600" style={{ width: `${(r.total / maxTeam) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Nadie de tu equipo ha registrado horas este mes.</p>
            )}
          </section>
        )}
      </div>
    </>
  );
}
