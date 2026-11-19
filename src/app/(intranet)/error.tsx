"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function IntranetError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-xl border border-brand-200 bg-white p-6 text-center">
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-brand-600" />
      <p className="font-semibold">Algo no ha salido bien</p>
      <p className="mt-1 text-sm text-neutral-600">{error.message}</p>
      <button onClick={reset} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white">
        <RotateCcw className="h-4 w-4" /> Reintentar
      </button>
    </div>
  );
}
