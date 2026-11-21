import Link from "next/link";
import { Search, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { Badge, inputCls } from "@/components/ui";
import { ROLE_STYLES } from "@/data/eco-motors";
import { normalizeName } from "@/data/employees";
import { requireMe, type Member } from "@/lib/me";
import { flattenTree, rootOf, subtree } from "@/lib/units";

export default async function DirectorioPage({ searchParams }: PageProps<"/directorio">) {
  const { q, area } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const selected = typeof area === "string" ? area : "";
  const { supabase, units } = await requireMe();

  const { data } = await supabase.from("members").select("*").eq("es_prueba", false).neq("estado", "Miembro retirado").order("full_name").returns<Member[]>();
  const all = data ?? [];
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const nq = normalizeName(query);
  const inArea = selected ? new Set(subtree(units, selected)) : null;
  const list = all.filter(
    (m) =>
      (!inArea || inArea.has(m.unit_id)) &&
      (!nq || [m.full_name, unitName.get(m.unit_id), m.rol].some((v) => normalizeName(v).includes(nq))),
  );

  const roots = flattenTree(units).filter((x) => x.depth === 0).map((x) => x.unit);
  const groups = roots
    .map((r) => ({ area: r, people: list.filter((m) => rootOf(units, m.unit_id)?.id === r.id) }))
    .filter((g) => g.people.length);
  const href = (a: string) => `/directorio?${new URLSearchParams({ ...(query && { q: query }), ...(a && { area: a }) })}`;

  return (
    <>
      <PageHeader icon={Users} title="Directorio de equipo" subtitle={`${list.length} integrantes`} />

      <form className="relative mb-4">
        {selected && <input type="hidden" name="area" value={selected} />}
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input name="q" defaultValue={query} placeholder="Buscar por nombre, subárea o rol…" className={`${inputCls} py-2.5 pl-9`} />
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {[{ id: "", name: "Todas" }, ...roots].map((a) => (
          <Link
            key={a.id || "todas"}
            href={href(a.id)}
            className={`rounded-full px-3 py-1 text-sm ${selected === a.id ? "bg-brand-600 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-brand-50"}`}
          >
            {a.name}
          </Link>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.area.id} className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{g.area.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.people.map((m) => (
              <Link key={m.id} href={`/directorio/${m.id}`} className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-5 text-center transition hover:border-brand-300 hover:shadow-md">
                <Avatar name={m.full_name} src={m.avatar_url} size={72} />
                <p className="mt-3 font-semibold">{m.full_name}</p>
                <p className="text-sm text-brand-700">{unitName.get(m.unit_id)}</p>
                {m.especialidad && (
                  <p className="text-xs text-neutral-500">{m.especialidad}{m.ciclo ? ` · ${m.ciclo}.º ciclo` : ""}</p>
                )}
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  <Badge className={ROLE_STYLES[m.rol] ?? "bg-neutral-100"}>{m.rol}</Badge>
                  {m.estado !== "Activo" && <Badge className="bg-neutral-100 text-neutral-600">{m.estado}</Badge>}
                  {m.condicion !== "Miembro confirmado" && <Badge className="border border-neutral-300 text-neutral-600">{m.condicion}</Badge>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {!groups.length && <p className="text-sm text-neutral-500">No se encontraron integrantes.</p>}
    </>
  );
}
