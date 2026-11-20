"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Download, KeyRound, Loader2, UserCheck } from "lucide-react";
import { createAccounts, resetPassword, type AccountsState } from "@/app/(intranet)/admin/accounts";

type Option = { id: string; full_name: string; email: string | null; hasAccount: boolean };

export default function AccountsPanel({ pending, members }: { pending: number; members: Option[] }) {
  const [created, createAction, creating] = useActionState<AccountsState, FormData>(createAccounts, undefined);
  const [reset, resetAction, resetting] = useActionState<AccountsState, FormData>(resetPassword, undefined);
  const result = reset ?? created;
  const [copied, setCopied] = useState(false);
  const withPw = result?.rows.filter((r) => r.password) ?? [];

  const text = withPw.map((r) => `${r.name}\nUsuario: ${r.email}\nContraseña: ${r.password}`).join("\n\n");
  const csv = "Nombre,Usuario (correo),Contraseña\n" + withPw.map((r) => `"${r.name}","${r.email}","${r.password}"`).join("\n");
  const sel = "min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm";

  return (
    <section className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><UserCheck className="h-5 w-5 text-brand-600" /> Cuentas de acceso</h2>
      <p className="mb-4 text-sm text-neutral-600">
        El usuario de cada persona es <b>su correo</b>. La web genera una contraseña provisional y obliga a cambiarla en el primer acceso.
        Las contraseñas solo se muestran <b>una vez</b>: descárgalas antes de salir de esta página.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <form action={createAction} className="rounded-lg bg-neutral-50 p-4">
          <p className="mb-3 text-sm"><b>{pending}</b> integrantes con correo aún no tienen cuenta.</p>
          <button disabled={creating || pending === 0} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Crear {pending} cuentas
          </button>
        </form>
        <form action={resetAction} className="rounded-lg bg-neutral-50 p-4">
          <p className="mb-3 text-sm">¿Alguien olvidó su contraseña? Genera una nueva:</p>
          <div className="flex gap-2">
            <select name="member_id" required defaultValue="" className={sel}>
              <option value="" disabled>Elige a la persona…</option>
              {members.filter((m) => m.hasAccount).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <button disabled={resetting} className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-sm text-white disabled:opacity-50">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Generar
            </button>
          </div>
        </form>
      </div>

      {result?.error && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{result.error}</p>}

      {!!result?.rows.length && (
        <div className="mt-4">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} Copiar todo
            </button>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + csv)}`}
              download="cuentas-eco-motors.csv"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
            >
              <Download className="h-4 w-4" /> Descargar Excel (CSV)
            </a>
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black text-left text-xs uppercase text-neutral-300">
                <tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Usuario</th><th className="px-3 py-2">Contraseña</th><th className="px-3 py-2">Resultado</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {result.rows.map((r) => (
                  <tr key={r.email}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-neutral-600">{r.email}</td>
                    <td className="px-3 py-2 font-mono font-semibold">{r.password ?? "—"}</td>
                    <td className={`px-3 py-2 text-xs ${r.result.startsWith("Error") ? "text-brand-600" : "text-neutral-500"}`}>{r.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
