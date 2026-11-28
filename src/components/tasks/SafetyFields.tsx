import { Label, inputCls } from "@/components/ui";
import { EPP, PELIGROS, RIESGOS, RIESGO_INFO, toLimaInput } from "@/lib/safety";
import type { Task } from "@/lib/tasks";

/** Sección «Seguridad» del formulario de tarea: riesgo, peligros, EPP y cuándo/dónde se hará el trabajo. */
export default function SafetyFields({ task }: { task?: Partial<Task> }) {
  const riesgo = task?.riesgo ?? "Bajo";
  const peligros = task?.peligros ?? [];
  const epp = task?.epp ?? [];
  return (
    <fieldset className="space-y-4 rounded-lg border border-amber-300 bg-amber-50/50 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold">🦺 Seguridad</legend>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Nivel de riesgo del trabajo</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {RIESGOS.map((r) => (
            <label key={r} className="flex cursor-pointer gap-3 rounded-lg border border-neutral-300 bg-white p-3 has-[:checked]:border-amber-600 has-[:checked]:ring-1 has-[:checked]:ring-amber-600">
              <input type="radio" name="riesgo" value={r} defaultChecked={riesgo === r} className="mt-1 accent-amber-600" />
              <span>
                <span className="block text-sm font-semibold">{r}</span>
                <span className="block text-xs text-neutral-500">{RIESGO_INFO[r]}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <details open={peligros.length > 0 || epp.length > 0}>
        <summary className="cursor-pointer text-sm font-medium">Peligros y EPP necesario <span className="font-normal text-neutral-500">(si marcas un peligro, el riesgo sube solo al mínimo que exige)</span></summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Peligros</p>
            {PELIGROS.map((p) => (
              <label key={p.nombre} className="flex items-center gap-2 py-0.5 text-sm">
                <input type="checkbox" name="peligros" value={p.nombre} defaultChecked={peligros.includes(p.nombre)} className="accent-amber-600" />
                <span>{p.nombre}</span>
                {p.minimo !== "Bajo" && <span className="text-[10px] text-neutral-400">(mín. {p.minimo.toLowerCase()})</span>}
              </label>
            ))}
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">EPP obligatorio</p>
            {EPP.map((e) => (
              <label key={e} className="flex items-center gap-2 py-0.5 text-sm">
                <input type="checkbox" name="epp" value={e} defaultChecked={epp.includes(e)} className="accent-amber-600" />
                {e}
              </label>
            ))}
          </div>
        </div>
      </details>
      <div className="grid gap-3 sm:grid-cols-3">
        <Label label="Inicio del trabajo">
          <input type="datetime-local" name="trabajo_inicio" defaultValue={toLimaInput(task?.trabajo_inicio)} className={inputCls} />
        </Label>
        <Label label="Fin estimado">
          <input type="datetime-local" name="trabajo_fin" defaultValue={toLimaInput(task?.trabajo_fin)} className={inputCls} />
        </Label>
        <Label label="Lugar">
          <input name="trabajo_lugar" defaultValue={task?.trabajo_lugar ?? ""} placeholder="Ej. Taller FIM" className={inputCls} />
        </Label>
      </div>
      <p className="text-xs text-neutral-600">
        Si el riesgo es <b>medio o mayor</b>, Seguridad debe aprobar el trabajo (la fecha, el lugar y el EPP) antes de empezar. Indica cuándo y dónde se hará.
      </p>
    </fieldset>
  );
}
