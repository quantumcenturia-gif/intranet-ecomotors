import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, BarChart3, ClipboardCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TaskList from "@/components/tasks/TaskList";
import { card } from "@/components/ui";
import { estadoVisible } from "@/data/eco-motors";
import { requireMe } from "@/lib/me";
import { monthRange } from "@/lib/months";
import { TASK_SELECT, type TaskRow } from "@/lib/tasks";
import { flattenTree } from "@/lib/units";

export default async function PanelPage() {
  const { supabase, units, manageable, isManager } = await requireMe();
  if (!isManager) redirect("/");
  const { from, to, label } = monthRange();
  const ids = [...manageable];

  const [{ data: tasks, error }, { data: hours }] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).in("unit_id", ids).order("fecha_limite", { ascending: true, nullsFirst: false }).returns<(TaskRow & { updated_at: string })[]>(),
    supabase.from("time_entries").select("horas,member:members(unit_id)").gte("fecha", from).lt("fecha", to),
  ]);
  if (error) throw new Error(error.message);
  const all = tasks ?? [];

  const rows = flattenTree(units, manageable)
    .map(({ unit, depth }) => {
      const t = all.filter((x) => x.unit_id === unit.id);
      const h = (hours ?? []).reduce((s, e) => {
        const m = Array.isArray(e.member) ? e.member[0] : e.member;
        return m?.unit_id === unit.id ? s + Number(e.horas) : s;
      }, 0);
      const open = t.filter((x) => !["Completada y validada", "Cancelada"].includes(x.estado));
      return {
        unit, depth,
        abiertas: open.length,
        atrasadas: open.filter((x) => estadoVisible(x) === "Atrasada").length,
        revision: t.filter((x) => x.estado === "En revisión").length,
        hechas: t.filter((x) => x.estado === "Completada y validada" && x.updated_at >= from && x.updated_at < to).length,
        avance: open.length ? Math.round(open.reduce((s, x) => s + x.avance, 0) / open.length) : null,
        horas: h,
      };
    })
    .filter((r) => r.unit.kind !== "area" || r.abiertas || r.hechas || r.horas);

  const enRevision = all.filter((t) => t.estado === "En revisión");
  const atrasadas = all.filter((t) => estadoVisible(t) === "Atrasada");
  const n = (v: number, warn = false) => <span className={v ? (warn ? "font-semibold text-brand-600" : "font-semibold") : "text-neutral-300"}>{v}</span>;

  return (
    <>
      <PageHeader icon={BarChart3} title="Panel de supervisión" subtitle={`Estado de tus unidades · ${label}`} />

      <section className={`${card} mb-6 overflow-x-auto`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-black text-left text-xs uppercase tracking-wide text-neutral-300">
            <tr>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-3 py-3 text-right">Abiertas</th>
              <th className="px-3 py-3 text-right">Atrasadas</th>
              <th className="px-3 py-3 text-right">En revisión</th>
              <th className="px-3 py-3 text-right">Validadas (mes)</th>
              <th className="px-3 py-3">Avance medio</th>
              <th className="px-4 py-3 text-right">Horas (mes)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => (
              <tr key={r.unit.id} className={r.unit.kind === "subarea" ? "" : "bg-neutral-50 font-medium"}>
                <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + r.depth * 16}px` }}>
                  <Link href={`/tareas?vista=equipo&unidad=${r.unit.id}`} className="hover:text-brand-600">{r.unit.name}</Link>
                </td>
                <td className="px-3 text-right">{n(r.abiertas)}</td>
                <td className="px-3 text-right">{n(r.atrasadas, true)}</td>
                <td className="px-3 text-right">{n(r.revision, true)}</td>
                <td className="px-3 text-right">{n(r.hechas)}</td>
                <td className="px-3">
                  {r.avance === null ? <span className="text-neutral-300">—</span> : (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-brand-600" style={{ width: `${r.avance}%` }} /></div>
                      <span className="text-xs text-neutral-500">{r.avance}%</span>
                    </div>
                  )}
                </td>
                <td className="px-4 text-right">{r.horas ? `${Number(r.horas.toFixed(1))} h` : <span className="text-neutral-300">0</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ClipboardCheck className="h-5 w-5 text-brand-600" /> Esperando tu revisión ({enRevision.length})</h2>
          <TaskList tasks={enRevision} empty="No hay entregas pendientes de revisar." />
        </section>
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5 text-brand-600" /> Atrasadas ({atrasadas.length})</h2>
          <TaskList tasks={atrasadas} empty="Ninguna tarea atrasada 👏" />
        </section>
      </div>
    </>
  );
}
