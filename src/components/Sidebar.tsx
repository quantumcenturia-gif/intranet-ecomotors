"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, FileText, Home, LogOut, Megaphone, Menu, User, Users, X } from "lucide-react";

const links = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/noticias", label: "Noticias", icon: Megaphone },
  { href: "/directorio", label: "Directorio", icon: Users },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/perfil", label: "Mi perfil", icon: User },
];

export default function Sidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="flex items-center gap-2 font-semibold">
          <Building2 className="h-5 w-5 text-indigo-600" /> Intranet
        </span>
        <button onClick={() => setOpen(!open)} aria-label="Menú">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      <aside
        className={`${open ? "block" : "hidden"} border-r border-slate-200 bg-white md:flex md:min-h-screen md:w-64 md:flex-col`}
      >
        <div className="hidden items-center gap-2 px-6 py-5 text-lg font-semibold md:flex">
          <Building2 className="h-6 w-6 text-indigo-600" /> Intranet
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-5 w-5" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="mb-3 text-xs capitalize text-slate-500">{role}</p>
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
