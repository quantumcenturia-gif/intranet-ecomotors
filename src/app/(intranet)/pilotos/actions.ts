"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWriter } from "@/lib/me";
import { failBack } from "@/lib/action-error";
import { parseLaps } from "@/lib/pilots";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

export async function createRun(formData: FormData) {
  const { supabase, member, manageable } = await requireWriter();
  if (!manageable.has("pilotos")) await failBack("Solo el responsable de Pilotos o coordinación registran pruebas.");
  const piloto = str(formData, "piloto_id") ?? (await failBack("Elige el piloto."));
  const fecha = str(formData, "fecha") ?? (await failBack("Pon la fecha de la prueba."));
  const { laps, error: lapError } = parseLaps(String(formData.get("vueltas") ?? ""));
  if (lapError) await failBack(lapError);
  if (!laps.length) await failBack("Escribe al menos un tiempo de vuelta.");
  const peso = str(formData, "peso_kg");
  const { error } = await supabase.from("pilot_runs").insert({
    piloto_id: piloto,
    fecha,
    project_id: str(formData, "project_id"),
    intento: Number(str(formData, "intento") ?? 1),
    peso_kg: peso ? Number(peso.replace(",", ".")) : null,
    traje: str(formData, "traje"),
    pista: str(formData, "pista"),
    vueltas: laps,
    notas: str(formData, "notas"),
    created_by: member?.id ?? null,
  });
  if (error) await failBack(`No se pudo guardar: ${error.message}`);
  revalidatePath("/pilotos");
  revalidatePath(`/pilotos/${piloto}`);
  redirect(`/pilotos?piloto=${piloto}&fecha=${fecha}&ok=1`);
}

export async function deleteRun(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.from("pilot_runs").delete().eq("id", Number(formData.get("id")));
  if (error) await failBack(error.message);
  revalidatePath("/pilotos", "layout");
}
