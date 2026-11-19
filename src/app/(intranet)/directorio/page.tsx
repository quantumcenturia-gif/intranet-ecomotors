import { Mail, Phone, Search, Users } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function DirectorioPage({ searchParams }: PageProps<"/directorio">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const { supabase } = (await getCurrentUser())!;

  let req = supabase.from("profiles").select("id,full_name,email,department,position,phone").order("full_name");
  if (query) {
    const safe = query.replace(/[%,()]/g, "");
    req = req.or(`full_name.ilike.%${safe}%,department.ilike.%${safe}%,position.ilike.%${safe}%`);
  }
  const { data: people } = await req;

  return (
    <>
      <PageHeader icon={Users} title="Directorio" subtitle="Encuentra a tus compañeros" />

      <form className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por nombre, departamento o cargo…"
          className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3"
        />
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {people?.map((p) => (
          <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">
                {(p.full_name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium">{p.full_name}</p>
                <p className="truncate text-xs text-slate-500">
                  {[p.position, p.department].filter(Boolean).join(" · ") || "Sin cargo"}
                </p>
              </div>
            </div>
            <a href={`mailto:${p.email}`} className="flex items-center gap-2 truncate text-sm text-slate-600 hover:text-indigo-600">
              <Mail className="h-4 w-4 shrink-0" /> {p.email}
            </a>
            {p.phone && (
              <a href={`tel:${p.phone}`} className="mt-1 flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600">
                <Phone className="h-4 w-4" /> {p.phone}
              </a>
            )}
          </div>
        ))}
      </div>
      {!people?.length && <p className="text-sm text-slate-500">No se encontraron personas.</p>}
    </>
  );
}
