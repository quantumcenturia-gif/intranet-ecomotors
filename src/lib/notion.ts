import "server-only";
import { connection } from "next/server";

/**
 * Lectura de las bases de Notion de Eco Motors (solo lectura, desde el servidor).
 * Requiere NOTION_TOKEN (integración interna) y compartir cada base con la integración.
 */
const NOTION_VERSION = "2025-09-03";

export const NOTION_SOURCES = {
  miembros: process.env.NOTION_MEMBERS_DS ?? "c1c2f627-6a59-4446-b94c-7f446d1f88d2",
  calendario: process.env.NOTION_CALENDAR_DS ?? "41a753ad-9210-81a5-aa65-000b96fa2e19",
};

export const notionEnabled = () => Boolean(process.env.NOTION_TOKEN);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionPage = { id: string; url: string; properties: Record<string, any> };

async function queryDataSource(id: string, body: Record<string, unknown> = {}): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${id}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, page_size: 100, start_cursor: cursor }),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Notion respondió ${res.status}`);
    }
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const text = (p: any): string =>
  (p?.title ?? p?.rich_text ?? []).map((t: { plain_text: string }) => t.plain_text).join("").trim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const select = (p: any): string | null => p?.select?.name ?? null;

// ---------- Miembros ----------
export const AREAS: Record<string, string> = {
  "Coordinación general": "Coordinación",
  "Supervisión Administrativa": "Administrativa",
  "Logística y Operaciones": "Administrativa",
  "Marketing y Comunicación": "Administrativa",
  "Supervisión Mecánica": "Mecánica",
  "Estructuras y Chasis": "Mecánica",
  "Dirección y Suspensión": "Mecánica",
  "Aerodinámica y Carrocería": "Mecánica",
  "Supervisión Propulsión": "Propulsión",
  Powertrain: "Propulsión",
  Energía: "Propulsión",
  Electrónica: "Propulsión",
  Pilotos: "Ingeniería",
  "Por asignar": "Por asignar",
};
export const AREA_ORDER = ["Coordinación", "Administrativa", "Mecánica", "Propulsión", "Ingeniería", "Por asignar"];

export type Member = {
  id: string;
  name: string;
  subarea: string;
  area: string;
  rol: string | null;
  estado: string | null;
  condicion: string | null;
};

export async function getMembers(): Promise<Member[]> {
  const pages = await queryDataSource(NOTION_SOURCES.miembros);
  return pages
    .map((p) => {
      const subarea = select(p.properties["Subárea"]) ?? "Por asignar";
      return {
        id: p.id,
        name: text(p.properties["Integrante"]),
        subarea,
        area: AREAS[subarea] ?? "Por asignar",
        rol: select(p.properties["Rol"]),
        estado: select(p.properties["Estado"]),
        condicion: select(p.properties["Condición"]),
      };
    })
    .filter((m) => m.name && m.estado !== "Miembro retirado")
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

// ---------- Calendario ----------
export type CalendarEvent = {
  id: string;
  url: string;
  title: string;
  start: string;
  end: string | null;
  tipo: string | null;
  estado: string | null;
  lugar: string;
  dirigidoA: string[];
  notas: string;
};

export async function getEvents({ from, days }: { from?: Date; days?: number } = {}): Promise<CalendarEvent[]> {
  const start = from ?? new Date();
  const and: Record<string, unknown>[] = [
    { property: "Fecha", date: { on_or_after: start.toISOString().slice(0, 10) } },
    { property: "Estado", select: { does_not_equal: "Cancelada" } },
  ];
  if (days) {
    const end = new Date(start.getTime() + days * 86_400_000);
    and.push({ property: "Fecha", date: { on_or_before: end.toISOString().slice(0, 10) } });
  }
  const pages = await queryDataSource(NOTION_SOURCES.calendario, {
    filter: { and },
    sorts: [{ property: "Fecha", direction: "ascending" }],
  });
  return pages
    .filter((p) => p.properties["Fecha"]?.date?.start)
    .map((p) => ({
      id: p.id,
      url: p.url,
      title: text(p.properties["Actividad"]) || "Sin título",
      start: p.properties["Fecha"].date.start,
      end: p.properties["Fecha"].date.end ?? null,
      tipo: select(p.properties["Tipo"]),
      estado: select(p.properties["Estado"]),
      lugar: text(p.properties["Lugar"]),
      dirigidoA: (p.properties["Dirigido a"]?.multi_select ?? []).map((o: { name: string }) => o.name),
      notas: text(p.properties["Notas"]),
    }));
}

/** Ejecuta una lectura de Notion y devuelve el error en vez de romper la página. */
export async function safeNotion<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
  await connection(); // datos en vivo: siempre se leen en el momento de la petición
  if (!notionEnabled()) return { data: null, error: "Falta la variable NOTION_TOKEN." };
  try {
    return { data: await fn(), error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) };
  }
}
