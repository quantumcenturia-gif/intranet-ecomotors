import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { EVENT_STYLES } from "@/data/eco-motors";
import { formatEvent, type EventRow } from "@/lib/events";

export default function UpcomingEvents({ events }: { events: EventRow[] }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-5 w-5 text-brand-600" /> Próximas actividades
        </h2>
        <Link href="/calendario" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">
          Calendario <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {events.length ? (
        <ul className="space-y-3">
          {events.slice(0, 5).map((e) => (
            <li key={e.id} className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${EVENT_STYLES[e.tipo] ?? EVENT_STYLES.Otro}`}>{e.tipo}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.title}</p>
                <p className="flex items-center gap-1 text-xs text-neutral-500">
                  {formatEvent(e)}
                  {e.lugar && (<>{" · "}<MapPin className="h-3 w-3" /> {e.lugar}</>)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">No hay actividades en las próximas dos semanas.</p>
      )}
    </section>
  );
}
