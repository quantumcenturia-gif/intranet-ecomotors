/** Seguridad: niveles de riesgo, peligros, EPP y estados del permiso de trabajo. */

export const RIESGOS = ["Bajo", "Medio", "Alto", "Crítico"] as const;
export type Riesgo = (typeof RIESGOS)[number];
export const RIESGO_NIVEL: Record<string, number> = { Bajo: 0, Medio: 1, Alto: 2, Crítico: 3 };
export const necesitaPermiso = (r: string | null | undefined) => (RIESGO_NIVEL[r ?? "Bajo"] ?? 0) >= 1;

export const RIESGO_INFO: Record<Riesgo, string> = {
  Bajo: "Trabajo de escritorio o con herramientas simples. No necesita aprobación.",
  Medio: "Herramientas de corte, químicos, resinas o cargas. Seguridad debe aprobarlo.",
  Alto: "Soldadura, baterías, pruebas en pista o altura. Seguridad debe aprobarlo y fijar condiciones.",
  Crítico: "Puede causar lesiones graves. Solo con aprobación y supervisión de Seguridad en el lugar.",
};

export const RIESGO_STYLES: Record<string, string> = {
  Bajo: "bg-neutral-100 text-neutral-700",
  Medio: "bg-amber-100 text-amber-900",
  Alto: "bg-orange-600 text-white",
  Crítico: "bg-red-700 text-white",
};

/** Peligros frecuentes en el taller y el nivel mínimo de riesgo que implican. */
export const PELIGROS: { nombre: string; minimo: Riesgo }[] = [
  { nombre: "Soldadura o corte con calor", minimo: "Alto" },
  { nombre: "Baterías de litio o alta tensión", minimo: "Alto" },
  { nombre: "Pruebas en pista o vehículo en movimiento", minimo: "Alto" },
  { nombre: "Trabajo en altura", minimo: "Alto" },
  { nombre: "Amoladora o herramientas de corte", minimo: "Medio" },
  { nombre: "Materiales compuestos y resinas", minimo: "Medio" },
  { nombre: "Químicos, solventes o pinturas", minimo: "Medio" },
  { nombre: "Cargas pesadas o izaje", minimo: "Medio" },
  { nombre: "Taladro y herramientas eléctricas", minimo: "Bajo" },
  { nombre: "Lijado o polvo", minimo: "Bajo" },
  { nombre: "Ruido intenso", minimo: "Bajo" },
];

export const EPP = [
  "Lentes de seguridad",
  "Careta facial",
  "Careta de soldar",
  "Guantes anticorte",
  "Guantes de nitrilo",
  "Guantes de soldador",
  "Guantes aislantes",
  "Respirador o mascarilla",
  "Protección auditiva",
  "Zapatos de seguridad",
  "Mandil o ropa ignífuga",
  "Casco",
];

/** El riesgo final nunca es menor que el que exigen los peligros marcados. */
export function riesgoMinimo(elegido: string, peligros: string[]): Riesgo {
  let nivel = RIESGO_NIVEL[elegido] ?? 0;
  for (const p of PELIGROS) if (peligros.includes(p.nombre)) nivel = Math.max(nivel, RIESGO_NIVEL[p.minimo]);
  return RIESGOS[nivel];
}

export const PERMISO_STYLES: Record<string, string> = {
  "No requiere": "bg-neutral-100 text-neutral-600",
  Pendiente: "bg-amber-100 text-amber-900",
  Aprobada: "bg-emerald-100 text-emerald-800",
  "Aprobada con condiciones": "bg-emerald-100 text-emerald-800",
  Rechazada: "bg-red-100 text-red-800",
};
export const PERMISO_ICON: Record<string, string> = {
  "No requiere": "",
  Pendiente: "⏳",
  Aprobada: "✅",
  "Aprobada con condiciones": "✅",
  Rechazada: "⛔",
};

export const REPORTE_TIPOS = ["Falta de EPP", "Acto inseguro", "Condición insegura", "Casi accidente", "Incidente", "Accidente"] as const;
export const SEVERIDADES = ["Leve", "Moderada", "Grave"] as const;
export const REPORTE_ESTADOS = ["Abierto", "En seguimiento", "Cerrado"] as const;
export const SEVERIDAD_STYLES: Record<string, string> = {
  Leve: "bg-neutral-100 text-neutral-700",
  Moderada: "bg-amber-100 text-amber-900",
  Grave: "bg-red-100 text-red-800",
};
export const FICHA_CATEGORIAS = ["Reglas del taller", "Material", "Herramienta", "Proceso", "EPP", "Emergencia"] as const;

/** «sáb 30 nov, 15:00» en hora de Lima. */
export const fmtFechaHora = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("es-PE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Lima" })
    : "—";

/** ISO → valor de <input type="datetime-local"> en hora de Lima (UTC−5, sin horario de verano). */
export function toLimaInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}
/** Valor de <input type="datetime-local"> (hora de Lima) → ISO con zona. */
export const fromLimaInput = (v: string | null) => (v ? `${v}:00-05:00` : null);
