import { Calendar, FolderOpen, Globe, ListChecks, Mail, Rocket } from "lucide-react";

export const TEAM = {
  name: "Eco Motors",
  tagline: "Semillero Eco Motors · FIM UNI · Desde 2023",
  email: "team.ecomotors@uni.edu.pe",
  slogan: "Más que un equipo, una pasión por la innovación",
};

/** Edita esta lista con los accesos que más usa el equipo. */
export const quickLinks = [
  { label: "Mis tareas", href: "/tareas", icon: ListChecks },
  { label: "Calendario", href: "/calendario", icon: Calendar },
  { label: "Documentos", href: "/documentos", icon: FolderOpen },
  { label: "Proyectos", href: "/proyectos", icon: Rocket },
  { label: "Correo del equipo", href: `mailto:${TEAM.email}`, icon: Mail },
  {
    label: "LinkedIn",
    href: "https://es.linkedin.com/posts/eco-motors-uni_eco-motors-uni-en-la-shell-eco-marathon-activity-7368283224801763328-X2X3",
    icon: Globe,
  },
];

export const ROLES = ["Coordinador general", "Supervisor/a", "Encargado/a", "Integrante", "Egresado asesor"] as const;
export const ESTADOS_MIEMBRO = ["Activo", "Inactivo justificado", "Miembro retirado", "Egresado asesor"] as const;
export const CONDICIONES = ["Miembro confirmado", "Por confirmar", "Postulante"] as const;

export const TASK_ESTADOS = ["Pendiente", "En proceso", "En revisión", "Completada y validada", "Observada", "Cancelada"] as const;
export const TASK_TIPOS = ["Del encargado", "Del integrante", "Coordinación con subárea", "De supervisión"] as const;
export const PRIORIDADES = ["ALTA", "MEDIA", "BAJA"] as const;
export const EVENT_TIPOS = ["Reunión de directores", "Trabajo en taller", "Prueba de pilotos", "Otro"] as const;
export const DIRIGIDO_A = ["Todo el equipo", "Directores", "Pilotos"] as const;

export const ESTADO_STYLES: Record<string, string> = {
  Pendiente: "bg-neutral-100 text-neutral-700",
  "En proceso": "bg-neutral-900 text-white",
  "En revisión": "bg-brand-100 text-brand-700",
  "Completada y validada": "bg-emerald-100 text-emerald-700",
  Observada: "bg-amber-100 text-amber-800",
  Cancelada: "bg-neutral-100 text-neutral-400 line-through",
  Atrasada: "bg-brand-600 text-white",
};

export const PRIORIDAD_STYLES: Record<string, string> = {
  ALTA: "text-brand-600",
  MEDIA: "text-neutral-700",
  BAJA: "text-neutral-400",
};

/** Una tarea abierta con fecha límite pasada se muestra como «Atrasada». */
export function estadoVisible(t: { estado: string; fecha_limite: string | null }) {
  const abierta = !["Completada y validada", "Cancelada"].includes(t.estado);
  const hoy = new Date().toISOString().slice(0, 10);
  return abierta && t.fecha_limite && t.fecha_limite < hoy ? "Atrasada" : t.estado;
}

export const ROLE_STYLES: Record<string, string> = {
  "Coordinador general": "bg-brand-600 text-white",
  "Supervisor/a": "bg-neutral-900 text-white",
  "Encargado/a": "bg-brand-100 text-brand-700",
  Integrante: "bg-neutral-100 text-neutral-700",
  "Egresado asesor": "border border-neutral-300 text-neutral-600",
};

export const EVENT_STYLES: Record<string, string> = {
  "Reunión de directores": "bg-neutral-900 text-white",
  "Trabajo en taller": "bg-brand-100 text-brand-700",
  "Prueba de pilotos": "bg-brand-600 text-white",
  Otro: "bg-neutral-100 text-neutral-700",
};
