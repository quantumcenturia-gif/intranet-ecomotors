"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/me";
import { uploadImage } from "@/lib/images";
import { failBack } from "@/lib/action-error";

export async function updateProject(formData: FormData) {
  const { supabase } = await requireWriter();
  const id = String(formData.get("id"));
  const image_url = await uploadImage(supabase, formData.get("image") as File | null, `proyectos/${id}`);
  const { error } = await supabase
    .from("projects")
    .update({ description: String(formData.get("description") ?? ""), ...(image_url && { image_url }) })
    .eq("id", id);
  if (error) await failBack(error.message);
  revalidatePath("/proyectos");
  revalidatePath("/");
}
