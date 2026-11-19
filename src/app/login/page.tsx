"use client";

/* eslint-disable @next/next/no-img-element -- logo estático */
import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { login, signup } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);

  return (
    <main className="racing-stripes relative flex min-h-screen items-center justify-center overflow-hidden bg-black p-4">
      <div className="checkered absolute bottom-0 left-0 h-4 w-full opacity-40" />
      <div className="relative w-full max-w-sm">
        <img src="/logo-eco-motors.png" alt="Eco Motors" className="mx-auto mb-8 w-60" />
        <div className="rounded-2xl border-t-4 border-brand-600 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Intranet</h1>
          <p className="text-sm text-neutral-500">
            {mode === "login" ? "Inicia sesión con tu cuenta" : "Crea tu cuenta de integrante"}
          </p>
        </div>

        <form action={action} className="space-y-4">
          {mode === "signup" && (
            <Field label="Nombre completo" name="full_name" type="text" />
          )}
          <Field label="Email" name="email" type="email" />
          <Field label="Contraseña" name="password" type="password" minLength={6} />

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && <p className="text-sm text-emerald-600">{state.message}</p>}

          <button
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Registrarse"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-brand-600 hover:underline"
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
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
