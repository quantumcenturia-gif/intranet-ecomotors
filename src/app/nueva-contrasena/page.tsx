"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { setNewPassword } from "../login/actions";

export default function NuevaContrasenaPage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}

function Form() {
  const first = useSearchParams().get("primera") === "1";
  const [state, action, pending] = useActionState(setNewPassword, undefined);
  useEffect(() => {
    // Recarga completa a propósito: con router.push() el router reutiliza la redirección
    // cacheada a esta misma página y el usuario se queda aquí.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (state?.done) window.location.assign("/?pw=ok");
  }, [state]);
  const input = "w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200";
  return (
    <AuthShell title={first ? "¡Bienvenido/a!" : "Nueva contraseña"} subtitle={first ? "Por seguridad, cambia la contraseña provisional que te dieron" : "Elige una contraseña para tu cuenta"}>
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
        {state?.done && <p className="text-sm text-emerald-700">✅ Contraseña guardada. Entrando…</p>}
        <button disabled={pending || state?.done} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar contraseña
        </button>
      </form>
    </AuthShell>
  );
}
