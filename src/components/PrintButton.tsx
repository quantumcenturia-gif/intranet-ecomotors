"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
      <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
    </button>
  );
}
