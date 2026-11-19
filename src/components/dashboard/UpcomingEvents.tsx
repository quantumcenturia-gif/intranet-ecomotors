import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import NotionNotice from "@/components/NotionNotice";
import { EVENT_STYLES } from "@/data/eco-motors";
import { formatEventDate } from "@/lib/dates";
import type { CalendarEvent } from "@/lib/notion";

export default function UpcomingEvents({ events, error }: { events: CalendarEvent[] | null; error: string | null }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-5 w-5 text-blue-600" /> Próximas actividades
        </h2>
        <Link href="/calendario" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          Calendario <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {error ? (
        <NotionNotice error={error} />
      ) : events?.length ? (
        <ul className="space-y-3">
          {events.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${EVENT_STYLES[e.tipo ?? "Otro"] ?? EVENT_STYLES.Otro}`}>
                {e.tipo ?? "Actividad"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  {formatEventDate(e.start, e.end)}
                  {e.lugar && (
                    <>
                      {" · "}
                      <MapPin className="h-3 w-3" /> {e.lugar}
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No hay actividades en las próximas dos semanas.</p>
      )}
    </section>
  );
}
