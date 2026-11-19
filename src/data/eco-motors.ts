import { BookOpen, Calendar, Globe, Mail, Megaphone, Upload } from "lucide-react";

export const TEAM = {
  name: "Eco Motors",
  tagline: "Semillero Eco Motors · FIM UNI · Desde 2023",
  email: "team.ecomotors@uni.edu.pe",
};

const notion = (id: string) => `https://www.notion.so/${id}`;

/** Edita esta lista con los accesos que más usa el equipo. */
export const quickLinks = [
  { label: "Inicio en Notion", href: notion("3fd753ad9210813bb240e04f601e55e6"), icon: BookOpen },
  { label: "Tablón General", href: notion("416753ad92108187b0cee8f7a09e5c39"), icon: Megaphone },
  { label: "Calendario", href: notion("41a753ad9210815ba8b0f55caab559a4"), icon: Calendar },
  { label: "Entregar archivos", href: notion("3fe753ad921081289a32c8bc806e3657"), icon: Upload },
  { label: "Correo del equipo", href: `mailto:${TEAM.email}`, icon: Mail },
  {
    label: "LinkedIn",
    href: "https://es.linkedin.com/posts/eco-motors-uni_eco-motors-uni-en-la-shell-eco-marathon-activity-7368283224801763328-X2X3",
    icon: Globe,
  },
];

export const projects = [
  { name: "HUALKANA", emoji: "⚡", desc: "Prototipos eléctricos de alta eficiencia.", href: notion("3fd753ad92108111b962f9eaf9794ff1") },
  { name: "HYDRA", emoji: "🔋", desc: "Investigación en propulsión con hidrógeno.", href: notion("3fd753ad9210812ab81ed6c89023678d") },
  { name: "URBAN CONCEPT", emoji: "🚘", desc: "Diseño de movilidad urbana sostenible.", href: notion("3fd753ad92108148b10de8b28495f2cc") },
  { name: "POLAR 3D", emoji: "🖨️", desc: "Manufactura e impresión de gran formato.", href: notion("3fd753ad921081b5a986eef64cb49310") },
  { name: "BANCO DE PRUEBAS", emoji: "🧪", desc: "Ensayos y caracterización de motores.", href: notion("3fd753ad92108145b5f6e18c35075c4c") },
];

export const ROLE_STYLES: Record<string, string> = {
  "Coordinador general": "bg-red-100 text-red-700",
  "Supervisor/a": "bg-yellow-100 text-yellow-800",
  "Encargado/a": "bg-orange-100 text-orange-700",
  Integrante: "bg-green-100 text-green-700",
  "Egresado asesor": "bg-purple-100 text-purple-700",
};

export const EVENT_STYLES: Record<string, string> = {
  "Reunión de directores": "bg-blue-100 text-blue-700",
  "Trabajo en taller": "bg-orange-100 text-orange-700",
  "Prueba de pilotos": "bg-red-100 text-red-700",
  Otro: "bg-slate-100 text-slate-700",
};
