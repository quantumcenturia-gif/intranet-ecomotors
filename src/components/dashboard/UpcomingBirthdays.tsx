import { Cake } from "lucide-react";
import Avatar from "@/components/Avatar";
import { daysUntilBirthday, type Employee } from "@/data/employees";

export default function UpcomingBirthdays({ people, withinDays = 30 }: { people: Employee[]; withinDays?: number }) {
  const upcoming = people
    .filter((p) => p.birthday)
    .map((p) => ({ ...p, days: daysUntilBirthday(p.birthday!) }))
    .filter((p) => p.days <= withinDays)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Cake className="h-5 w-5 text-blue-600" /> Próximos cumpleaños
      </h2>
      {upcoming.length ? (
        <ul className="space-y-3">
          {upcoming.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar name={p.full_name} src={p.avatar_url} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.full_name}</p>
                <p className="text-xs text-slate-500">
                  {new Date(p.birthday! + "T00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" })}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.days === 0 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}>
                {p.days === 0 ? "¡Hoy! 🎉" : `en ${p.days} d`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No hay cumpleaños en los próximos {withinDays} días.</p>
      )}
    </section>
  );
}
