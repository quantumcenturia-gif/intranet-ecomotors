import Link from "next/link";
import { CalendarDays, FileText, Home, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import NewsWall from "@/components/dashboard/NewsWall";
import UpcomingBirthdays from "@/components/dashboard/UpcomingBirthdays";
import UpcomingEvents from "@/components/dashboard/UpcomingEvents";
import QuickLinks from "@/components/dashboard/QuickLinks";
import Projects from "@/components/dashboard/Projects";
import { getCurrentUser } from "@/lib/supabase/server";
import { getEvents, getMembers, safeNotion } from "@/lib/notion";
import { TEAM } from "@/data/eco-motors";

export default async function HomePage() {
  const { supabase, profile } = (await getCurrentUser())!;

  const [news, people, docs, members, events] = await Promise.all([
    supabase.from("announcements").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("profiles").select("id,full_name,email,position,department,phone,birthday,avatar_url"),
    supabase.from("documents").select("id", { count: "exact", head: true }),
    safeNotion(getMembers),
    safeNotion(() => getEvents({ days: 14 })),
  ]);

  const activos = members.data?.filter((m) => m.estado === "Activo").length;

  return (
    <>
      <PageHeader icon={Home} title={`Hola, ${profile?.full_name?.split(" ")[0] ?? ""} 👋`} subtitle={TEAM.slogan} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat href="/directorio" icon={Users} value={activos ?? "—"} label="Integrantes activos" />
        <Stat href="/calendario" icon={CalendarDays} value={events.data?.length ?? "—"} label="Actividades en 2 semanas" />
        <Stat href="/documentos" icon={FileText} value={docs.count ?? 0} label="Documentos compartidos" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <NewsWall news={news.data ?? []} />
          <UpcomingEvents events={events.data} error={events.error} />
        </div>
        <div className="space-y-6">
          <UpcomingBirthdays people={people.data ?? []} />
          <QuickLinks />
        </div>
        <Projects />
      </div>
    </>
  );
}

function Stat({ href, icon: Icon, value, label }: { href: string; icon: typeof Users; value: number | string; label: string }) {
  return (
    <Link href={href} className="group relative flex items-center gap-4 overflow-hidden rounded-xl border-l-4 border-brand-600 bg-black p-5 text-white shadow-sm transition hover:shadow-lg">
      <Icon className="h-8 w-8 text-brand-500" />
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-neutral-400">{label}</p>
      </div>
    </Link>
  );
}
