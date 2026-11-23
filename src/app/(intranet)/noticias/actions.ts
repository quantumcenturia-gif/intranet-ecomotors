"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/me";
import { uploadImage } from "@/lib/images";
import { failBack } from "@/lib/action-error";

export async function createAnnouncement(formData: FormData) {
  const { supabase, isAdmin, manageable } = await requireWriter();
  const para = String(formData.get("para") ?? "__todos__");
  const unit_id = para === "__todos__" ? null : para;
  if (!unit_id && !isAdmin) await failBack("Solo coordinación puede publicar para todo el equipo. Elige tu área o subárea.");
  if (unit_id && !isAdmin && !manageable.has(unit_id)) await failBack("Solo puedes publicar comunicados para las áreas que diriges.");
  const image_url = await uploadImage(supabase, formData.get("image") as File | null, "noticias");
  const { error } = await supabase.from("announcements").insert({
    title: String(formData.get("title")),
    body: String(formData.get("body")),
    unit_id,
    image_url,
  });
  if (error) await failBack(error.message);
  revalidatePath("/noticias");
  revalidatePath("/");
}

export async function deleteAnnouncement(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.from("announcements").delete().eq("id", Number(formData.get("id")));
  if (error) await failBack(error.message);
  revalidatePath("/noticias");
  revalidatePath("/");
}
