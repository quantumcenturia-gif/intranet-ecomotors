/* eslint-disable @next/next/no-img-element -- logo estático */
import type { ReactNode } from "react";

/** Fondo negro con franjas y logo, compartido por login y recuperación. */
export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="racing-stripes relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      <div className="checkered absolute bottom-0 left-0 h-4 w-full opacity-40" />
      <div className="relative w-full max-w-sm">
        <img src="/logo-eco-motors.png" alt="Eco Motors" className="mx-auto mb-8 w-60" />
        <div className="rounded-2xl border-t-4 border-brand-600 bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-neutral-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
