"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWriter } from "@/lib/me";
import { failBack } from "@/lib/action-error";

const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;

export async function openSession(formData: FormData) {
  const { supabase } = await requireWriter();
  const unit = s(formData, "unit_id");
  const { data, error } = await supabase.rpc("attendance_open", {
    p_unit: unit === "__todos__" ? null : unit,
    p_tipo: s(formData, "tipo") ?? "Área",
    p_titulo: s(formData, "titulo") ?? "",
  });
  if (error) await failBack(error.message);
  revalidatePath("/asistencia");
  redirect(`/asistencia/${data}`);
}

export async function markAttendance(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.rpc("attendance_mark", { p_session: Number(formData.get("session_id")), p_kind: s(formData, "kind") });
  if (error) await failBack(error.message);
  revalidatePath("/asistencia");
}

export async function closeSession(formData: FormData) {
  const { supabase } = await requireWriter();
  const id = Number(formData.get("session_id"));
  const { error } = await supabase.rpc("attendance_close", { p_session: id });
  if (error) await failBack(error.message);
  revalidatePath(`/asistencia/${id}`);
}

export async function verifySession(formData: FormData) {
  const { supabase } = await requireWriter();
  const id = Number(formData.get("session_id"));
  if (formData.get("confirm") !== "on") await failBack("Marca la casilla para confirmar que revisaste la asistencia.");
  const { error } = await supabase.rpc("attendance_verify", { p_session: id });
  if (error) await failBack(error.message);
  revalidatePath(`/asistencia/${id}`);
  revalidatePath("/asistencia");
}

export async function deleteSession(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.rpc("attendance_delete", { p_session: Number(formData.get("session_id")) });
  if (error) await failBack(error.message);
  revalidatePath("/asistencia");
  redirect("/asistencia");
}

/** Corrección manual de una fila (hora local de Lima, en la fecha de la sesión). */
export async function setRecord(formData: FormData) {
  const { supabase } = await requireWriter();
  const id = Number(formData.get("session_id"));
  const fecha = String(formData.get("fecha"));
  const t = (k: string) => (s(formData, k) ? `${fecha}T${s(formData, k)}:00-05:00` : null);
  const { error } = await supabase.rpc("attendance_set", {
    p_session: id,
    p_member: s(formData, "member_id"),
    p_entrada: t("entrada"),
    p_salida: t("salida"),
    p_obs: s(formData, "observacion") ?? "",
  });
  if (error) await failBack(error.message);
  revalidatePath(`/asistencia/${id}`);
}
