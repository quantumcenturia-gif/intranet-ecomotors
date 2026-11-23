import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTION_SOURCES, notionEnabled, queryDataSource, select, text } from "@/lib/notion";
import { failBack } from "@/lib/action-error";

/** Subárea de Notion → unidad de la intranet. */
const UNIT_FROM_NOTION: Record<string, string> = {
  "Coordinación general": "coordinacion",
  "Supervisión Administrativa": "administrativa",
  "Logística y Operaciones": "logistica",
  "Marketing y Comunicación": "marketing",
  "Supervisión Mecánica": "mecanica",
  "Estructuras y Chasis": "estructuras",
  "Dirección y Suspensión": "direccion",
  "Aerodinámica y Carrocería": "aerodinamica",
  "Supervisión Propulsión": "propulsion",
  Powertrain: "powertrain",
  Energía: "energia",
  Electrónica: "electronica",
  Pilotos: "pilotos",
  "Por asignar": "por-asignar",
};

const limaDate = (d: string, allDay: boolean) => (allDay ? `${d}T00:00:00-05:00` : d);

/**
 * Copia (o actualiza) integrantes y calendario desde Notion.
 * No toca correos, fotos ni datos que se hayan añadido en la intranet.
 */
export async function importFromNotion(supabase: SupabaseClient) {
  if (!notionEnabled()) await failBack("Falta la variable NOTION_TOKEN.");

  const people = await queryDataSource(NOTION_SOURCES.miembros);
  const members = people
    .map((p) => ({
      notion_id: p.id,
      full_name: text(p.properties["Integrante"]),
      unit_id: UNIT_FROM_NOTION[select(p.properties["Subárea"]) ?? ""] ?? "por-asignar",
      rol: select(p.properties["Rol"]) ?? "Integrante",
      estado: select(p.properties["Estado"]) ?? "Activo",
      condicion: select(p.properties["Condición"]) ?? "Miembro confirmado",
    }))
    .filter((m) => m.full_name);
  const r1 = await supabase.from("members").upsert(members, { onConflict: "notion_id" });
  if (r1.error) await failBack(`Miembros: ${r1.error.message}`);

  const since = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
  const pages = await queryDataSource(NOTION_SOURCES.calendario, {
    filter: { property: "Fecha", date: { on_or_after: since } },
  });
  const events = pages
    .filter((p) => p.properties["Fecha"]?.date?.start)
    .map((p) => {
      const d = p.properties["Fecha"].date;
      const allDay = !String(d.start).includes("T");
      return {
        notion_id: p.id,
        title: text(p.properties["Actividad"]) || "Sin título",
        start_at: limaDate(d.start, allDay),
        end_at: d.end ? limaDate(d.end, allDay) : null,
        all_day: allDay,
        tipo: select(p.properties["Tipo"]) ?? "Otro",
        estado: select(p.properties["Estado"]) ?? "Planificada",
        lugar: text(p.properties["Lugar"]) || null,
        dirigido_a: (p.properties["Dirigido a"]?.multi_select ?? []).map((o: { name: string }) => o.name),
        notas: text(p.properties["Notas"]) || null,
      };
    });
  const r2 = await supabase.from("events").upsert(events, { onConflict: "notion_id" });
  if (r2.error) await failBack(`Calendario: ${r2.error.message}`);

  return { members: members.length, events: events.length };
}
