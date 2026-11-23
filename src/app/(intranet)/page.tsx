import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, CalendarDays, Clock, Home, ListChecks, Users } from "lucide-react";
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
import { fmtHours, weeklyHours } from "@/lib/attendance";
import { TASK_SELECT, type TaskRow } from "@/lib/tasks";
import { unitPath } from "@/lib/units";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  await connection();
  const pwOk = (await searchParams).pw === "ok";
  const { supabase, member, profile, units, isAdmin } = await requireMe();
  const branch = member ? unitPath(units, member.unit_id).map((u) => u.id) : ["-"];

  const [news, people, events, myTasks, projects] = await Promise.all([
    supabase.from("announcements").select("id,title,body,created_at,image_url,unit:units(name)").order("created_at", { ascending: false }).limit(3),
    supabase.from("members").select("id,full_name,birthday,avatar_url,estado").eq("es_prueba", false).neq("estado", "Miembro retirado"),
    upcomingEvents(supabase, 14),
    member
      ? supabase.from("tasks").select(TASK_SELECT).eq("assignee_id", member.id)
          .not("estado", "in", "(Completada y validada,Cancelada)")
          .order("fecha_limite", { ascending: true, nullsFirst: false }).returns<TaskRow[]>()
      : Promise.resolve({ data: [] as TaskRow[] }),
    supabase.from("projects").select("*").order("sort"),
  ]);
  const { data: convs } = await supabase
    .from("tasks")
    .select("id,title,unit:units(name),volunteers:task_volunteers!task_id(member_id)")
    .eq("convocatoria", true)
    .not("estado", "in", "(Completada y validada,Cancelada)")
    .in("unit_id", branch)
    .order("created_at", { ascending: false })
    .limit(5);
  const pendientes = (convs ?? []).filter((c) => !(c.volunteers as { member_id: string }[]).some((v) => v.member_id === member?.id));

  const activos = people.data?.filter((m) => m.estado === "Activo").length ?? 0;
  // Las personas que no son de coordinación ven sus propias horas de la semana
  const { data: att } = !isAdmin && member
    ? await supabase.from("attendance_records").select("horas,session:attendance_sessions(fecha,estado)").eq("member_id", member.id).order("id", { ascending: false }).limit(40)
    : { data: [] };
  const week = weeklyHours(
    ((att ?? []) as unknown as { horas: number | null; session: { fecha: string; estado: string } | null }[])
      .filter((r) => r.session)
      .map((r) => ({ fecha: r.session!.fecha, horas: r.horas, verificada: r.session!.estado === "Verificada" })),
    1,
  )[0];
  const firstName = member?.es_prueba ? member.rol : (member?.full_name ?? profile?.full_name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader icon={Home} title={`Hola, ${firstName} 👋`} subtitle={TEAM.slogan} />
      {pendientes.length > 0 && (
        <Link href="/tareas?vista=convocatorias" className="mb-4 flex items-center gap-3 rounded-xl border-l-4 border-brand-600 bg-brand-50 p-4 hover:bg-brand-100">
          <span className="text-2xl inline-block origin-bottom-left animate-wiggle-slow">📣</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{pendientes.length === 1 ? "Hay 1 convocatoria abierta para tu área" : `Hay ${pendientes.length} convocatorias abiertas para tu área`}</p>
            <p className="truncate text-sm text-neutral-600">{pendientes.map((c) => c.title).join(" · ")}</p>
          </div>
          <span className="text-sm font-medium text-brand-700">Ver y apuntarme →</span>
        </Link>
      )}
      {pwOk && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">✅ Tu contraseña se ha cambiado correctamente.</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat href="/tareas" icon={ListChecks} value={myTasks.data?.length ?? 0} label="Mis tareas abiertas" />
        {isAdmin ? (
          <Stat href="/directorio" icon={Users} value={activos} label="Integrantes activos" />
        ) : (
          <Stat href="/perfil" icon={Clock} value={fmtHours(week.verificadas + week.pendientes)} label="Mis horas esta semana" />
        )}
        <Stat href="/calendario" icon={CalendarDays} value={events.length} label="Actividades en 2 semanas" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <NewsWall news={(news.data ?? []) as unknown as Parameters<typeof NewsWall>[0]["news"]} />
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold"><ListChecks className="h-5 w-5 text-brand-600" /> Mis tareas</h2>
              <Link href="/tareas" className="flex items-center gap-1 text-sm text-brand-600 hover:underline">Ver todas <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <TaskList tasks={(myTasks.data ?? []).slice(0, 5)} empty={member ? "No tienes tareas pendientes 🎉" : "Tu cuenta aún no está vinculada a tu ficha. Pide a coordinación que añada tu correo."} />
          </section>
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

function Stat({ href, icon: Icon, value, label }: { href: string; icon: typeof Users; value: number | string; label: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 overflow-hidden rounded-xl border-l-4 border-brand-600 bg-black p-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Icon className="h-8 w-8 text-brand-500 animate-float group-hover:animate-wiggle" />
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-neutral-400">{label}</p>
      </div>
    </Link>
  );
}
