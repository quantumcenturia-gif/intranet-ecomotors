"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name")),
      department: String(formData.get("department")),
      position: String(formData.get("position")),
      phone: String(formData.get("phone")),
      birthday: String(formData.get("birthday")) || null,
      avatar_url: String(formData.get("avatar_url")) || null,
    })
    .eq("id", user.id);
  revalidatePath("/", "layout");
}
