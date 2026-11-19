import Link from "next/link";
import { FileText, Home, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import NewsWall from "@/components/dashboard/NewsWall";
import UpcomingBirthdays from "@/components/dashboard/UpcomingBirthdays";
import QuickLinks from "@/components/dashboard/QuickLinks";
import { getCurrentUser } from "@/lib/supabase/server";
import { mockEmployees, type Employee } from "@/data/employees";

export default async function HomePage() {
  const { supabase, profile } = (await getCurrentUser())!;

  const [news, people, docs] = await Promise.all([
    supabase.from("announcements").select("id,title,body,created_at").order("created_at", { ascending: false }).limit(4),
    supabase.from("profiles").select("id,full_name,email,position,department,phone,birthday,avatar_url"),
    supabase.from("documents").select("id", { count: "exact", head: true }),
  ]);

  const employees: Employee[] = [...(people.data ?? []), ...mockEmployees];

  return (
    <>
      <PageHeader icon={Home} title={`Hola, ${profile?.full_name?.split(" ")[0] ?? ""} 👋`} subtitle="Esto es lo que pasa hoy en la empresa" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Stat href="/directorio" icon={Users} value={employees.length} label="Personas en el equipo" />
        <Stat href="/documentos" icon={FileText} value={docs.count ?? 0} label="Documentos compartidos" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <NewsWall news={news.data ?? []} />
        <div className="space-y-6">
          <UpcomingBirthdays people={employees} />
          <QuickLinks />
        </div>
      </div>
    </>
  );
}

function Stat({ href, icon: Icon, value, label }: { href: string; icon: typeof Users; value: number; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 p-5 text-white shadow-sm transition hover:shadow-md">
      <Icon className="h-8 w-8 opacity-80" />
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-blue-100">{label}</p>
      </div>
    </Link>
  );
}
