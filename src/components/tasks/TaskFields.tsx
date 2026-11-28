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
  defaultConvocatoria = false,
  participantIds = [],
}: {
  task?: Partial<Task> & { convocatoria?: boolean };
  participantIds?: string[];
  units: Unit[];
  manageable: Set<string>;
  members: Pick<Member, "id" | "full_name" | "unit_id">[];
  projects: { id: string; name: string }[];
  canAssign: boolean;
  defaultConvocatoria?: boolean;
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
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500">¿Cómo se publica?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input type="radio" name="modo" value="convocatoria" defaultChecked={task?.convocatoria ?? defaultConvocatoria} className="mt-1 accent-brand-600" />
                <span>
                  <span className="block text-sm font-semibold">📣 Convocatoria a un área o subárea</span>
                  <span className="block text-xs text-neutral-500">Todos sus integrantes la ven y pulsan «Yo lo voy a hacer». Tú recibes un aviso y eliges a quién aceptas.</span>
                </span>
              </label>
              <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input type="radio" name="modo" value="persona" defaultChecked={!(task?.convocatoria ?? defaultConvocatoria)} className="mt-1 accent-brand-600" />
                <span>
                  <span className="block text-sm font-semibold">👤 Asignar a personas</span>
                  <span className="block text-xs text-neutral-500">Eliges un responsable y, si hace falta, colaboradores.</span>
                </span>
              </label>
            </div>
          </fieldset>
          <Label label="Para el área o subárea">
            <select name="unit_id" required defaultValue={task?.unit_id} className={inputCls}>
              {tree.map(({ unit, depth }) => (
                <option key={unit.id} value={unit.id}>
                  {"\u00a0\u00a0".repeat(depth)}{unit.kind === "subarea" ? "" : "▸ "}{unit.name}
                </option>
              ))}
            </select>
          </Label>
          <Label label="Responsable (si la asignas a una persona)">
            <select name="assignee_id" defaultValue={task?.assignee_id ?? ""} className={inputCls}>
              <option value="">— Nadie todavía —</option>
              {byUnit.map(({ unit, people }) => (
                <optgroup key={unit.id} label={unit.name}>
                  {people.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Label>
          <details className="sm:col-span-2 rounded-lg border border-neutral-300 p-3 open:bg-neutral-50" open={participantIds.length > 0}>
            <summary className="cursor-pointer text-sm font-medium">
              👥 Colaboradores <span className="font-normal text-neutral-500">(opcional · {participantIds.length ? `${participantIds.length} elegidos` : "otras personas que también trabajan en esta tarea"})</span>
            </summary>
            <div className="mt-3 max-h-60 space-y-3 overflow-y-auto pr-1">
              {byUnit.map(({ unit, people }) => (
                <div key={unit.id}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">{unit.name}</p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {people.map((m) => (
                      <label key={m.id} className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-white">
                        <input type="checkbox" name="participantes" value={m.id} defaultChecked={participantIds.includes(m.id)} className="accent-brand-600" />
                        <span className="truncate">{m.full_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </details>
          <Label label="Horas que vale (por persona)">
            <input type="number" name="horas" min={0.5} max={500} step={0.5} defaultValue={task?.horas ?? ""} placeholder="Ej. 8" className={inputCls} />
            <span className="mt-1 block text-xs text-neutral-500">Al validarla se suman solas a cada persona involucrada.</span>
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
