"use client";

import { useEffect, useId, useRef, useState } from "react";
import { fmtLap } from "@/lib/pilots";

export type ChartSeries = { name: string; color: string; values: Record<string, number | null | undefined> };
export type ValueFormat = "lap" | "kg" | "h" | "n";

const fmt = (f: ValueFormat, v: number) =>
  f === "lap" ? fmtLap(v) : f === "kg" ? `${Number(v.toFixed(1))} kg` : f === "h" ? `${Number(v.toFixed(1))} h` : `${Number(v.toFixed(2))}`;
const tickFmt = (f: ValueFormat, v: number) => (f === "lap" ? fmtLap(v).replace(/\.00( s)?$/, "$1") : fmt(f, v));

/** Ticks «redondos» (1, 2, 5 × 10ⁿ) para el eje vertical. */
function niceTicks(min: number, max: number, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/**
 * Gráfico de líneas con cursor: al pasar el mouse (o el dedo, o las flechas del teclado)
 * muestra los valores de ese punto. Incluye leyenda (≥ 2 series), etiquetas al final de
 * cada línea cuando no se pisan, y la tabla con todos los datos.
 */
export default function LineChart({
  x, series, format, height = 240, caption, note, legend,
}: {
  x: { key: string; label: string }[];
  series: ChartSeries[];
  format: ValueFormat;
  height?: number;
  caption: string;
  note?: string;
  /** Mostrar la leyenda aunque haya una sola serie (p. ej. cuando cada serie es una persona). */
  legend?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = series.flatMap((s) => x.map((p) => s.values[p.key]).filter((v): v is number => typeof v === "number"));
  if (!all.length) return <p className="text-sm text-neutral-500">Aún no hay datos para este gráfico.</p>;

  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const yMin = ticks[0], yMax = ticks.at(-1)!;
  const multi = series.length > 1;
  const left = format === "lap" ? 58 : 48;
  const top = 12, bottom = 28;

  // Etiquetas al final de cada línea (solo si caben sin pisarse)
  const ends = series
    .map((s) => {
      let lastIdx = -1;
      x.forEach((p, i) => { if (typeof s.values[p.key] === "number") lastIdx = i; });
      return lastIdx < 0 ? null : { s, idx: lastIdx, v: s.values[x[lastIdx].key] as number };
    })
    .filter((e): e is { s: ChartSeries; idx: number; v: number } => !!e);
  const labelW = multi && series.length <= 4 ? Math.min(120, 8 + Math.max(...series.map((s) => s.name.length)) * 6.5) : 0;
  const right = 16 + labelW;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const px = (i: number) => left + (x.length === 1 ? plotW / 2 : (i / (x.length - 1)) * plotW);
  const py = (v: number) => top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const endYs = ends.map((e) => py(e.v)).sort((a, b) => a - b);
  const showEnds = labelW > 0 && endYs.every((y, i) => i === 0 || y - endYs[i - 1] >= 14);

  const every = Math.max(1, Math.ceil(x.length / Math.max(1, Math.floor(plotW / 56))));

  const pick = (clientX: number) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect) return;
    const rel = clientX - rect.left;
    let best = 0, dist = Infinity;
    x.forEach((_, i) => { const d = Math.abs(px(i) - rel); if (d < dist) { dist = d; best = i; } });
    setHover(best);
  };

  const hx = hover !== null ? px(hover) : 0;
  const tipLeft = Math.min(Math.max(hx - 90, 0), width - 180);

  return (
    <figure className="min-w-0">
      {(multi || legend) && (
        <figcaption className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <div ref={wrap} className="relative select-none" onPointerLeave={() => setHover(null)}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={caption}
          aria-describedby={`${id}-t`}
          tabIndex={0}
          className="block max-w-full rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          onPointerMove={(e) => pick(e.clientX)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((h) => Math.min(x.length - 1, (h ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? x.length) - 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={left} x2={left + plotW} y1={py(t)} y2={py(t)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={left - 8} y={py(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#78716c" style={{ fontVariantNumeric: "tabular-nums" }}>
                {tickFmt(format, t)}
              </text>
            </g>
          ))}
          {x.map((p, i) => (i % every === 0 || i === x.length - 1) && (
            <text key={p.key} x={px(i)} y={height - 8} textAnchor={x.length > 1 && i === 0 ? "start" : x.length > 1 && i === x.length - 1 && !showEnds ? "end" : "middle"} fontSize={11} fill="#78716c">{p.label}</text>
          ))}
          {hover !== null && <line x1={hx} x2={hx} y1={top} y2={top + plotH} stroke="#a8a29e" strokeWidth={1} />}
          {series.map((s) => {
            const pts = x.map((p, i) => ({ i, v: s.values[p.key] })).filter((p): p is { i: number; v: number } => typeof p.v === "number");
            const d = pts.map((p, k) => `${k ? "L" : "M"}${px(p.i).toFixed(1)},${py(p.v).toFixed(1)}`).join(" ");
            return (
              <g key={s.name}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {pts.map((p) => (
                  <circle key={p.i} cx={px(p.i)} cy={py(p.v)} r={hover === p.i ? 5.5 : 4} fill={s.color} stroke="#fff" strokeWidth={2} />
                ))}
              </g>
            );
          })}
          {showEnds && ends.map((e) => (
            <text key={e.s.name} x={px(e.idx) + 10} y={py(e.v)} dy="0.32em" fontSize={11} fill="#44403c">{e.s.name}</text>
          ))}
        </svg>
        {hover !== null && (
          <div className="pointer-events-none absolute top-1 z-10 w-44 rounded-lg border border-neutral-200 bg-white/95 p-2 text-xs shadow-lg" style={{ left: tipLeft }}>
            <p className="mb-1 font-semibold text-neutral-800">{x[hover].label}</p>
            {series.map((s) => {
              const v = s.values[x[hover].key];
              return (
                <p key={s.name} className="flex items-center gap-1.5 text-neutral-600">
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate">{s.name}</span>
                  <span className="ml-auto font-medium text-neutral-900" style={{ fontVariantNumeric: "tabular-nums" }}>{typeof v === "number" ? fmt(format, v) : "—"}</span>
                </p>
              );
            })}
          </div>
        )}
      </div>
      {note && <p className="mt-1 text-[11px] text-neutral-500">{note}</p>}
      <details className="mt-2 text-xs" id={`${id}-t`}>
        <summary className="cursor-pointer text-neutral-500 hover:text-brand-600">Ver datos en tabla</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left" style={{ fontVariantNumeric: "tabular-nums" }}>
            <thead className="text-neutral-400"><tr><th className="py-1 pr-3 font-medium">Punto</th>{series.map((s) => <th key={s.name} className="pr-3 font-medium">{s.name}</th>)}</tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {x.map((p) => (
                <tr key={p.key}><td className="py-1 pr-3">{p.label}</td>{series.map((s) => { const v = s.values[p.key]; return <td key={s.name} className="pr-3">{typeof v === "number" ? fmt(format, v) : "—"}</td>; })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
