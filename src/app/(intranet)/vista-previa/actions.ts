"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/me";
import { failBack } from "@/lib/action-error";

export async function startPreview(formData: FormData) {
  const { supabase, realAdmin } = await requireMe();
  if (!realAdmin) await failBack("Solo dirección general puede usar la vista previa.");
  const { error } = await supabase.rpc("preview_start", { p_rol: String(formData.get("rol")), p_unit: String(formData.get("unit_id")) });
  if (error) await failBack(error.message);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function stopPreview() {
  const { supabase } = await requireMe();
  const { error } = await supabase.rpc("preview_stop");
  if (error) await failBack(error.message);
  revalidatePath("/", "layout");
  redirect("/vista-previa");
}
