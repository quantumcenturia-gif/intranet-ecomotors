import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Cake, GraduationCap, Mail, Phone } from "lucide-react";
import Avatar from "@/components/Avatar";
import TaskList from "@/components/tasks/TaskList";
import { Badge, card } from "@/components/ui";
import { ROLE_STYLES } from "@/data/eco-motors";
import { requireMe, type Member } from "@/lib/me";
import { TASK_SELECT, type TaskRow } from "@/lib/tasks";
import { unitPath } from "@/lib/units";
import MemberDashboard from "@/components/member/MemberDashboard";

export default async function MiembroPage({ params }: PageProps<"/directorio/[id]">) {
  const { id } = await params;
  const { supabase, units, member: me, manageable } = await requireMe();
  const { data: m } = await supabase.from("members").select("*").eq("id", id).maybeSingle<Member>();
  if (!m) notFound();
  const { data: tasks } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("assignee_id", id)
    .not("estado", "in", "(Completada y validada,Cancelada)")
    .order("fecha_limite", { ascending: true, nullsFirst: false })
    .returns<TaskRow[]>();

  const canSeeAttendance = me?.id === m.id || manageable.has(m.unit_id);

  return (
    <>
      <Link href="/directorio" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> Directorio
      </Link>
      <section className={`${card} mb-6 overflow-hidden`}>
        <div className="racing-stripes h-24 bg-black" />
        <div className="flex flex-col items-center gap-4 px-6 pb-6 sm:flex-row sm:items-start">
          <div className="-mt-12 shrink-0 animate-pop-in rounded-full ring-4 ring-white">
            <Avatar name={m.full_name} src={m.avatar_url} size={104} />
          </div>
          <div className="flex-1 text-center sm:pt-4 sm:text-left">
            <h1 className="text-2xl font-bold">{m.full_name}</h1>
            <p className="text-sm text-neutral-500">{unitPath(units, m.unit_id).map((u) => u.name).join(" › ")}</p>
            {m.especialidad && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-neutral-600 sm:justify-start">
                <GraduationCap className="h-4 w-4" /> {m.especialidad}{m.ciclo ? ` · ${m.ciclo}.º ciclo` : ""}
              </p>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
              <Badge className={ROLE_STYLES[m.rol]}>{m.rol}</Badge>
              {m.estado !== "Activo" && <Badge className="bg-neutral-100">{m.estado}</Badge>}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-neutral-600 sm:pt-4">
            {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-2 hover:text-brand-600"><Mail className="h-4 w-4" /> {m.email}</a>}
            {canSeeAttendance && m.drive_url && <a href={m.drive_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-brand-600">📁 Carpeta de entregas</a>}
            {m.phone && <a href={`tel:${m.phone}`} className="flex items-center gap-2 hover:text-brand-600"><Phone className="h-4 w-4" /> {m.phone}</a>}
            {m.birthday && (
              <span className="flex items-center gap-2"><Cake className="h-4 w-4" /> {new Date(m.birthday + "T12:00").toLocaleDateString("es-PE", { day: "numeric", month: "long" })}</span>
            )}
          </div>
        </div>
        {m.bio && <p className="border-t border-neutral-100 px-6 py-4 text-neutral-700">{m.bio}</p>}
      </section>

      {canSeeAttendance ? (
        <>
          <MemberDashboard supabase={supabase} m={m} units={units} isSelf={me?.id === m.id} />
          <p className="mt-2 text-xs text-neutral-400">El avance, la asistencia y las horas solo los ven la persona y sus responsables.</p>
        </>
      ) : (
        <>
          <h2 className="mb-3 font-semibold">Tareas abiertas</h2>
          <TaskList tasks={tasks ?? []} empty="No tiene tareas abiertas visibles para ti." />
        </>
      )}
    </>
  );
}
