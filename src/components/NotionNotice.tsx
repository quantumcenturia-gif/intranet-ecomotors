import { AlertTriangle } from "lucide-react";

export default function NotionNotice({ error }: { error: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <div>
        <p className="font-medium">No se pudo leer Notion</p>
        <p className="text-amber-700">{error}</p>
        <p className="mt-1 text-amber-700">
          Revisa que <code>NOTION_TOKEN</code> esté configurado y que la base esté compartida con la integración
          (en Notion: ••• → Conexiones → “Intranet web”).
        </p>
      </div>
    </div>
  );
}
