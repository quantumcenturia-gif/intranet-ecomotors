import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, CalendarDays, Home, ListChecks, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import NewsWall from "@/components/dashboard/NewsWall";
import UpcomingBirthdays from "@/components/dashboard/UpcomingBirthdays";
import UpcomingEvents from "@/components/dashboard/UpcomingEvents";
import QuickLinks from "@/components/dashboard/QuickLinks";
import Projects from "@/components/dashboard/Projects";
import TaskList from "@/components/tasks/TaskList";
import { TEAM } from "@/data/eco-motors";
import { upcomingEvents } from "@/lib/events";
import { requireMe } from "@/lib/me";
import { TASK_SELECT, type TaskRow } from "@/lib/tasks";

export default async function HomePage() {
  await connection();
  const { supabase, member, profile } = await requireMe();

  const [news, people, events, myTasks, projects] = await Promise.all([
    supabase.from("announcements").select("id,title,body,created_at,image_url").order("created_at", { ascending: false }).limit(3),
    supabase.from("members").select("id,full_name,birthday,avatar_url,estado").neq("estado", "Miembro retirado"),
    upcomingEvents(supabase, 14),
    member
      ? supabase.from("tasks").select(TASK_SELECT).eq("assignee_id", member.id)
          .not("estado", "in", "(Completada y validada,Cancelada)")
          .order("fecha_limite", { ascending: true, nullsFirst: false }).returns<TaskRow[]>()
      : Promise.resolve({ data: [] as TaskRow[] }),
    supabase.from("projects").select("*").order("sort"),
  ]);

  const activos = people.data?.filter((m) => m.estado === "Activo").length ?? 0;
  const firstName = (member?.full_name ?? profile?.full_name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader icon={Home} title={`Hola, ${firstName} 👋`} subtitle={TEAM.slogan} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat href="/tareas" icon={ListChecks} value={myTasks.data?.length ?? 0} label="Mis tareas abiertas" />
        <Stat href="/directorio" icon={Users} value={activos} label="Integrantes activos" />
        <Stat href="/calendario" icon={CalendarDays} value={events.length} label="Actividades en 2 semanas" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><ListChecks className="h-5 w-5 text-brand-600" /> Mis tareas</h2>
              <Link href="/tareas" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">Ver todas <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <TaskList tasks={(myTasks.data ?? []).slice(0, 5)} empty={member ? "No tienes tareas pendientes 🎉" : "Tu cuenta aún no está vinculada a tu ficha. Pide a coordinación que añada tu correo."} />
          </section>
          <NewsWall news={news.data ?? []} />
          <UpcomingEvents events={events} />
        </div>
        <div className="space-y-6">
          <UpcomingBirthdays people={people.data ?? []} />
          <QuickLinks />
        </div>
        <Projects projects={projects.data ?? []} />
      </div>
    </>
  );
}

function Stat({ href, icon: Icon, value, label }: { href: string; icon: typeof Users; value: number; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 overflow-hidden rounded-xl border-l-4 border-brand-600 bg-black p-5 text-white shadow-sm transition hover:shadow-lg">
      <Icon className="h-8 w-8 text-brand-500" />
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-neutral-400">{label}</p>
      </div>
    </Link>
  );
}
