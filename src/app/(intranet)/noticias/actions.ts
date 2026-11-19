"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "@/lib/images";

export async function createAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const image_url = await uploadImage(supabase, formData.get("image") as File | null, "noticias");
  const { error } = await supabase.from("announcements").insert({
    title: String(formData.get("title")),
    body: String(formData.get("body")),
    image_url,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/noticias");
  revalidatePath("/");
}

export async function deleteAnnouncement(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/noticias");
  revalidatePath("/");
}
