import { Mail, Phone, Search, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/supabase/server";
import { mockEmployees, type Employee } from "@/data/employees";

export default async function DirectorioPage({ searchParams }: PageProps<"/directorio">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const { supabase } = (await getCurrentUser())!;

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name,email,position,department,phone,birthday,avatar_url")
    .order("full_name");

  const people = [...(data ?? []), ...mockEmployees]
    .filter((p: Employee) =>
      !query || [p.full_name, p.position, p.department].some((v) => v?.toLowerCase().includes(query)),
    )
    .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "es"));

  return (
    <>
      <PageHeader icon={Users} title="Directorio de equipo" subtitle={`${people.length} personas`} />

      <form className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre, departamento o cargo…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => (
          <div key={p.id} className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center">
            <Avatar name={p.full_name} src={p.avatar_url} size={80} />
            <p className="mt-3 font-semibold">{p.full_name}</p>
            <p className="text-sm text-blue-700">{p.position || "Sin cargo"}</p>
            <p className="mb-4 text-xs text-slate-500">{p.department || "—"}</p>
            {p.phone && (
              <a href={`tel:${p.phone}`} className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600">
                <Phone className="h-3.5 w-3.5" /> {p.phone}
              </a>
            )}
            <a
              href={`mailto:${p.email}`}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" /> Enviar correo
            </a>
          </div>
        ))}
      </div>
      {!people.length && <p className="text-sm text-slate-500">No se encontraron personas.</p>}
    </>
  );
}
