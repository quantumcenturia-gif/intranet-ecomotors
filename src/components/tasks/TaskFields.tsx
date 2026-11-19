import { Label, inputCls } from "@/components/ui";
import { PRIORIDADES, TASK_TIPOS } from "@/data/eco-motors";
import type { Member } from "@/lib/me";
import type { Task } from "@/lib/tasks";
import { flattenTree, type Unit } from "@/lib/units";

/** Campos comunes del formulario de tarea (crear y editar). */
export default function TaskFields({
  task,
  units,
  manageable,
  members,
  projects,
  canAssign,
}: {
  task?: Partial<Task>;
  units: Unit[];
  manageable: Set<string>;
  members: Pick<Member, "id" | "full_name" | "unit_id">[];
  projects: { id: string; name: string }[];
  canAssign: boolean;
}) {
  const tree = flattenTree(units, canAssign ? manageable : undefined);
  const byUnit = flattenTree(units)
    .map(({ unit }) => ({ unit, people: members.filter((m) => m.unit_id === unit.id) }))
    .filter((g) => g.people.length);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Label label="Título" className="sm:col-span-2">
        <input name="title" required defaultValue={task?.title} className={inputCls} placeholder="Ej. Diseñar soporte del motor" />
      </Label>
      <Label label="Objetivo y criterios de aceptación" className="sm:col-span-2">
        <textarea name="description" rows={4} defaultValue={task?.description ?? ""} className={inputCls} placeholder="¿Qué hay que entregar y cómo sabremos que está bien?" />
      </Label>

      {canAssign && (
        <>
          <Label label="Unidad">
            <select name="unit_id" required defaultValue={task?.unit_id} className={inputCls}>
              {tree.map(({ unit, depth }) => (
                <option key={unit.id} value={unit.id}>
                  {"  ".repeat(depth)}{unit.name}
                </option>
              ))}
            </select>
          </Label>
          <Label label="Responsable">
            <select name="assignee_id" defaultValue={task?.assignee_id ?? ""} className={inputCls}>
              <option value="">Sin asignar</option>
              {byUnit.map(({ unit, people }) => (
                <optgroup key={unit.id} label={unit.name}>
                  {people.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Label>
          <Label label="Tipo de tarea">
            <select name="tipo" defaultValue={task?.tipo ?? "Del encargado"} className={inputCls}>
              {TASK_TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Label>
        </>
      )}

      <Label label="Prioridad">
        <select name="prioridad" defaultValue={task?.prioridad ?? "MEDIA"} className={inputCls}>
          {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Label>
      <Label label="Fecha límite">
        <input type="date" name="fecha_limite" defaultValue={task?.fecha_limite ?? ""} className={inputCls} />
      </Label>
      <Label label="Proyecto">
        <select name="project_id" defaultValue={task?.project_id ?? ""} className={inputCls}>
          <option value="">— Ninguno —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Label>
    </div>
  );
}
