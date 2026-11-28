import { redirect } from "next/navigation";
import { Eye } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Label, btnPrimary, card, inputCls } from "@/components/ui";
import { requireMe } from "@/lib/me";
import { flattenTree } from "@/lib/units";
import { startPreview, stopPreview } from "./actions";
import SubmitButton from "@/components/SubmitButton";

const ROLES = [
  { rol: "Supervisor/a", desc: "Ve y gestiona toda su rama (p. ej. Mecánica con sus 3 subáreas): publica tareas y convocatorias, valida, abre asistencias y ve reportes." },
  { rol: "Encargado/a", desc: "Director/a de una subárea: gestiona solo su subárea, verifica asistencias y valida entregas." },
  { rol: "Integrante", desc: "Ve sus tareas, las convocatorias de su área, marca asistencia y registra horas." },
];

export default async function VistaPreviaPage() {
  const { realAdmin, preview, member, units } = await requireMe();
  if (!realAdmin) redirect("/");

  return (
    <>
      <PageHeader icon={Eye} title="Ver como…" subtitle="Comprueba qué ve y qué puede hacer cada rol, con sus permisos reales" />
      {preview && (
        <form action={stopPreview} className={`${card} mb-6 flex flex-wrap items-center gap-3 border-l-4 border-l-brand-600 p-4`}>
          <p className="flex-1 text-sm">Ahora estás viendo la intranet como <b>{member?.rol}</b> de <b>{units.find((u) => u.id === member?.unit_id)?.name}</b>.</p>
          <SubmitButton className="rounded-lg bg-black px-4 py-2 text-sm text-white">Volver a mi cuenta</SubmitButton>
        </form>
      )}
      <form action={startPreview} className={`${card} max-w-2xl space-y-5 p-6`}>
        <fieldset>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Rol</legend>
          <div className="space-y-2">
            {ROLES.map((r, i) => (
              <label key={r.rol} className="flex cursor-pointer gap-3 rounded-lg border border-neutral-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input type="radio" name="rol" value={r.rol} defaultChecked={i === 2} className="mt-1 accent-brand-600" />
                <span><span className="block text-sm font-semibold">{r.rol === "Encargado/a" ? "Director/a o encargado/a de subárea" : r.rol}</span><span className="text-xs text-neutral-500">{r.desc}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <Label label="De qué área o subárea">
          <select name="unit_id" defaultValue="estructuras" className={inputCls}>
            {flattenTree(units).filter(({ unit }) => unit.id !== "coordinacion").map(({ unit, depth }) => (
              <option key={unit.id} value={unit.id}>{"  ".repeat(depth)}{unit.name}</option>
            ))}
          </select>
        </Label>
        <p className="text-xs text-neutral-500">
          Usa una ficha de prueba invisible para el resto del equipo. Lo que hagas en la vista previa (marcar asistencia, apuntarte a una
          convocatoria…) queda a nombre de «Vista previa» y se borra al salir.
        </p>
        <SubmitButton className={btnPrimary} pendingText="Cargando…"><Eye className="h-4 w-4" /> Ver la intranet así</SubmitButton>
      </form>
    </>
  );
}
