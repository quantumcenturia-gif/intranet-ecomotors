import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, CalendarCheck2, CheckCircle2, Clock, ListChecks, Target, Timer, Trophy } from "lucide-react";
import AttendanceHistory, { HISTORY_SELECT, type HistoryRow } from "@/components/attendance/AttendanceHistory";
import BarChart from "@/components/charts/BarChart";
import TrendBadge from "@/components/pilots/TrendBadge";
import TaskList from "@/components/tasks/TaskList";
import { card } from "@/components/ui";
import { estadoVisible } from "@/data/eco-motors";
import { fmtHours, weeklyHours } from "@/lib/attendance";
import type { Member } from "@/lib/me";
import { RUN_SELECT, bestByDay, fmtLap, type PilotRun } from "@/lib/pilots";
import { TASK_SELECT, type TaskRow } from "@/lib/tasks";
import { subtree, type Unit } from "@/lib/units";

const CLOSED = ["Completada y validada", "Cancelada"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

/** Panel personal de un miembro: avance de tareas, asistencia, horas y (si es piloto) sus tiempos. */
export default async function MemberDashboard({
  supabase, m, units, isSelf,
}: {
  supabase: SupabaseClient;
  m: Member;
  units: Unit[];
  isSelf: boolean;
}) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const sinceDate = new Date(today + "T12:00:00Z");
  sinceDate.setUTCDate(sinceDate.getUTCDate() - 90);
  const since = sinceDate.toISOString().slice(0, 10);
  const isPilot = m.unit_id === "pilotos";

  const [{ data: tasksData }, { data: history }, { data: sessions }, { data: marks }, { data: runsData }] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).eq("assignee_id", m.id).order("fecha_limite", { ascending: true, nullsFirst: false }).returns<TaskRow[]>(),
    supabase.from("attendance_records").select(HISTORY_SELECT).eq("member_id", m.id).order("id", { ascending: false }).limit(200).returns<HistoryRow[]>(),
    supabase.from("attendance_sessions").select("id,unit_id,fecha,estado").gte("fecha", since).neq("estado", "Abierta"),
    supabase.from("attendance_records").select("session_id,entrada").eq("member_id", m.id).not("entrada", "is", null),
    isPilot
      ? supabase.from("pilot_runs").select(RUN_SELECT).eq("piloto_id", m.id).order("fecha").order("intento").returns<PilotRun[]>()
      : Promise.resolve({ data: [] as PilotRun[] }),
  ]);

  const tasks = tasksData ?? [];
  const open = tasks.filter((t) => !CLOSED.includes(t.estado));
  const late = open.filter((t) => estadoVisible(t) === "Atrasada");
  const done = tasks.filter((t) => t.estado === "Completada y validada");
  const avance = open.length ? Math.round(open.reduce((a, t) => a + t.avance, 0) / open.length) : null;

  // Tareas validadas por mes (últimos 6 meses)
  const now = new Date(today + "T12:00:00");
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTHS[d.getMonth()] };
  });
  const perMonth = months.map((mo) => ({ ...mo, value: done.filter((t) => (t.revisado_at ?? t.updated_at).slice(0, 7) === mo.key).length }));

  // Asistencia de los últimos 90 días: sesiones a las que estaba convocado/a
  const rows = history ?? [];
  const attended = new Set((marks ?? []).map((r) => r.session_id as number));
  const convocadas = (sessions ?? []).filter((s) => s.unit_id === null || subtree(units, s.unit_id).includes(m.unit_id));
  const asistidas = convocadas.filter((s) => attended.has(s.id)).length;
  const pct = convocadas.length ? Math.round((asistidas / convocadas.length) * 100) : null;
  const week = weeklyHours(
    rows.filter((r) => r.session).map((r) => ({ fecha: r.session!.fecha, horas: r.horas, verificada: r.session!.estado === "Verificada" })),
    1,
  )[0];

  const runs = runsData ?? [];
  const pilotDays = bestByDay(runs);
  const record = pilotDays.length ? Math.min(...pilotDays.map((d) => d.best)) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={ListChecks} label="Tareas abiertas" value={String(open.length)} sub={late.length ? `${late.length} atrasada${late.length > 1 ? "s" : ""}` : "Ninguna atrasada"} warn={late.length > 0} />
        <Kpi icon={CheckCircle2} label="Tareas completadas" value={String(done.length)} sub={`${perMonth.at(-1)!.value} este mes`} />
        <Kpi icon={CalendarCheck2} label="Asistencia (90 días)" value={pct === null ? "—" : `${pct} %`} sub={convocadas.length ? `${asistidas} de ${convocadas.length} sesiones` : "Sin sesiones aún"} />
        <Kpi icon={Clock} label="Horas esta semana" value={fmtHours(week.verificadas + week.pendientes)} sub={week.pendientes ? `${fmtHours(week.pendientes)} por verificar` : "Asistencias del área"} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <section className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold"><Target className="h-5 w-5 text-brand-600 animate-float" /> {isSelf ? "Mi avance" : "Avance"}</h2>
            {avance !== null && <ProgressMeter value={avance} />}
          </div>
          <TaskList tasks={open.slice(0, 6)} empty={isSelf ? "No tienes tareas abiertas 🎉" : "No tiene tareas abiertas."} />
          {open.length > 6 && <Link href="/tareas" className="mt-2 inline-block text-sm text-brand-600 hover:underline">Ver las {open.length} tareas →</Link>}
        </section>
        <section className={`${card} p-5`}>
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-brand-600" /> Tareas completadas</h2>
          <p className="mb-3 text-xs text-neutral-500">Validadas por mes (últimos 6 meses)</p>
          {done.length ? (
            <BarChart data={perMonth} caption="Tareas completadas y validadas por mes" />
          ) : (
            <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">Cuando se valide una tarea aparecerá aquí 🏁</p>
          )}
        </section>
      </div>

      {isPilot && (
        <Link href={`/pilotos/${m.id}`} className="group flex flex-wrap items-center gap-4 overflow-hidden rounded-xl bg-black p-5 text-white transition hover:shadow-lg">
          <div className="checkered animate-flag h-12 w-3 rounded-sm" />
          <Timer className="h-8 w-8 text-brand-500 group-hover:animate-wiggle" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-neutral-400">{isSelf ? "Mis tiempos de piloto" : "Tiempos de piloto"}</p>
            <p className="flex items-center gap-2 text-xl font-bold"><Trophy className="h-5 w-5 text-amber-400" /> Récord: {fmtLap(record)}</p>
            <p className="text-sm text-neutral-400">{runs.length} intento{runs.length === 1 ? "" : "s"} registrados</p>
          </div>
          <div className="[&_span]:bg-white/10 [&_span]:text-white"><TrendBadge days={pilotDays} /></div>
          <span className="flex items-center gap-1 text-sm font-medium text-brand-400">Ver curvas de avance <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </Link>
      )}

      <AttendanceHistory rows={rows} title={isSelf ? "Mi asistencia" : "Asistencia y horas semanales"} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, warn }: { icon: typeof Clock; label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`${card} group animate-rise p-4`}>
      <p className="mb-1 flex items-center gap-1.5 text-xs text-neutral-500"><Icon className="h-4 w-4 text-brand-600 group-hover:animate-wiggle" /> {label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className={`text-xs ${warn ? "font-medium text-brand-700" : "text-neutral-500"}`}>{warn ? "⚠️ " : ""}{sub}</p>}
    </div>
  );
}

/** Medidor del avance medio de las tareas abiertas. */
function ProgressMeter({ value }: { value: number }) {
  return (
    <div className="flex min-w-48 items-center gap-3" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Avance medio de las tareas abiertas">
      <span className="text-xs text-neutral-500">Avance medio</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-700" style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-semibold">{value} %</span>
    </div>
  );
}
