"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/me";
import { generatePassword } from "@/lib/passwords";

export type AccountRow = { name: string; email: string; password: string | null; result: string };
export type AccountsState = { rows: AccountRow[]; error?: string } | undefined;

async function admin() {
  const me = await requireMe();
  if (!me.isAdmin) throw new Error("Solo coordinación puede hacer esto.");
  return me;
}

/** Crea cuenta a todas las fichas con correo que aún no tienen (o a una sola). */
export async function createAccounts(_: AccountsState, formData: FormData): Promise<AccountsState> {
  const { supabase } = await admin();
  const only = String(formData.get("member_id") ?? "");
  let q = supabase.from("members").select("id,full_name,email").not("email", "is", null).is("profile_id", null).neq("estado", "Miembro retirado").order("full_name");
  if (only) q = q.eq("id", only);
  const { data, error } = await q;
  if (error) return { rows: [], error: error.message };

  const rows: AccountRow[] = [];
  for (const m of data ?? []) {
    const password = generatePassword();
    const r = await supabase.rpc("admin_create_account", { p_member: m.id, p_password: password });
    if (r.error) rows.push({ name: m.full_name, email: m.email!, password: null, result: `Error: ${r.error.message}` });
    else if (r.data === "existe") rows.push({ name: m.full_name, email: m.email!, password: null, result: "Ya tenía cuenta" });
    else rows.push({ name: m.full_name, email: m.email!, password, result: "Cuenta creada" });
  }
  revalidatePath("/admin");
  return { rows, error: rows.length ? undefined : "No hay fichas pendientes: todas las que tienen correo ya tienen cuenta." };
}

/** Genera una contraseña nueva para alguien que la olvidó. */
export async function resetPassword(_: AccountsState, formData: FormData): Promise<AccountsState> {
  const { supabase } = await admin();
  const id = String(formData.get("member_id") ?? "");
  const { data: m } = await supabase.from("members").select("id,full_name,email").eq("id", id).maybeSingle();
  if (!m?.email) return { rows: [], error: "Esa ficha no tiene correo." };
  const password = generatePassword();
  const r = await supabase.rpc("admin_reset_password", { p_member: m.id, p_password: password });
  if (r.error) return { rows: [], error: r.error.message };
  if (r.data === "sin cuenta") return { rows: [], error: `${m.full_name} aún no tiene cuenta. Créala primero.` };
  return { rows: [{ name: m.full_name, email: m.email, password, result: "Contraseña nueva" }] };
}
