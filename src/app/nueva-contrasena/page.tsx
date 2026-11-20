"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { setNewPassword } from "../login/actions";

export default function NuevaContrasenaPage() {
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
  return (
    <AuthShell title="Nueva contraseña" subtitle="Elige una contraseña para tu cuenta">
      <form action={action} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Nueva contraseña</span>
          <input name="password" type="password" minLength={6} required className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Repítela</span>
          <input name="confirm" type="password" minLength={6} required className={input} />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar contraseña
        </button>
      </form>
    </AuthShell>
  );
}
