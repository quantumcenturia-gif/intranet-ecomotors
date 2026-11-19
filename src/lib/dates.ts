const TZ = "America/Lima";

export function formatEventDate(start: string, end?: string | null) {
  const hasTime = start.includes("T");
  const d = new Date(hasTime ? start : start + "T12:00:00");
  const day = d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
  if (!hasTime) return day;
  const t = (s: string) => new Date(s).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${day} · ${t(start)}${end?.includes("T") ? `–${t(end)}` : ""}`;
}

export function dayKey(start: string) {
  const d = new Date(start.includes("T") ? start : start + "T12:00:00");
  return d.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}
