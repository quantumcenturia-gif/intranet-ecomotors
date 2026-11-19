"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/me";
import { uploadImage } from "@/lib/images";

export async function updateProject(formData: FormData) {
  const { supabase } = await requireMe();
  const id = String(formData.get("id"));
  const image_url = await uploadImage(supabase, formData.get("image") as File | null, `proyectos/${id}`);
  const { error } = await supabase
    .from("projects")
    .update({ description: String(formData.get("description") ?? ""), ...(image_url && { image_url }) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/proyectos");
  revalidatePath("/");
}
