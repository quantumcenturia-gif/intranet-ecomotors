import { Download, FileText, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge, card, selectSm } from "@/components/ui";
import { formatDate, formatSize } from "@/lib/format";
import { requireMe } from "@/lib/me";
import { flattenTree, subtree } from "@/lib/units";
import { deleteDocument, downloadDocument, uploadDocument } from "./actions";

const CATEGORIAS = ["Entregable", "Recurso", "Reglamento", "Plantilla", "Otro"] as const;
const CAT_STYLES: Record<string, string> = {
  Entregable: "bg-brand-100 text-brand-700",
  Recurso: "bg-neutral-900 text-white",
  Reglamento: "bg-amber-100 text-amber-800",
  Plantilla: "bg-neutral-100 text-neutral-700",
  Otro: "border border-neutral-300 text-neutral-500",
};

export default async function DocumentosPage({ searchParams }: PageProps<"/documentos">) {
  const sp = await searchParams;
  const unidad = typeof sp.unidad === "string" ? sp.unidad : "";
  const categoria = typeof sp.categoria === "string" ? sp.categoria : "";
  const { supabase, user, units, member, isAdmin } = await requireMe();

  let q = supabase
    .from("documents")
    .select("id,name,path,size,created_at,uploaded_by,unit_id,categoria,uploader:profiles(full_name)")
    .order("created_at", { ascending: false });
  if (unidad) q = q.in("unit_id", subtree(units, unidad));
  if (categoria) q = q.eq("categoria", categoria);
  const { data: docs, error } = await q;
  if (error) throw new Error(error.message);

  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const tree = flattenTree(units);

  return (
    <>
      <PageHeader icon={FileText} title="Documentos" subtitle="Entregables, recursos y reglamentos de cada área" />

      <form action={uploadDocument} className={`${card} mb-6 grid gap-3 border-dashed p-5 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center`}>
        <input name="file" type="file" required className="min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700" />
        <select name="unit_id" defaultValue={member?.unit_id ?? ""} className={selectSm}>
          <option value="">General (todo el equipo)</option>
          {tree.map(({ unit, depth }) => <option key={unit.id} value={unit.id}>{"  ".repeat(depth)}{unit.name}</option>)}
        </select>
        <select name="categoria" defaultValue="Entregable" className={selectSm}>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Upload className="h-4 w-4" /> Subir
        </button>
      </form>

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <select name="unidad" defaultValue={unidad} className={selectSm}>
          <option value="">Todas las áreas</option>
          {tree.map(({ unit, depth }) => <option key={unit.id} value={unit.id}>{"  ".repeat(depth)}{unit.name}</option>)}
        </select>
        <select name="categoria" defaultValue={categoria} className={selectSm}>
          <option value="">Todos los tipos</option>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="rounded-lg bg-black px-3 py-2 text-sm text-white">Filtrar</button>
      </form>

      <div className={`${card} overflow-hidden`}>
        {docs?.length ? (
          <ul className="divide-y divide-neutral-100">
            {docs.map((d) => {
              const uploader = Array.isArray(d.uploader) ? d.uploader[0] : d.uploader;
              return (
                <li key={d.id} className="flex items-center gap-4 p-4">
                  <FileText className="h-8 w-8 shrink-0 text-brand-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                      <Badge className={CAT_STYLES[d.categoria] ?? CAT_STYLES.Otro}>{d.categoria}</Badge>
                      <span>{d.unit_id ? unitName.get(d.unit_id) : "General"}</span>
                      <span>· {formatSize(d.size)} · {uploader?.full_name ?? "—"} · {formatDate(d.created_at)}</span>
                    </p>
                  </div>
                  <form action={downloadDocument}>
                    <input type="hidden" name="path" value={d.path} />
                    <input type="hidden" name="name" value={d.name} />
                    <button aria-label="Descargar" className="text-neutral-500 hover:text-brand-600"><Download className="h-5 w-5" /></button>
                  </form>
                  {(isAdmin || d.uploaded_by === user.id) && (
                    <form action={deleteDocument}>
                      <input type="hidden" name="path" value={d.path} />
                      <button aria-label="Borrar" className="text-neutral-400 hover:text-red-600"><Trash2 className="h-5 w-5" /></button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-5 text-sm text-neutral-500">No hay documentos con estos filtros.</p>
        )}
      </div>
    </>
  );
}
