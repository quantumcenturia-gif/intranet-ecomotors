import Link from "next/link";
import { ListChecks, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TaskList from "@/components/tasks/TaskList";
import { btnPrimary, inputCls } from "@/components/ui";
import { TASK_ESTADOS, estadoVisible } from "@/data/eco-motors";
import { requireMe } from "@/lib/me";
import { TASK_SELECT, type TaskRow } from "@/lib/tasks";
import { flattenTree, subtree } from "@/lib/units";

export default async function TareasPage({ searchParams }: PageProps<"/tareas">) {
  const sp = await searchParams;
  const vista = sp.vista === "equipo" ? "equipo" : "mias";
  const unidad = typeof sp.unidad === "string" ? sp.unidad : "";
  const estado = typeof sp.estado === "string" ? sp.estado : "";
  const { supabase, member, units, isManager } = await requireMe();

  let q = supabase.from("tasks").select(TASK_SELECT).order("fecha_limite", { ascending: true, nullsFirst: false }).limit(300);
  if (vista === "mias") q = q.eq("assignee_id", member?.id ?? "00000000-0000-0000-0000-000000000000");
  if (unidad) q = q.in("unit_id", subtree(units, unidad));
  if (estado && estado !== "Atrasada") q = q.eq("estado", estado);
  const { data } = await q.returns<TaskRow[]>();
  let tasks = data ?? [];
  if (estado === "Atrasada") tasks = tasks.filter((t) => estadoVisible(t) === "Atrasada");
  if (!estado) tasks = tasks.filter((t) => !["Completada y validada", "Cancelada"].includes(t.estado));

  const tab = (v: string, label: string) => (
    <Link
      href={`/tareas?vista=${v}`}
      className={`rounded-lg px-4 py-2 text-sm font-medium ${vista === v ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-200"}`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader icon={ListChecks} title="Tareas" subtitle="Asigna, sigue y valida el trabajo de cada subárea" />
        <Link href="/tareas/nueva" className={btnPrimary}>
          <Plus className="h-4 w-4" /> Nueva tarea
        </Link>
      </div>

      {!member && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Tu cuenta aún no está vinculada a tu ficha de integrante. Pide a coordinación que añada tu correo en Administración.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
          {tab("mias", "Mis tareas")}
          {tab("equipo", isManager ? "Mi equipo" : "Mi subárea")}
        </div>
        <form className="flex flex-1 flex-wrap gap-2">
          <input type="hidden" name="vista" value={vista} />
          <select name="unidad" defaultValue={unidad} className={`${inputCls} w-auto`}>
            <option value="">Todas las unidades</option>
            {flattenTree(units).map(({ unit, depth }) => (
              <option key={unit.id} value={unit.id}>
                {"  ".repeat(depth)}{unit.name}
              </option>
            ))}
          </select>
          <select name="estado" defaultValue={estado} className={`${inputCls} w-auto`}>
            <option value="">Abiertas</option>
            {[...TASK_ESTADOS, "Atrasada"].map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <button className="rounded-lg bg-black px-3 py-2 text-sm text-white">Filtrar</button>
        </form>
      </div>

      <TaskList tasks={tasks} empty={vista === "mias" ? "No tienes tareas abiertas 🎉" : "No hay tareas con estos filtros."} />
    </>
  );
}
