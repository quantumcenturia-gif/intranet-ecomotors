import { CalendarDays, MapPin, Plus, Trash2, Users } from "lucide-react";
import { connection } from "next/server";
import PageHeader from "@/components/PageHeader";
import { Badge, Label, btnPrimary, card, inputCls } from "@/components/ui";
import { DIRIGIDO_A, EVENT_STYLES, EVENT_TIPOS } from "@/data/eco-motors";
import { eventDayKey, formatEvent, upcomingEvents, type EventRow } from "@/lib/events";
import { requireMe } from "@/lib/me";
import { createEvent, deleteEvent } from "./actions";

export default async function CalendarioPage() {
  await connection();
  const { supabase, isManager } = await requireMe();
  const events = await upcomingEvents(supabase, 60);

  const byDay = new Map<string, EventRow[]>();
  for (const e of events) {
    const k = eventDayKey(e.start_at);
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  return (
    <>
      <PageHeader icon={CalendarDays} title="Calendario general" subtitle="Próximos 60 días" />

      <div className="mb-6 rounded-xl border-l-4 border-brand-600 bg-black p-4 text-sm text-neutral-200">
        <b className="text-white">Actividades fijas cada sábado:</b> 2–3 p. m. Reunión de directores · 3–4 p. m. Taller · 4–6 p. m. Prueba de pilotos.
      </div>

      {isManager && (
        <details className={`${card} mb-6 p-5`}>
          <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Plus className="h-4 w-4 text-brand-600" /> Añadir actividad</summary>
          <form action={createEvent} className="mt-4 grid gap-4 sm:grid-cols-3">
            <Label label="Actividad" className="sm:col-span-3"><input name="title" required className={inputCls} /></Label>
            <Label label="Fecha"><input name="date" type="date" required className={inputCls} /></Label>
            <Label label="Hora inicio (vacío = todo el día)"><input name="start" type="time" className={inputCls} /></Label>
            <Label label="Hora fin"><input name="end" type="time" className={inputCls} /></Label>
            <Label label="Tipo"><select name="tipo" className={inputCls}>{EVENT_TIPOS.map((t) => <option key={t}>{t}</option>)}</select></Label>
            <Label label="Lugar"><input name="lugar" className={inputCls} /></Label>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">Dirigido a</span>
              <div className="flex flex-wrap gap-3 pt-2 text-sm">
                {DIRIGIDO_A.map((d) => (
                  <label key={d} className="flex items-center gap-1.5"><input type="checkbox" name="dirigido_a" value={d} defaultChecked={d === "Todo el equipo"} className="accent-brand-600" /> {d}</label>
                ))}
              </div>
            </div>
            <Label label="Notas" className="sm:col-span-3"><textarea name="notas" rows={2} className={inputCls} /></Label>
            <div><button className={btnPrimary}><Plus className="h-4 w-4" /> Guardar actividad</button></div>
          </form>
        </details>
      )}

      {!events.length && <p className="text-sm text-neutral-500">No hay actividades planificadas.</p>}
      <div className="space-y-6">
        {[...byDay].map(([day, list]) => (
          <section key={day}>
            <h2 className="mb-2 text-sm font-semibold text-neutral-500 first-letter:uppercase">{day}</h2>
            <div className="space-y-2">
              {list.map((e) => (
                <div key={e.id} className={`${card} flex flex-col gap-2 p-4 sm:flex-row sm:items-center`}>
                  <Badge className={`w-fit ${EVENT_STYLES[e.tipo] ?? EVENT_STYLES.Otro}`}>{e.tipo}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="flex flex-wrap items-center gap-x-3 text-xs text-neutral-500">
                      <span>{formatEvent(e)}</span>
                      {e.lugar && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.lugar}</span>}
                      {e.dirigido_a.length > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {e.dirigido_a.join(", ")}</span>}
                    </p>
                    {e.notas && <p className="mt-1 text-sm text-neutral-600">{e.notas}</p>}
                  </div>
                  {isManager && (
                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <button aria-label="Borrar" className="text-neutral-300 hover:text-brand-600"><Trash2 className="h-4 w-4" /></button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
