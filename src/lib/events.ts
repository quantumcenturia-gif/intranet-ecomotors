export type EventRow = {
  id: number;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  tipo: string;
  estado: string;
  lugar: string | null;
  dirigido_a: string[];
  notas: string | null;
};

const TZ = "America/Lima";

export function formatEvent(e: Pick<EventRow, "start_at" | "end_at" | "all_day">) {
  const d = new Date(e.start_at);
  const day = d.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
  if (e.all_day) return day;
  const t = (s: string) => new Date(s).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${day} · ${t(e.start_at)}${e.end_at ? `–${t(e.end_at)}` : ""}`;
}

export const eventDayKey = (start: string) =>
  new Date(start).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

export async function upcomingEvents(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  days: number,
): Promise<EventRow[]> {
  const now = new Date();
  const from = new Date(now.getTime() - 6 * 3_600_000).toISOString();
  const to = new Date(now.getTime() + days * 86_400_000).toISOString();
  const { data } = await supabase
    .from("events")
    .select("*")
    .gte("start_at", from)
    .lte("start_at", to)
    .neq("estado", "Cancelada")
    .order("start_at");
  return data ?? [];
}
