"use client";

import { useActionState, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { login, signup } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-700 to-blue-500 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-semibold">Intranet Eco Motors</h1>
          <p className="text-sm text-slate-500">
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
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "Entrar" : "Registrarse"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-blue-600 hover:underline"
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </main>
  );
}

function Field(props: { label: string; name: string; type: string; minLength?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{props.label}</span>
      <input
        required
        name={props.name}
        type={props.type}
        minLength={props.minLength}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
    </label>
  );
}
