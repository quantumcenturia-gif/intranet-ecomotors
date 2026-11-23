import type { SupabaseClient } from "@supabase/supabase-js";
import { failBack } from "@/lib/action-error";

/** Sube una imagen al bucket público «imagenes» y devuelve su URL pública. */
export async function uploadImage(supabase: SupabaseClient, file: File | null, folder: string) {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) await failBack("El archivo debe ser una imagen.");
  if (file.size > 5 * 1024 * 1024) await failBack("La imagen no puede pesar más de 5 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("imagenes").upload(path, file, { contentType: file.type });
  if (error) await failBack(error.message);
  return supabase.storage.from("imagenes").getPublicUrl(path).data.publicUrl;
}
