"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "documentos";

export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  const supabase = await createClient();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(error.message);
  await supabase.from("documents").insert({ name: file.name, path, size: file.size });
  revalidatePath("/documentos");
}

export async function downloadDocument(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(String(formData.get("path")), 60, { download: String(formData.get("name")) });
  if (error) throw new Error(error.message);
  redirect(data.signedUrl);
}

export async function deleteDocument(formData: FormData) {
  const supabase = await createClient();
  const path = String(formData.get("path"));
  await supabase.storage.from(BUCKET).remove([path]);
  await supabase.from("documents").delete().eq("path", path);
  revalidatePath("/documentos");
}
