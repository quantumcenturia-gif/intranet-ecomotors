"use client";

/* eslint-disable @next/next/no-img-element -- logo estático */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const linkError = useSearchParams().get("error") === "enlace";
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="racing-stripes relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      <div className="checkered absolute bottom-0 left-0 h-4 w-full opacity-40" />
      <div className="relative w-full max-w-sm">
        <img src="/logo-eco-motors.png" alt="Eco Motors" className="mx-auto mb-8 w-60" />
        <div className="rounded-2xl border-t-4 border-brand-600 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Intranet</h1>
          <p className="text-sm text-neutral-500">
            Inicia sesión con tu correo
          </p>
        </div>

        <form action={action} className="space-y-4">
          <Field label="Email" name="email" type="email" />
          <Field label="Contraseña" name="password" type="password" minLength={6} />

          {(
            <Link href="/recuperar" className="-mt-2 block text-right text-xs text-neutral-500 hover:text-brand-600">
              ¿Olvidaste tu contraseña?
            </Link>
          )}
          {linkError && !state && (
            <p className="text-sm text-red-600">El enlace del correo no es válido o ha caducado. Pide uno nuevo.</p>
          )}
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && <p className="text-sm text-emerald-600">{state.message}</p>}

          <button
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-500">
          ¿No tienes cuenta? Pídesela a coordinación.
        </p>
        </div>
        <p className="mt-6 text-center text-xs uppercase tracking-widest text-neutral-400">
          Más que un equipo, una pasión por la innovación
        </p>
      </div>
    </main>
  );
}

function Field(props: { label: string; name: string; type: string; minLength?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{props.label}</span>
      <input
        required
        name={props.name}
        type={props.type}
        minLength={props.minLength}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}
