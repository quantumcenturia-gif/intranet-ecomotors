/** Pruebas de pilotos: un registro por intento, con sus tiempos de vuelta en segundos. */
export type PilotRun = {
  id: number;
  fecha: string;
  piloto_id: string;
  project_id: string | null;
  intento: number;
  peso_kg: number | null;
  traje: string | null;
  pista: string | null;
  vueltas: number[];
  notas: string | null;
  created_at: string;
};

export const RUN_SELECT = "id,fecha,piloto_id,project_id,intento,peso_kg,traje,pista,vueltas,notas,created_at";

export const TRAJES_SUGERIDOS = ["Traje de carreras completo", "Buzo ignífugo", "Mameluco del equipo", "Ropa ligera + casco"];

/**
 * Convierte «1:32.5 1:30,8 89.9» en segundos [92.5, 90.8, 89.9].
 * Acepta minutos:segundos o solo segundos, separados por espacios, comas, «;» o saltos de línea.
 */
export function parseLaps(text: string): { laps: number[]; error?: string } {
  const tokens = text
    .replace(/(\d),(\d)/g, "$1.$2")
    .split(/[\s;,|·]+/)
    .filter(Boolean);
  const laps: number[] = [];
  for (const t of tokens) {
    let s: number;
    const mmss = t.match(/^(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
    if (mmss) s = Number(mmss[1]) * 60 + Number(mmss[2]);
    else if (/^\d+(?:\.\d+)?$/.test(t)) s = Number(t);
    else return { laps, error: `No entiendo «${t}». Escribe cada tiempo como 1:32.5 (minutos:segundos) o 92.5 (segundos).` };
    if (!(s >= 1 && s <= 3600)) return { laps, error: `El tiempo «${t}» no parece una vuelta válida.` };
    laps.push(Math.round(s * 100) / 100);
  }
  return { laps };
}

/** 92.5 → «1:32.50»; 45.2 → «45.20 s». */
export function fmtLap(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m ? `${m}:${s.toFixed(2).padStart(5, "0")}` : `${s.toFixed(2)} s`;
}

export function runStats(r: Pick<PilotRun, "vueltas">) {
  const laps = (r.vueltas ?? []).map(Number).filter((n) => Number.isFinite(n));
  if (!laps.length) return { count: 0, best: null, avg: null, total: null };
  const total = laps.reduce((a, b) => a + b, 0);
  return { count: laps.length, best: Math.min(...laps), avg: total / laps.length, total };
}

export const dayShort = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" });

/** Mejor vuelta de cada día de prueba para un piloto. */
export function bestByDay(runs: PilotRun[]) {
  const byDay = new Map<string, number>();
  for (const r of runs) {
    const { best } = runStats(r);
    if (best === null) continue;
    byDay.set(r.fecha, Math.min(best, byDay.get(r.fecha) ?? Infinity));
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, best]) => ({ fecha, best }));
}

/**
 * Colores de series (paleta categórica validada para daltonismo; orden fijo).
 * El color sigue a la persona: se asigna por su posición en la lista ordenada de pilotos.
 */
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
