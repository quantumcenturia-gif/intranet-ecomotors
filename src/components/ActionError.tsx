"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

/** Muestra el mensaje de una acción que no se pudo completar (llega como ?error=…). */
export default function ActionError() {
  const params = useSearchParams();
  const pathname = usePathname();
  const msg = params.get("error");
  const [shown, setShown] = useState<string | null>(null);
  const [seen, setSeen] = useState<{ msg: string | null; path: string }>({ msg: null, path: pathname });

  // Mensaje nuevo → mostrarlo; cambio de página → ocultarlo
  if (msg !== seen.msg || pathname !== seen.path) {
    const otherPage = pathname !== seen.path;
    setSeen({ msg, path: pathname });
    if (msg) setShown(msg);
    else if (otherPage) setShown(null);
  }

  // Se quita ?error= de la dirección para que no reaparezca al recargar
  useEffect(() => {
    if (!msg) return;
    const q = new URLSearchParams(window.location.search);
    q.delete("error");
    window.history.replaceState(null, "", window.location.pathname + (q.size ? `?${q}` : ""));
  }, [msg]);

  useEffect(() => {
    if (!shown) return;
    const t = setTimeout(() => setShown(null), 12000);
    return () => clearTimeout(t);
  }, [shown]);

  if (!shown) return null;
  return (
    <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900 print:hidden">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
      <p className="flex-1">{shown}</p>
      <button type="button" onClick={() => setShown(null)} aria-label="Cerrar" className="text-brand-700 hover:text-brand-900">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
