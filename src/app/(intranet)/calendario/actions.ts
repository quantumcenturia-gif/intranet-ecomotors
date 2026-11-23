"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/me";
import { failBack } from "@/lib/action-error";

export async function createEvent(formData: FormData) {
  const { supabase } = await requireWriter();
  const s = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const date = s("date");
  if (!date) await failBack("Elige una fecha.");
  const start = s("start"), end = s("end");
  const { error } = await supabase.from("events").insert({
    title: s("title"),
    start_at: `${date}T${start ?? "00:00"}:00-05:00`,
    end_at: end ? `${date}T${end}:00-05:00` : null,
    all_day: !start,
    tipo: s("tipo") ?? "Otro",
    lugar: s("lugar"),
    dirigido_a: formData.getAll("dirigido_a").map(String),
    notas: s("notas"),
  });
  if (error) await failBack(error.message);
  revalidatePath("/calendario");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.from("events").delete().eq("id", Number(formData.get("id")));
  if (error) await failBack(error.message);
  revalidatePath("/calendario");
}
