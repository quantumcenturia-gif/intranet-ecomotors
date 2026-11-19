import Link from "next/link";
import { FileText, Home, Megaphone, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function HomePage() {
  const { supabase, profile } = (await getCurrentUser())!;

  const [news, people, docs] = await Promise.all([
    supabase.from("announcements").select("id,title,created_at").order("created_at", { ascending: false }).limit(3),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("documents").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    { label: "Empleados", value: people.count ?? 0, icon: Users, href: "/directorio" },
    { label: "Documentos", value: docs.count ?? 0, icon: FileText, href: "/documentos" },
    { label: "Noticias", value: news.data?.length ?? 0, icon: Megaphone, href: "/noticias" },
  ];

  return (
    <>
      <PageHeader icon={Home} title={`Hola, ${profile?.full_name?.split(" ")[0] ?? ""} 👋`} subtitle="Bienvenido a la intranet" />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
            <Icon className="mb-3 h-5 w-5 text-indigo-600" />
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 font-semibold">Últimas noticias</h2>
        {news.data?.length ? (
          <ul className="divide-y divide-slate-100">
            {news.data.map((n) => (
              <li key={n.id} className="flex justify-between gap-4 py-3">
                <Link href="/noticias" className="font-medium hover:text-indigo-600">{n.title}</Link>
                <span className="shrink-0 text-sm text-slate-500">{formatDate(n.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Todavía no hay noticias.</p>
        )}
      </section>
    </>
  );
}
