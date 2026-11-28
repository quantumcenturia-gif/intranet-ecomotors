import { CalendarCheck2 } from "lucide-react";
import { Badge, card } from "@/components/ui";
import { SESSION_STYLES, TIPO_STYLES, dayLabel, fmtHours, hhmm, weeklyHours } from "@/lib/attendance";

export type HistoryRow = {
  id: number;
  entrada: string | null;
  salida: string | null;
  horas: number | null;
  observacion: string | null;
  session: { titulo: string; fecha: string; tipo: string; estado: string; unit: { name: string } | null } | null;
};

/** Historial de asistencias de un miembro + horas por semana. */
export default function AttendanceHistory({ rows, title = "Mi asistencia" }: { rows: HistoryRow[]; title?: string }) {
  const valid = rows.filter((r) => r.session);
  const weeks = weeklyHours(valid.map((r) => ({ fecha: r.session!.fecha, horas: r.horas, verificada: r.session!.estado === "Verificada" })));
  const max = Math.max(1, ...weeks.map((w) => w.verificadas + w.pendientes));
  const thisWeek = weeks.at(-1)!;
  const total = valid.filter((r) => r.session!.estado === "Verificada").reduce((s, r) => s + Number(r.horas ?? 0), 0);

  return (
    <section className={`${card} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><CalendarCheck2 className="h-5 w-5 text-brand-600" /> {title}</h2>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-black px-3 py-1 font-semibold text-white">Esta semana: {fmtHours(thisWeek.verificadas + thisWeek.pendientes)}</span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-neutral-700">Total verificado: {fmtHours(total)}</span>
        </div>
      </div>

      <div className="mb-5">
        <p className="mb-2 text-xs uppercase tracking-wide text-neutral-500">Horas por semana</p>
        <div className="flex h-28 items-end gap-2">
          {weeks.map((w) => {
            const h = w.verificadas + w.pendientes;
            return (
              <div key={w.week} className="flex flex-1 flex-col items-center gap-1" title={`${w.label}: ${fmtHours(h)}`}>
                <span className="text-[10px] text-neutral-500">{h ? Number(h.toFixed(1)) : ""}</span>
                <div className="grow-y flex w-full flex-col justify-end overflow-hidden rounded-t" style={{ height: `${(h / max) * 80}px` }}>
                  {w.pendientes > 0 && <div className="bg-brand-200" style={{ height: `${(w.pendientes / h) * 100}%` }} />}
                  {w.verificadas > 0 && <div className="bg-brand-600" style={{ height: `${(w.verificadas / h) * 100}%` }} />}
                </div>
                <span className="w-full truncate text-center text-[10px] text-neutral-400">{w.label}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 flex gap-4 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-600" /> Verificadas</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand-200" /> Pendientes de verificar</span>
        </p>
      </div>

      {valid.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-400">
              <tr><th className="py-2">Fecha</th><th>Asistencia</th><th>Entrada</th><th>Salida</th><th className="text-right">Horas</th><th className="pl-3">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {valid.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 whitespace-nowrap">{dayLabel(r.session!.fecha)}</td>
                  <td>
                    <span className="mr-1.5"><Badge className={TIPO_STYLES[r.session!.tipo]}>{r.session!.tipo}</Badge></span>
                    <span className="text-neutral-700">{r.session!.titulo}</span>
                    {r.observacion && <span className="block text-xs text-neutral-400">{r.observacion}</span>}
                  </td>
                  <td>{hhmm(r.entrada) || "—"}</td>
                  <td>{hhmm(r.salida) || "—"}</td>
                  <td className="text-right font-medium">{r.horas ? fmtHours(Number(r.horas)) : "—"}</td>
                  <td className="pl-3"><Badge className={SESSION_STYLES[r.session!.estado]}>{r.session!.estado === "Verificada" ? "Guardada" : r.session!.estado}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Aún no hay asistencias registradas.</p>
      )}
    </section>
  );
}

export const HISTORY_SELECT = "id,entrada,salida,horas,observacion,session:attendance_sessions(titulo,fecha,tipo,estado,unit:units(name))";
