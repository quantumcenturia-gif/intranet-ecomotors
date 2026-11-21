export type Session = {
  id: number;
  unit_id: string | null;
  tipo: "Área" | "Reunión" | "Práctica";
  titulo: string;
  fecha: string;
  estado: "Abierta" | "Cerrada" | "Verificada";
  opened_by: string | null;
  opened_at: string;
  closed_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
};

export type AttendanceRecord = {
  id: number;
  session_id: number;
  member_id: string;
  entrada: string | null;
  salida: string | null;
  horas: number | null;
  observacion: string | null;
};

export const SESSION_STYLES: Record<string, string> = {
  Abierta: "bg-emerald-100 text-emerald-700",
  Cerrada: "bg-amber-100 text-amber-800",
  Verificada: "bg-neutral-900 text-white",
};

export const TIPO_STYLES: Record<string, string> = {
  Área: "bg-neutral-100 text-neutral-700",
  Reunión: "bg-brand-100 text-brand-700",
  Práctica: "bg-brand-600 text-white",
};

const TZ = "America/Lima";
export const hhmm = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }) : "";
export const dayLabel = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
export const fmtHours = (n: number) => `${Number(n.toFixed(2))} h`;

/** Lunes (AAAA-MM-DD) de la semana de una fecha. */
export function weekStart(date: string) {
  const d = new Date(date + "T12:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Horas por semana (últimas N semanas, incluida la actual), separando verificadas y pendientes. */
export function weeklyHours(rows: { fecha: string; horas: number | null; verificada: boolean }[], weeks = 8) {
  const todayLima = new Date().toLocaleDateString("en-CA", { timeZone: TZ });
  const current = weekStart(todayLima);
  const out: { week: string; label: string; verificadas: number; pendientes: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(current + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 7 * i);
    const week = d.toISOString().slice(0, 10);
    out.push({ week, label: i === 0 ? "Esta semana" : dayLabel(week).replace(/^\w+\.?,?\s*/, "Sem. "), verificadas: 0, pendientes: 0 });
  }
  for (const r of rows) {
    const w = out.find((x) => x.week === weekStart(r.fecha));
    if (!w || !r.horas) continue;
    if (r.verificada) w.verificadas += Number(r.horas);
    else w.pendientes += Number(r.horas);
  }
  return out;
}
