import { HardHat } from "lucide-react";
import { Badge, Label, btnPrimary, card, inputCls } from "@/components/ui";
import { PERMISO_ICON, PERMISO_STYLES, RIESGOS, RIESGO_STYLES, fmtFechaHora, necesitaPermiso } from "@/lib/safety";
import type { TaskRow } from "@/lib/tasks";
import { safetyDecide } from "@/app/(intranet)/tareas/actions";

/** Ficha de seguridad de una tarea: riesgo, permiso de trabajo, EPP y, para Seguridad, la decisión. */
export default function SafetyPanel({ task, isSafety, approver }: { task: TaskRow; isSafety: boolean; approver?: string | null }) {
  const permiso = necesitaPermiso(task.riesgo);
  const hasInfo = permiso || task.peligros?.length || task.epp?.length || task.trabajo_lugar;
  if (!hasInfo && !isSafety) return null;

  return (
    <section className={`${card} p-6 ${task.seguridad_estado === "Rechazada" ? "border-l-4 border-l-red-600" : permiso ? "border-l-4 border-l-amber-500" : ""}`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><HardHat className="h-5 w-5 text-amber-600 animate-float" /> Seguridad</h2>
        <Badge className={RIESGO_STYLES[task.riesgo]}>Riesgo {task.riesgo.toLowerCase()}</Badge>
        {permiso && <Badge className={PERMISO_STYLES[task.seguridad_estado]}>{PERMISO_ICON[task.seguridad_estado]} {task.seguridad_estado === "Pendiente" ? "Permiso pendiente" : task.seguridad_estado}</Badge>}
      </div>

      {permiso && task.seguridad_estado === "Pendiente" && (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">⏳ Seguridad debe aprobar este trabajo. Hasta entonces no se puede empezar ni validar.</p>
      )}
      {task.seguridad_estado === "Rechazada" && (
        <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">⛔ <b>Trabajo detenido por Seguridad:</b> {task.seguridad_obs}</p>
      )}
      {(task.seguridad_estado === "Aprobada" || task.seguridad_estado === "Aprobada con condiciones") && (
        <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
          ✅ Aprobado por <b>{approver ?? "Seguridad"}</b>{task.seguridad_at ? ` · ${fmtFechaHora(task.seguridad_at)}` : ""}
          {task.seguridad_obs && <p className="mt-1"><b>Condiciones:</b> {task.seguridad_obs}</p>}
        </div>
      )}
      {!permiso && <p className="mb-3 text-sm text-neutral-500">Riesgo bajo: no necesita permiso de Seguridad.</p>}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {(task.trabajo_inicio || task.trabajo_lugar) && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">Cuándo y dónde</dt>
            <dd>{fmtFechaHora(task.trabajo_inicio)}{task.trabajo_fin ? ` → ${fmtFechaHora(task.trabajo_fin)}` : ""}{task.trabajo_lugar ? ` · ${task.trabajo_lugar}` : ""}</dd>
          </div>
        )}
        {task.peligros?.length > 0 && (
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">Peligros</dt>
            <dd className="mt-1 flex flex-wrap gap-1">{task.peligros.map((p) => <Badge key={p} className="bg-amber-100 text-amber-900">⚠️ {p}</Badge>)}</dd>
          </div>
        )}
        {task.epp?.length > 0 && (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-neutral-400">EPP obligatorio</dt>
            <dd className="mt-1 flex flex-wrap gap-1">{task.epp.map((e) => <Badge key={e} className="bg-neutral-900 text-white">🦺 {e}</Badge>)}</dd>
          </div>
        )}
      </dl>

      {isSafety && (
        <form key={`s-${task.updated_at}`} action={safetyDecide} className="mt-4 space-y-3 rounded-lg border border-amber-300 bg-amber-50/40 p-4">
          <input type="hidden" name="id" value={task.id} />
          <p className="text-sm font-semibold">Decisión de Seguridad</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["Aprobada", "✅ Aprobar"],
              ["Aprobada con condiciones", "✅ Aprobar con condiciones"],
              ["Rechazada", "⛔ No aprobar / detener"],
              ["Pendiente", "⏳ Dejar pendiente"],
            ].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm has-[:checked]:border-amber-600">
                <input type="radio" name="decision" value={v} defaultChecked={v === (task.seguridad_estado === "No requiere" ? "Aprobada" : task.seguridad_estado)} className="accent-amber-600" /> {l}
              </label>
            ))}
          </div>
          <Label label="Condiciones o motivo (obligatorio si hay condiciones o si no se aprueba)">
            <textarea name="obs" rows={2} defaultValue={task.seguridad_obs ?? ""} placeholder="Ej. Extintor a menos de 3 m, biombo, una persona vigilando" className={inputCls} />
          </Label>
          <Label label="Reclasificar el riesgo (opcional)">
            <select name="riesgo" defaultValue="" className={inputCls}>
              <option value="">Mantener «{task.riesgo}»</option>
              {RIESGOS.filter((r) => r !== task.riesgo).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Label>
          <button className={btnPrimary}>Guardar decisión</button>
        </form>
      )}
    </section>
  );
}
