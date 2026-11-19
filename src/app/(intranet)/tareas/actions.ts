"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMe } from "@/lib/me";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};
const fail = (msg: string): never => {
  throw new Error(msg);
};

export async function createTask(formData: FormData) {
  const { supabase, member, manageable } = await requireMe();
  if (!member) fail("Tu cuenta no está vinculada a una ficha de integrante.");
  const unit_id = str(formData, "unit_id") ?? member!.unit_id;
  const isManager = manageable.has(unit_id);
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: str(formData, "title") ?? fail("Escribe un título."),
      description: str(formData, "description"),
      unit_id,
      assignee_id: isManager ? str(formData, "assignee_id") : member!.id,
      parent_id: str(formData, "parent_id") ? Number(formData.get("parent_id")) : null,
      project_id: str(formData, "project_id"),
      tipo: isManager ? (str(formData, "tipo") ?? "Del encargado") : "Del integrante",
      prioridad: str(formData, "prioridad") ?? "MEDIA",
      fecha_limite: str(formData, "fecha_limite"),
      created_by: member!.id,
    })
    .select("id")
    .single();
  if (error) fail(`No se pudo crear la tarea: ${error.message}`);
  revalidatePath("/tareas");
  redirect(`/tareas/${data!.id}`);
}

export async function updateTask(formData: FormData) {
  const { supabase } = await requireMe();
  const id = Number(formData.get("id"));
  const { error } = await supabase
    .from("tasks")
    .update({
      title: str(formData, "title") ?? fail("Escribe un título."),
      description: str(formData, "description"),
      unit_id: str(formData, "unit_id"),
      assignee_id: str(formData, "assignee_id"),
      project_id: str(formData, "project_id"),
      tipo: str(formData, "tipo"),
      prioridad: str(formData, "prioridad"),
      fecha_limite: str(formData, "fecha_limite"),
    })
    .eq("id", id);
  if (error) fail(error.message);
  revalidatePath(`/tareas/${id}`);
}

export async function updateProgress(formData: FormData) {
  const { supabase } = await requireMe();
  const id = Number(formData.get("id"));
  const { error } = await supabase
    .from("tasks")
    .update({
      avance: Math.max(0, Math.min(100, Number(formData.get("avance") ?? 0))),
      estado: str(formData, "estado") ?? "En proceso",
      entrega_url: str(formData, "entrega_url"),
      entrega_nota: str(formData, "entrega_nota"),
    })
    .eq("id", id);
  if (error) fail(error.message);
  revalidatePath(`/tareas/${id}`);
}

export async function reviewTask(formData: FormData) {
  const { supabase, member } = await requireMe();
  const id = Number(formData.get("id"));
  const estado = str(formData, "estado");
  const { error } = await supabase
    .from("tasks")
    .update({
      estado,
      avance: estado === "Completada y validada" ? 100 : undefined,
      resultado_revision: str(formData, "resultado_revision"),
      revisor_id: member?.id ?? null,
      revisado_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) fail(error.message);
  revalidatePath(`/tareas/${id}`);
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await requireMe();
  const id = Number(formData.get("id"));
  const parent = str(formData, "parent_id");
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) fail(error.message);
  revalidatePath("/tareas");
  redirect(parent ? `/tareas/${parent}` : "/tareas");
}

export async function uploadEvidence(formData: FormData) {
  const { supabase, member } = await requireMe();
  const id = Number(formData.get("id"));
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  const path = `${id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const up = await supabase.storage.from("evidencias").upload(path, file, { contentType: file.type });
  if (up.error) fail(up.error.message);
  const { error } = await supabase.from("task_files").insert({ task_id: id, name: file.name, path, size: file.size, uploaded_by: member?.id });
  if (error) {
    await supabase.storage.from("evidencias").remove([path]);
    fail(error.message);
  }
  revalidatePath(`/tareas/${id}`);
}

export async function downloadEvidence(formData: FormData) {
  const { supabase } = await requireMe();
  const { data, error } = await supabase.storage
    .from("evidencias")
    .createSignedUrl(String(formData.get("path")), 60, { download: String(formData.get("name")) });
  if (error) fail(error.message);
  redirect(data!.signedUrl);
}

export async function deleteEvidence(formData: FormData) {
  const { supabase } = await requireMe();
  const path = String(formData.get("path"));
  const { error } = await supabase.from("task_files").delete().eq("path", path);
  if (error) fail(error.message);
  await supabase.storage.from("evidencias").remove([path]);
  revalidatePath(`/tareas/${formData.get("id")}`);
}

export async function addComment(formData: FormData) {
  const { supabase, member } = await requireMe();
  const id = Number(formData.get("id"));
  const body = str(formData, "body");
  if (!body) return;
  const { error } = await supabase.from("task_comments").insert({ task_id: id, body, author_id: member?.id });
  if (error) fail(error.message);
  revalidatePath(`/tareas/${id}`);
}
