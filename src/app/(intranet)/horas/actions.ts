"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/me";
import { failBack } from "@/lib/action-error";

export async function addHours(formData: FormData) {
  const { supabase, member } = await requireWriter();
  if (!member) return failBack("Tu cuenta no está vinculada a una ficha de integrante.");
  const horas = Number(String(formData.get("horas") ?? "").replace(",", "."));
  if (!(horas > 0 && horas <= 24)) await failBack("Las horas deben estar entre 0 y 24.");
  const actividad = String(formData.get("actividad") ?? "").trim();
  if (!actividad) await failBack("Describe la actividad.");
  const task = String(formData.get("task_id") ?? "");
  const { error } = await supabase.from("time_entries").insert({
    member_id: member.id,
    fecha: String(formData.get("fecha")) || undefined,
    horas,
    actividad,
    task_id: task ? Number(task) : null,
  });
  if (error) await failBack(error.message);
  revalidatePath("/horas");
}

export async function deleteHours(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.from("time_entries").delete().eq("id", Number(formData.get("id")));
  if (error) await failBack(error.message);
  revalidatePath("/horas");
}
