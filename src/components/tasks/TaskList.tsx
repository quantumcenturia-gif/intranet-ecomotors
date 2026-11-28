import Link from "next/link";
import { CalendarClock, GitBranch } from "lucide-react";
import Avatar from "@/components/Avatar";
import { Badge } from "@/components/ui";
import { ESTADO_STYLES, PRIORIDAD_STYLES, estadoVisible } from "@/data/eco-motors";
import { fmtHoras, formatShortDate, type TaskRow } from "@/lib/tasks";
import { PERMISO_ICON, RIESGO_STYLES, necesitaPermiso } from "@/lib/safety";

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
                  {t.convocatoria && <Badge className="shrink-0 bg-brand-600 text-white">📣 Convocatoria</Badge>}
                  {t.horas ? <Badge className="shrink-0 bg-neutral-900 text-white">⏱ {fmtHoras(t.horas)}</Badge> : null}
                  {necesitaPermiso(t.riesgo) && (
                    <Badge className={`shrink-0 ${RIESGO_STYLES[t.riesgo]}`}>
                      🦺 {t.riesgo} {PERMISO_ICON[t.seguridad_estado]}
                    </Badge>
                  )}
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
                {t.convocatoria && !t.assignee ? (
                  <span className="whitespace-nowrap text-xs text-neutral-500">🙋 {t.volunteers?.length ?? 0}</span>
                ) : t.assignee ? (
                  <span className="flex -space-x-2">
                    <span className="rounded-full ring-2 ring-white"><Avatar name={t.assignee.full_name} src={t.assignee.avatar_url} size={28} /></span>
                    {(t.participants ?? []).slice(0, 2).map((p) => p.member && (
                      <span key={p.member.id} className="rounded-full ring-2 ring-white"><Avatar name={p.member.full_name} src={p.member.avatar_url} size={28} /></span>
                    ))}
                    {(t.participants?.length ?? 0) > 2 && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-semibold ring-2 ring-white">+{t.participants!.length - 2}</span>}
                  </span>
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
