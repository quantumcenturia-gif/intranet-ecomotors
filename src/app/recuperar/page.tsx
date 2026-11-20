"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { requestPasswordReset } from "../login/actions";

export default function RecuperarPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace a tu correo">
      {state?.message ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{state.message}</p>
      ) : (
        <form action={action} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">Email</span>
            <input name="email" type="email" required className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
          </label>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <button disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Enviar enlace
          </button>
        </form>
      )}
      <Link href="/login" className="mt-4 flex items-center justify-center gap-1 text-sm text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a iniciar sesión
      </Link>
    </AuthShell>
  );
}
