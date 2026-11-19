import { Download, FileText, Trash2, Upload } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatDate, formatSize } from "@/lib/format";
import { deleteDocument, downloadDocument, uploadDocument } from "./actions";

export default async function DocumentosPage() {
  const { supabase, user, profile } = (await getCurrentUser())!;
  const isAdmin = profile?.role === "admin";
  const { data: docs } = await supabase
    .from("documents")
    .select("id,name,path,size,created_at,uploaded_by,uploader:profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader icon={FileText} title="Documentos" subtitle="Archivos compartidos de la empresa" />

      <form action={uploadDocument} className="mb-6 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-5 sm:flex-row sm:items-center">
        <input name="file" type="file" required className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700" />
        <button className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Upload className="h-4 w-4" /> Subir
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {docs?.length ? (
          <ul className="divide-y divide-slate-100">
            {docs.map((d) => {
              const uploader = Array.isArray(d.uploader) ? d.uploader[0] : d.uploader;
              return (
                <li key={d.id} className="flex items-center gap-4 p-4">
                  <FileText className="h-8 w-8 shrink-0 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatSize(d.size)} · {uploader?.full_name ?? "—"} · {formatDate(d.created_at)}
                    </p>
                  </div>
                  <form action={downloadDocument}>
                    <input type="hidden" name="path" value={d.path} />
                    <input type="hidden" name="name" value={d.name} />
                    <button aria-label="Descargar" className="text-slate-500 hover:text-blue-600">
                      <Download className="h-5 w-5" />
                    </button>
                  </form>
                  {(isAdmin || d.uploaded_by === user.id) && (
                    <form action={deleteDocument}>
                      <input type="hidden" name="path" value={d.path} />
                      <button aria-label="Borrar" className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="p-5 text-sm text-slate-500">Aún no hay documentos.</p>
        )}
      </div>
    </>
  );
}
