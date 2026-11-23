"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/me";
import { uploadImage } from "@/lib/images";
import { failBack } from "@/lib/action-error";

export async function updateProfile(formData: FormData) {
  const { supabase, user, member } = await requireWriter();
  const s = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const avatar_url = await uploadImage(supabase, formData.get("avatar") as File | null, `avatares/${user.id}`);

  await supabase.from("profiles").update({ full_name: s("full_name") }).eq("id", user.id);
  if (member) {
    const { error } = await supabase
      .from("members")
      .update({
        full_name: s("full_name") ?? member.full_name,
        phone: s("phone"),
        birthday: s("birthday"),
        bio: s("bio"),
        especialidad: s("especialidad"),
        ciclo: s("ciclo") ? Math.min(12, Math.max(1, Number(s("ciclo")))) : null,
        ...(avatar_url && { avatar_url }),
      })
      .eq("id", member.id);
    if (error) await failBack(error.message);
  }
  revalidatePath("/", "layout");
}
