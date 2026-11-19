"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/me";
import { importFromNotion } from "@/lib/notion-import";

async function admin() {
  const me = await requireMe();
  if (!me.isAdmin) throw new Error("Solo coordinación puede hacer esto.");
  return me;
}
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;

export async function runNotionImport() {
  const { supabase } = await admin();
  const r = await importFromNotion(supabase);
  revalidatePath("/", "layout");
  redirect(`/admin?ok=${encodeURIComponent(`Importados ${r.members} integrantes y ${r.events} actividades desde Notion.`)}`);
}

export async function saveMember(formData: FormData) {
  const { supabase } = await admin();
  const id = s(formData, "id");
  const row = {
    full_name: s(formData, "full_name") ?? "Sin nombre",
    unit_id: s(formData, "unit_id") ?? "por-asignar",
    rol: s(formData, "rol") ?? "Integrante",
    estado: s(formData, "estado") ?? "Activo",
    condicion: s(formData, "condicion") ?? "Miembro confirmado",
    email: s(formData, "email")?.toLowerCase() ?? null,
  };
  const { error } = id
    ? await supabase.from("members").update(row).eq("id", id)
    : await supabase.from("members").insert(row);
  if (error) throw new Error(error.message.includes("members_email_key") ? "Ese correo ya está en otra ficha." : error.message);
  revalidatePath("/admin");
  revalidatePath("/directorio");
}
