"use server";

import { revalidatePath } from "next/cache";
import { requireMe } from "@/lib/me";

export async function markAllRead() {
  const { supabase, member } = await requireMe();
  if (!member) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("member_id", member.id).is("read_at", null);
  revalidatePath("/", "layout");
}
