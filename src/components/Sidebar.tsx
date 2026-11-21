"use client";

/* eslint-disable @next/next/no-img-element -- logo estático pequeño */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Bell, FileBarChart, CalendarDays, ClipboardCheck, Clock, FileText, Home, ListChecks, LogOut, Megaphone, Menu, Rocket, Shield, User, Users, X } from "lucide-react";

const links = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/tareas", label: "Tareas", icon: ListChecks },
  { href: "/asistencia", label: "Asistencia", icon: ClipboardCheck },
  { href: "/horas", label: "Horas", icon: Clock },
  { href: "/avisos", label: "Avisos", icon: Bell },
  { href: "/noticias", label: "Comunicados", icon: Megaphone },
  { href: "/directorio", label: "Directorio de Equipo", icon: Users },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/proyectos", label: "Proyectos", icon: Rocket },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/perfil", label: "Mi perfil", icon: User },
];
const panelLink = { href: "/panel", label: "Panel de supervisión", icon: BarChart3 };
const reportLink = { href: "/reportes", label: "Reportes", icon: FileBarChart };
const adminLink = { href: "/admin", label: "Administración", icon: Shield };

export default function Sidebar({
  name, role, isAdmin, isManager, unread,
}: { name: string; role: string; isAdmin: boolean; isManager: boolean; unread: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between print:hidden border-b-2 border-brand-600 bg-black px-4 py-2 text-white md:hidden">
        <img src="/logo-eco-motors.png" alt="Eco Motors" className="h-8 w-auto" />
        <div className="flex items-center gap-4">
        <Link href="/avisos" aria-label="Avisos" className="relative">
          <Bell className="h-6 w-6" />
          {unread > 0 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold">{unread}</span>}
        </Link>
        <button onClick={() => setOpen(!open)} aria-label="Menú">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        </div>
      </header>

      <aside
        className={`${open ? "flex" : "hidden"} print:!hidden flex-col bg-black text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0`}
      >
        <div className="hidden px-6 pt-7 pb-5 md:block">
          <img src="/logo-eco-motors.png" alt="Eco Motors" className="w-full" />
        </div>
        <div className="checkered mx-5 hidden h-2 rounded-sm opacity-80 md:block" />

        <nav className="flex-1 space-y-1 px-3 py-4">
          {[...links, ...(isManager ? [panelLink, reportLink] : []), ...(isAdmin ? [adminLink] : [])].map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand-600 text-white shadow-lg shadow-brand-900/40"
                    : "text-neutral-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" /> {label}
                {href === "/avisos" && unread > 0 && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-bold ${active ? "bg-white text-brand-600" : "bg-brand-600 text-white"}`}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="mb-3 text-xs text-brand-400">{role}</p>
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-2 text-sm text-neutral-400 hover:text-brand-400">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
