import Link from "next/link";
import { Mail, Search, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import NotionNotice from "@/components/NotionNotice";
import { getCurrentUser } from "@/lib/supabase/server";
import { AREA_ORDER, getMembers, safeNotion } from "@/lib/notion";
import { ROLE_STYLES } from "@/data/eco-motors";
import { normalizeName } from "@/data/employees";

export default async function DirectorioPage({ searchParams }: PageProps<"/directorio">) {
  const { q, area } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const selectedArea = typeof area === "string" ? area : "";
  const { supabase } = (await getCurrentUser())!;

  const [{ data: members, error }, { data: profiles }] = await Promise.all([
    safeNotion(getMembers),
    supabase.from("profiles").select("full_name,email,avatar_url"),
  ]);

  // Une cada integrante de Notion con su perfil de la intranet (foto y correo), si se registró.
  const profileByName = new Map((profiles ?? []).map((p) => [normalizeName(p.full_name), p]));

  const nq = normalizeName(query);
  const list = (members ?? []).filter(
    (m) =>
      (!selectedArea || m.area === selectedArea) &&
      (!nq || [m.name, m.subarea, m.rol].some((v) => normalizeName(v).includes(nq))),
  );
  const areas = AREA_ORDER.filter((a) => members?.some((m) => m.area === a));
  const groups = areas
    .map((a) => ({ area: a, people: list.filter((m) => m.area === a) }))
    .filter((g) => g.people.length);

  const href = (a: string) => `/directorio?${new URLSearchParams({ ...(query && { q: query }), ...(a && { area: a }) })}`;

  return (
    <>
      <PageHeader icon={Users} title="Directorio de equipo" subtitle={members ? `${list.length} integrantes · sincronizado desde Notion` : undefined} />

      {error ? (
        <NotionNotice error={error} />
      ) : (
        <>
          <form className="relative mb-4">
            {selectedArea && <input type="hidden" name="area" value={selectedArea} />}
            <Search className="absolute left-3 top-1/2 h-4 w-4 -tranneutral-y-1/2 text-neutral-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar por nombre, subárea o rol…"
              className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </form>

          <div className="mb-6 flex flex-wrap gap-2">
            {["", ...areas].map((a) => (
              <Link
                key={a || "todas"}
                href={href(a)}
                className={`rounded-full px-3 py-1 text-sm ${
                  selectedArea === a ? "bg-brand-600 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-brand-50"
                }`}
              >
                {a || "Todas"}
              </Link>
            ))}
          </div>

          {groups.map((g) => (
            <section key={g.area} className="mb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{g.area}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.people.map((m) => {
                  const profile = profileByName.get(normalizeName(m.name));
                  return (
                    <div key={m.id} className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-5 text-center">
                      <Avatar name={m.name} src={profile?.avatar_url} size={72} />
                      <p className="mt-3 font-semibold">{m.name}</p>
                      <p className="text-sm text-brand-700">{m.subarea}</p>
                      <div className="mt-2 mb-4 flex flex-wrap justify-center gap-1">
                        {m.rol && <span className={`rounded-full px-2 py-0.5 text-xs ${ROLE_STYLES[m.rol] ?? "bg-neutral-100"}`}>{m.rol}</span>}
                        {m.estado && m.estado !== "Activo" && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{m.estado}</span>
                        )}
                        {m.condicion && m.condicion !== "Miembro confirmado" && (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{m.condicion}</span>
                        )}
                      </div>
                      {profile?.email ? (
                        <a
                          href={`mailto:${profile.email}`}
                          className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700"
                        >
                          <Mail className="h-4 w-4" /> Enviar correo
                        </a>
                      ) : (
                        <p className="mt-auto text-xs text-neutral-400">Aún no se ha registrado en la intranet</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {!groups.length && <p className="text-sm text-neutral-500">No se encontraron integrantes.</p>}
        </>
      )}
    </>
  );
}
