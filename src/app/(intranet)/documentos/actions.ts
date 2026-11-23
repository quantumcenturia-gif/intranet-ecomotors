"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWriter } from "@/lib/me";
import { failBack } from "@/lib/action-error";

const BUCKET = "documentos";

export async function uploadDocument(formData: FormData) {
  await requireWriter();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) await failBack(error.message);
  const unit_id = String(formData.get("unit_id") ?? "") || null;
  const categoria = String(formData.get("categoria") ?? "Otro");
  const ins = await supabase.from("documents").insert({ name: file.name, path, size: file.size, unit_id, categoria });
  if (ins.error) {
    await supabase.storage.from(BUCKET).remove([path]);
    await failBack(ins.error.message);
  }
  revalidatePath("/documentos");
}

export async function downloadDocument(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(String(formData.get("path")), 60, { download: String(formData.get("name")) });
  if (error || !data) return failBack(error?.message ?? "No se pudo descargar.");
  redirect(data.signedUrl);
}

export async function deleteDocument(formData: FormData) {
  await requireWriter();
  const supabase = await createClient();
  const path = String(formData.get("path"));
  await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from("documents").delete().eq("path", path);
  revalidatePath("/documentos");
}
