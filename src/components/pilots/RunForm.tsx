"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Label, btnPrimary, inputCls } from "@/components/ui";
import { fmtLap, parseLaps, runStats, TRAJES_SUGERIDOS } from "@/lib/pilots";
import { createRun } from "@/app/(intranet)/pilotos/actions";

type Opt = { id: string; name: string };

/** Formulario rápido para registrar un intento: calcula el n.º de intento y muestra los tiempos mientras se escriben. */
export default function RunForm({
  pilots, projects, used, trajes, pistas, defaultPilot, defaultDate, lastBy,
}: {
  pilots: Opt[];
  projects: Opt[];
  used: { piloto_id: string; fecha: string; intento: number }[];
  trajes: string[];
  pistas: string[];
  defaultPilot?: string;
  defaultDate: string;
  lastBy: Record<string, { peso_kg: number | null; traje: string | null; project_id: string | null; pista: string | null }>;
}) {
  const [pilot, setPilot] = useState(defaultPilot ?? pilots[0]?.id ?? "");
  const [fecha, setFecha] = useState(defaultDate);
  const [laps, setLaps] = useState("");
  const next = useMemo(
    () => 1 + Math.max(0, ...used.filter((u) => u.piloto_id === pilot && u.fecha === fecha).map((u) => u.intento)),
    [used, pilot, fecha],
  );
  const parsed = parseLaps(laps);
  const stats = runStats({ vueltas: parsed.laps });
  const last = lastBy[pilot];

  return (
    <form action={createRun} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Label label="Piloto">
        <select name="piloto_id" value={pilot} onChange={(e) => setPilot(e.target.value)} className={inputCls} required>
          {pilots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Label>
      <Label label="Fecha de la prueba">
        <input type="date" name="fecha" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} required />
      </Label>
      <Label label="N.º de intento">
        <input key={`${pilot}-${fecha}-${next}`} type="number" name="intento" min={1} max={99} defaultValue={next} className={inputCls} />
      </Label>
      <Label label="Prototipo">
        <select key={`p-${pilot}`} name="project_id" defaultValue={last?.project_id ?? "hualkana"} className={inputCls}>
          <option value="">—</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Label>
      <Label label="Peso del piloto (kg)">
        <input key={`w-${pilot}`} name="peso_kg" inputMode="decimal" placeholder="Ej. 54.5" defaultValue={last?.peso_kg ?? ""} className={inputCls} />
      </Label>
      <Label label="Tipo de traje">
        <input key={`t-${pilot}`} name="traje" list="trajes" placeholder="Ej. Buzo ignífugo" defaultValue={last?.traje ?? ""} className={inputCls} />
        <datalist id="trajes">{[...new Set([...trajes, ...TRAJES_SUGERIDOS])].map((t) => <option key={t} value={t} />)}</datalist>
      </Label>
      <Label label="Pista o lugar" className="sm:col-span-2">
        <input key={`l-${pilot}`} name="pista" list="pistas" placeholder="Ej. Estacionamiento FIM" defaultValue={last?.pista ?? ""} className={inputCls} />
        <datalist id="pistas">{pistas.map((t) => <option key={t} value={t} />)}</datalist>
      </Label>
      <Label label="Tiempos de vuelta (uno por vuelta)" className="sm:col-span-2 lg:col-span-4">
        <textarea
          name="vueltas"
          required
          rows={2}
          value={laps}
          onChange={(e) => setLaps(e.target.value)}
          placeholder="1:32.5  1:30.8  1:29.9   (minutos:segundos, o solo segundos: 92.5 90.8 89.9)"
          className={`${inputCls} font-mono`}
        />
      </Label>
      <div className="sm:col-span-2 lg:col-span-4">
        {parsed.error ? (
          <p className="text-xs text-red-600">⚠️ {parsed.error}</p>
        ) : stats.count ? (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
            <span><b>{stats.count}</b> vuelta{stats.count > 1 ? "s" : ""}</span>
            <span>Mejor: <b>{fmtLap(stats.best)}</b></span>
            <span>Promedio: <b>{fmtLap(stats.avg)}</b></span>
            <span>Total: <b>{fmtLap(stats.total)}</b></span>
          </p>
        ) : (
          <p className="text-xs text-neutral-400">Escribe los tiempos separados por espacios o saltos de línea.</p>
        )}
      </div>
      <Label label="Notas (opcional)" className="sm:col-span-2 lg:col-span-3">
        <input name="notas" placeholder="Clima, presión de llantas, incidencias…" className={inputCls} />
      </Label>
      <div className="flex items-end">
        <button className={`${btnPrimary} w-full`} disabled={!!parsed.error || !stats.count}>
          <Save className="h-4 w-4" /> Guardar intento
        </button>
      </div>
    </form>
  );
}
