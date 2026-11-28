"use client";

import { useState } from "react";

/**
 * Columnas de una sola serie (p. ej. tareas completadas por mes). Al pasar el mouse
 * o enfocar una columna se resalta y muestra su valor; incluye la tabla de datos.
 */
export default function BarChart({
  data, caption, unit = "", color = "#2a78d6", height = 150,
}: {
  data: { key: string; label: string; value: number }[];
  caption: string;
  unit?: string;
  color?: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const plotH = height - 40;

  return (
    <figure className="min-w-0">
      <div role="img" aria-label={caption} className="flex items-end gap-2" style={{ height }} onPointerLeave={() => setHover(null)}>
        {data.map((d, i) => {
          const h = d.value ? Math.max(4, (d.value / max) * plotH) : 0;
          return (
            <div
              key={d.key}
              tabIndex={0}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-1 focus:outline-none"
              aria-label={`${d.label}: ${d.value}${unit}`}
            >
              <span className={`text-[11px] font-medium ${hover === i ? "text-neutral-900" : "text-neutral-500"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                {d.value ? `${d.value}${unit}` : ""}
              </span>
              <div
                className="grow-y w-full max-w-6 rounded-t transition-[opacity,height] duration-500"
                style={{ height: h, background: color, opacity: hover === null || hover === i ? 1 : 0.45 }}
              />
              <div className="h-px w-full bg-neutral-200" />
              <span className={`w-full truncate text-center text-[10px] ${hover === i ? "text-neutral-900" : "text-neutral-400"}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-neutral-500 hover:text-brand-600">Ver datos en tabla</summary>
        <table className="mt-2 text-left" style={{ fontVariantNumeric: "tabular-nums" }}>
          <tbody className="divide-y divide-neutral-100">
            {data.map((d) => <tr key={d.key}><td className="py-1 pr-6">{d.label}</td><td>{d.value}{unit}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
