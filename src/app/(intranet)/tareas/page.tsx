import Link from "next/link";
import { ChevronDown, ListChecks, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TaskList from "@/components/tasks/TaskList";
import { Badge, btnPrimary, selectSm } from "@/components/ui";
import { TASK_ESTADOS, estadoVisible } from "@/data/eco-motors";
import { requireMe } from "@/lib/me";
import { TASK_SELECT, mineFilter, participantTaskIds, type TaskRow } from "@/lib/tasks";
import { flattenTree, subtree, unitPath } from "@/lib/units";
import SubmitButton from "@/components/SubmitButton";

const OPEN = (t: TaskRow) => !["Completada y validada", "Cancelada"].includes(t.estado);

export default async function TareasPage({ searchParams }: PageProps<"/tareas">) {
  const sp = await searchParams;
  const vistas = ["mias", "convocatorias", "equipo", "areas"] as const;
  const vista = (vistas as readonly string[]).includes(String(sp.vista)) ? (sp.vista as (typeof vistas)[number]) : "mias";
  const unidad = typeof sp.unidad === "string" ? sp.unidad : "";
  const estado = typeof sp.estado === "string" ? sp.estado : "";
  const { supabase, member, units, manageable, isManager } = await requireMe();

  let q = supabase.from("tasks").select(TASK_SELECT).order("fecha_limite", { ascending: true, nullsFirst: false }).limit(500);
  if (vista === "mias") q = q.or(mineFilter(member?.id ?? "00000000-0000-0000-0000-000000000000", await participantTaskIds(supabase, member?.id)));
  if (vista === "convocatorias") q = q.eq("convocatoria", true);
  if (unidad && vista !== "areas") q = q.in("unit_id", subtree(units, unidad));
  if (estado && estado !== "Atrasada") q = q.eq("estado", estado);
  const { data, error } = await q.returns<TaskRow[]>();
  if (error) throw new Error(error.message);
  let tasks = data ?? [];
  if (estado === "Atrasada") tasks = tasks.filter((t) => estadoVisible(t) === "Atrasada");
  if (!estado) tasks = tasks.filter(OPEN);

  // Convocatorias abiertas para mí (para el contador de la pestaña)
  const myBranch = member ? unitPath(units, member.unit_id).map((u) => u.id) : [];
  const { count: convCount } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("convocatoria", true)
    .not("estado", "in", "(Completada y validada,Cancelada)")
    .in("unit_id", myBranch.length ? myBranch : ["-"]);

  const tab = (v: string, label: string, badge?: number) => (
    <Link href={`/tareas?vista=${v}`} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition duration-200 active:scale-95 ${vista === v ? "bg-black text-white shadow-md" : "text-neutral-600 hover:bg-neutral-200"}`}>
      {label}
      {!!badge && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{badge}</span>}
    </Link>
  );

  // Vista escalonada: Área → Subárea → tareas principales de cada unidad
  const treeUnits = flattenTree(units, isManager ? manageable : new Set(myBranch));
  const byUnit = new Map<string, TaskRow[]>();
  const ids = new Set(tasks.map((t) => t.id));
  for (const t of tasks) {
    if (t.parent_id && ids.has(t.parent_id) && tasks.find((p) => p.id === t.parent_id)?.unit_id === t.unit_id) continue; // las subtareas se ven dentro de su madre
    byUnit.set(t.unit_id, [...(byUnit.get(t.unit_id) ?? []), t]);
  }
  const countIn = (unitId: string) => {
    const set = new Set(subtree(units, unitId));
    const list = tasks.filter((t) => set.has(t.unit_id));
    return { total: list.length, atrasadas: list.filter((t) => estadoVisible(t) === "Atrasada").length, conv: list.filter((t) => t.convocatoria).length };
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader icon={ListChecks} title="Tareas" subtitle="Publica convocatorias para un área, asigna y sigue el avance" />
        {(isManager || member) && (
          <Link href="/tareas/nueva" className={btnPrimary}>
            <Plus className="h-4 w-4" /> {isManager ? "Publicar tarea" : "Nueva tarea propia"}
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1">
          {tab("mias", "Mis tareas")}
          {tab("convocatorias", "📣 Convocatorias", convCount ?? 0)}
          {tab("equipo", isManager ? "Mi equipo" : "Mi subárea")}
          {tab("areas", "Por áreas")}
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="vista" value={vista} />
          {vista !== "areas" && (
            <select name="unidad" defaultValue={unidad} className={selectSm}>
              <option value="">Todas las unidades</option>
              {flattenTree(units).map(({ unit, depth }) => (
                <option key={unit.id} value={unit.id}>{"  ".repeat(depth)}{unit.name}</option>
              ))}
            </select>
          )}
          <select name="estado" defaultValue={estado} className={selectSm}>
            <option value="">Abiertas</option>
            {[...TASK_ESTADOS, "Atrasada"].map((e) => <option key={e}>{e}</option>)}
          </select>
          <SubmitButton className="rounded-lg bg-black px-3 py-2 text-sm text-white">Filtrar</SubmitButton>
        </form>
      </div>

      {!member && !isManager && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Tu cuenta aún no está vinculada a tu ficha de integrante.</p>
      )}

      {vista === "convocatorias" && (
        <p className="mb-3 text-sm text-neutral-600">
          Tareas publicadas para tu área o subárea. Ábrela y pulsa <b>«🙋 Yo lo voy a hacer»</b> para apuntarte.
        </p>
      )}

      {vista === "areas" ? (
        <div className="stagger space-y-3">
          {treeUnits.map(({ unit, depth }) => {
            const c = countIn(unit.id);
            const own = byUnit.get(unit.id) ?? [];
            return (
              <details key={unit.id} open={depth === 0 || own.length > 0} style={{ marginLeft: depth * 20 }} className="group rounded-xl border border-neutral-200 bg-white">
                <summary className="no-chevron flex cursor-pointer list-none items-center gap-3 rounded-xl p-4 transition hover:bg-neutral-50">
                  <ChevronDown className="h-4 w-4 text-neutral-400 transition group-open:rotate-0 -rotate-90" />
                  <span className={`font-semibold ${depth === 0 ? "text-base" : "text-sm"}`}>{unit.name}</span>
                  <span className="text-xs text-neutral-400">{unit.kind === "area" ? "Área" : unit.kind === "supervision" ? "Supervisión" : "Subárea"}</span>
                  <span className="ml-auto flex gap-1.5">
                    <Badge className="bg-neutral-100 text-neutral-700">{c.total} abiertas</Badge>
                    {c.conv > 0 && <Badge className="bg-brand-100 text-brand-700">📣 {c.conv}</Badge>}
                    {c.atrasadas > 0 && <Badge className="bg-brand-600 text-white">{c.atrasadas} atrasadas</Badge>}
                  </span>
                </summary>
                {own.length > 0 && (
                  <div className="border-t border-neutral-100 p-3">
                    <TaskList tasks={own} empty="" />
                  </div>
                )}
              </details>
            );
          })}
          {!treeUnits.length && <p className="text-sm text-neutral-500">No hay áreas para mostrar.</p>}
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          empty={vista === "mias" ? "No tienes tareas abiertas 🎉" : vista === "convocatorias" ? "No hay convocatorias abiertas para tu área." : "No hay tareas con estos filtros."}
        />
      )}
    </>
  );
}
