/** Mes en formato AAAA-MM y su rango de fechas. */
export function monthRange(month?: string) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));
  const m = month && /^\d{4}-\d{2}$/.test(month) ? month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, mm] = m.split("-").map(Number);
  const next = mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, "0")}`;
  const label = new Date(y, mm - 1, 15).toLocaleDateString("es-PE", { month: "long", year: "numeric" });
  return { month: m, from: `${m}-01`, to: `${next}-01`, label };
}

export const shiftMonth = (m: string, delta: number) => {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(y, mm - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const todayLima = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
