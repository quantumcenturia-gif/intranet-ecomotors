import { CalendarDays, ExternalLink, MapPin, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import NotionNotice from "@/components/NotionNotice";
import { EVENT_STYLES } from "@/data/eco-motors";
import { dayKey, formatEventDate } from "@/lib/dates";
import { getEvents, safeNotion, type CalendarEvent } from "@/lib/notion";

export default async function CalendarioPage() {
  const { data: events, error } = await safeNotion(() => getEvents({ days: 60 }));

  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events ?? []) {
    const k = dayKey(e.start);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  return (
    <>
      <PageHeader icon={CalendarDays} title="Calendario general" subtitle="Próximos 60 días · se edita en Notion" />

      <div className="mb-6 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-800">
        <b>Actividades fijas cada sábado:</b> 2–3 p. m. Reunión de directores · 3–4 p. m. Taller · 4–6 p. m. Prueba de pilotos.
      </div>

      {error && <NotionNotice error={error} />}
      {!error && !events?.length && <p className="text-sm text-neutral-500">No hay actividades planificadas.</p>}

      <div className="space-y-6">
        {[...byDay].map(([day, list]) => (
          <section key={day}>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500 first-letter:uppercase">{day}</h2>
            <div className="space-y-2">
              {list.map((e) => (
                <a
                  key={e.id}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-brand-300 sm:flex-row sm:items-center"
                >
                  <span className={`w-fit shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${EVENT_STYLES[e.tipo ?? "Otro"] ?? EVENT_STYLES.Otro}`}>
                    {e.tipo ?? "Actividad"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
                      <span>{formatEventDate(e.start, e.end)}</span>
                      {e.lugar && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {e.lugar}
                        </span>
                      )}
                      {e.dirigidoA.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {e.dirigidoA.join(", ")}
                        </span>
                      )}
                    </p>
                    {e.notas && <p className="mt-1 text-sm text-neutral-600">{e.notas}</p>}
                  </div>
                  <ExternalLink className="hidden h-4 w-4 text-neutral-300 group-hover:text-brand-500 sm:block" />
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
