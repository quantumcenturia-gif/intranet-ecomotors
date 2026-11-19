import { redirect } from "next/navigation";
import { CheckCircle2, DownloadCloud, Link2, Save, Search, Shield, UserPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { btnDark, btnPrimary, card, inputCls } from "@/components/ui";
import { CONDICIONES, ESTADOS_MIEMBRO, ROLES } from "@/data/eco-motors";
import { normalizeName } from "@/data/employees";
import { requireMe, type Member } from "@/lib/me";
import { flattenTree } from "@/lib/units";

type Tree = ReturnType<typeof flattenTree>;
import { runNotionImport, saveMember } from "./actions";

const sel = "rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const ok = typeof sp.ok === "string" ? sp.ok : "";
  const { supabase, units, isAdmin } = await requireMe();
  if (!isAdmin) redirect("/");

  const { data } = await supabase.from("members").select("*").order("full_name").returns<Member[]>();
  const nq = normalizeName(q);
  const members = (data ?? []).filter((m) => !nq || normalizeName(`${m.full_name} ${m.email ?? ""}`).includes(nq));
  const tree = flattenTree(units);
  const linked = (data ?? []).filter((m) => m.profile_id).length;

  return (
    <>
      <PageHeader icon={Shield} title="Administración" subtitle="Solo visible para coordinación" />
      {ok && (
        <p className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" /> {ok}
        </p>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className={`${card} p-5`}>
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><DownloadCloud className="h-5 w-5 text-brand-600" /> Respaldo desde Notion</h2>
          <p className="mb-4 text-sm text-neutral-600">
            Copia los integrantes (subárea, rol y estado) y el calendario desde Notion. Actualiza los que ya existen y no borra
            correos, fotos ni tareas creadas aquí.
          </p>
          <form action={runNotionImport}><button className={btnDark}><DownloadCloud className="h-4 w-4" /> Importar desde Notion</button></form>
        </section>
        <section className={`${card} p-5`}>
          <h2 className="mb-1 flex items-center gap-2 font-semibold"><Link2 className="h-5 w-5 text-brand-600" /> Cuentas vinculadas</h2>
          <p className="text-sm text-neutral-600">
            <b>{linked}</b> de {data?.length ?? 0} integrantes tienen cuenta. Para vincular a alguien, escribe su correo en su ficha:
            cuando se registre (o si ya lo hizo) con ese correo, su cuenta queda enlazada y podrá ver y entregar sus tareas.
          </p>
        </section>
      </div>

      <section className={`${card} mb-6 p-5`}>
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><UserPlus className="h-5 w-5 text-brand-600" /> Añadir integrante</h2>
        <form action={saveMember} className="flex flex-wrap items-center gap-2">
          <input name="full_name" required placeholder="Nombre completo" className={`${inputCls} w-56`} />
          <input name="email" type="email" placeholder="correo@uni.pe" className={`${inputCls} w-56`} />
          <UnitSelect tree={tree} />
          <Opt name="rol" value="Integrante" list={ROLES} />
          <button className={btnPrimary}><UserPlus className="h-4 w-4" /> Añadir</button>
        </form>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 p-4">
          <h2 className="font-semibold">Integrantes ({members.length})</h2>
          <form className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input name="q" defaultValue={q} placeholder="Buscar…" className={`${inputCls} w-56 pl-8`} />
          </form>
        </div>
        <div className="divide-y divide-neutral-100">
          {members.map((m) => (
            <form key={m.id} action={saveMember} className="flex flex-wrap items-center gap-2 p-3">
              <input type="hidden" name="id" value={m.id} />
              <span className={`h-2 w-2 rounded-full ${m.profile_id ? "bg-emerald-500" : "bg-neutral-300"}`} title={m.profile_id ? "Cuenta vinculada" : "Sin cuenta"} />
              <input name="full_name" defaultValue={m.full_name} className="min-w-40 flex-1 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-neutral-300 focus:border-brand-500 focus:outline-none" />
              <input name="email" type="email" defaultValue={m.email ?? ""} placeholder="correo" className="w-48 rounded-md border border-neutral-300 px-2 py-1.5 text-xs" />
              <UnitSelect tree={tree} value={m.unit_id} />
              <Opt name="rol" value={m.rol} list={ROLES} />
              <Opt name="estado" value={m.estado} list={ESTADOS_MIEMBRO} />
              <Opt name="condicion" value={m.condicion} list={CONDICIONES} />
              <button className="rounded-md bg-black p-1.5 text-white hover:bg-neutral-800" aria-label="Guardar"><Save className="h-4 w-4" /></button>
            </form>
          ))}
          {!members.length && <p className="p-5 text-sm text-neutral-500">No hay integrantes. Usa «Importar desde Notion» o añade uno.</p>}
        </div>
      </section>
    </>
  );
}

function UnitSelect({ tree, value }: { tree: Tree; value?: string }) {
  return (
    <select name="unit_id" defaultValue={value ?? "por-asignar"} className={sel}>
      {tree.map(({ unit, depth }) => <option key={unit.id} value={unit.id}>{"\u00a0\u00a0".repeat(depth)}{unit.name}</option>)}
    </select>
  );
}

function Opt({ name, value, list }: { name: string; value?: string; list: readonly string[] }) {
  return <select name={name} defaultValue={value} className={sel}>{list.map((o) => <option key={o}>{o}</option>)}</select>;
}
