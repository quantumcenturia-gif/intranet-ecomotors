"use server";

import { revalidatePath } from "next/cache";
import { requireWriter } from "@/lib/me";
import { failBack } from "@/lib/action-error";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

export async function createReport(formData: FormData) {
  const { supabase, member } = await requireWriter();
  if (!member) return failBack("Tu cuenta no está vinculada a una ficha de integrante.");
  const descripcion = str(formData, "descripcion") ?? (await failBack("Describe qué pasó o qué viste."));
  const { error } = await supabase.from("safety_reports").insert({
    tipo: str(formData, "tipo") ?? "Condición insegura",
    severidad: str(formData, "severidad") ?? "Leve",
    descripcion,
    fecha: str(formData, "fecha") ?? undefined,
    lugar: str(formData, "lugar"),
    unit_id: str(formData, "unit_id"),
    member_id: str(formData, "member_id"),
    reportado_por: member.id,
  });
  if (error) await failBack(error.message);
  revalidatePath("/seguridad");
}

export async function updateReport(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase
    .from("safety_reports")
    .update({ estado: str(formData, "estado") ?? "Abierto", accion: str(formData, "accion") })
    .eq("id", Number(formData.get("id")));
  if (error) await failBack(error.message);
  revalidatePath("/seguridad");
}

export async function saveSheet(formData: FormData) {
  const { supabase, member } = await requireWriter();
  const id = str(formData, "id");
  const row = {
    titulo: str(formData, "titulo") ?? (await failBack("Ponle un título a la ficha.")),
    categoria: str(formData, "categoria") ?? "Material",
    peligros: str(formData, "peligros"),
    epp: formData.getAll("epp").map(String).filter(Boolean),
    precauciones: str(formData, "precauciones"),
    primeros_auxilios: str(formData, "primeros_auxilios"),
    enlace: str(formData, "enlace"),
    obligatoria: formData.get("obligatoria") === "on",
    publicada: formData.get("publicada") === "on",
  };
  const { error } = id
    ? await supabase.from("safety_sheets").update(row).eq("id", Number(id))
    : await supabase.from("safety_sheets").insert({ ...row, created_by: member?.id ?? null });
  if (error) await failBack(error.message);
  revalidatePath("/seguridad");
}

export async function deleteSheet(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.from("safety_sheets").delete().eq("id", Number(formData.get("id")));
  if (error) await failBack(error.message);
  revalidatePath("/seguridad");
}

export async function markRead(formData: FormData) {
  const { supabase, member } = await requireWriter();
  if (!member) return failBack("Tu cuenta no está vinculada a una ficha de integrante.");
  const { error } = await supabase.from("safety_reads").insert({ sheet_id: Number(formData.get("id")), member_id: member.id });
  if (error && !error.message.includes("duplicate")) await failBack(error.message);
  revalidatePath("/seguridad");
  revalidatePath("/perfil");
}
