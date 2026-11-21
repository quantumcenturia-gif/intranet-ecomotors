"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/me";

export async function startPreview(formData: FormData) {
  const { supabase, realAdmin } = await requireMe();
  if (!realAdmin) throw new Error("Solo dirección general puede usar la vista previa.");
  const { error } = await supabase.rpc("preview_start", { p_rol: String(formData.get("rol")), p_unit: String(formData.get("unit_id")) });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function stopPreview() {
  const { supabase } = await requireMe();
  const { error } = await supabase.rpc("preview_stop");
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  redirect("/vista-previa");
}
