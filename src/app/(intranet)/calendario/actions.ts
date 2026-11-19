"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/me";

export async function createEvent(formData: FormData) {
  const { supabase } = await requireMe();
  const s = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const date = s("date");
  if (!date) throw new Error("Elige una fecha.");
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
  if (error) throw new Error(error.message);
  revalidatePath("/calendario");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await requireMe();
  const { error } = await supabase.from("events").delete().eq("id", Number(formData.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/calendario");
}
