"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/me";

export async function addHours(formData: FormData) {
  const { supabase, member } = await requireMe();
  if (!member) throw new Error("Tu cuenta no está vinculada a una ficha de integrante.");
  const horas = Number(String(formData.get("horas") ?? "").replace(",", "."));
  if (!(horas > 0 && horas <= 24)) throw new Error("Las horas deben estar entre 0 y 24.");
  const actividad = String(formData.get("actividad") ?? "").trim();
  if (!actividad) throw new Error("Describe la actividad.");
  const task = String(formData.get("task_id") ?? "");
  const { error } = await supabase.from("time_entries").insert({
    member_id: member.id,
    fecha: String(formData.get("fecha")) || undefined,
    horas,
    actividad,
    task_id: task ? Number(task) : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/horas");
}

export async function deleteHours(formData: FormData) {
  const { supabase } = await requireMe();
  const { error } = await supabase.from("time_entries").delete().eq("id", Number(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/horas");
}
