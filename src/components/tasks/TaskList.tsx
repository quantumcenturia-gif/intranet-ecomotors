import Link from "next/link";
import { CalendarClock, GitBranch } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Badge } from "@/components/ui";
import { ESTADO_STYLES, PRIORIDAD_STYLES, estadoVisible } from "@/data/eco-motors";
import { formatShortDate, type TaskRow } from "@/lib/tasks";

export default function TaskList({ tasks, empty }: { tasks: TaskRow[]; empty: string }) {
  if (!tasks.length) return <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">{empty}</p>;
  return (
    <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {tasks.map((t) => {
        const estado = estadoVisible(t);
        const done = t.subtasks.filter((s) => s.estado === "Completada y validada").length;
        return (
          <li key={t.id}>
            <Link href={`/tareas/${t.id}`} className="flex flex-col gap-2 p-4 hover:bg-neutral-50 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  <span className={`text-xs font-bold ${PRIORIDAD_STYLES[t.prioridad]}`} title={`Prioridad ${t.prioridad}`}>●</span>
                  <span className="truncate">{t.title}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <span>{t.unit?.name}</span>
                  {t.project && <span>· {t.project.name}</span>}
                  {t.subtasks.length > 0 && (
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" /> {done}/{t.subtasks.length} subtareas
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> {formatShortDate(t.fecha_limite)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100 sm:block" title={`${t.avance}%`}>
                  <div className="h-full bg-brand-600" style={{ width: `${t.avance}%` }} />
                </div>
                <Badge className={ESTADO_STYLES[estado]}>{estado}</Badge>
                {t.assignee ? (
                  <Avatar name={t.assignee.full_name} src={t.assignee.avatar_url} size={28} />
                ) : (
                  <span className="text-xs text-neutral-400">Sin asignar</span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
