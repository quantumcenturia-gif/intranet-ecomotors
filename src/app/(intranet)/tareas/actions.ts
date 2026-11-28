"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMe, requireWriter } from "@/lib/me";
import { failBack } from "@/lib/action-error";

const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

const horasOf = (f: FormData) => {
  const v = str(f, "horas");
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return n > 0 && n <= 500 ? n : null;
};

/** Deja la lista de colaboradores igual a la elegida en el formulario (sin repetir al responsable). */
async function syncParticipants(supabase: Awaited<ReturnType<typeof requireWriter>>["supabase"], taskId: number, f: FormData, assignee: string | null, by: string | null) {
  const wanted = new Set(f.getAll("participantes").map(String).filter((x) => x && x !== assignee));
  const { data: cur } = await supabase.from("task_participants").select("member_id").eq("task_id", taskId);
  const have = new Set((cur ?? []).map((r) => r.member_id as string));
  const add = [...wanted].filter((x) => !have.has(x));
  const del = [...have].filter((x) => !wanted.has(x));
  if (del.length) {
    const { error } = await supabase.from("task_participants").delete().eq("task_id", taskId).in("member_id", del);
    if (error) await failBack(`Colaboradores: ${error.message}`);
  }
  if (add.length) {
    const { error } = await supabase.from("task_participants").insert(add.map((member_id) => ({ task_id: taskId, member_id, added_by: by })));
    if (error) await failBack(`Colaboradores: ${error.message}`);
  }
}

export async function createTask(formData: FormData) {
  const { supabase, member, manageable, isAdmin } = await requireWriter();
  if (!member && !isAdmin) await failBack("Tu cuenta no está vinculada a una ficha de integrante.");
  const unit_id = str(formData, "unit_id") ?? member?.unit_id ?? await failBack("Elige una unidad.");
  const isManager = manageable.has(unit_id);
  const convocatoria = isManager && formData.get("modo") === "convocatoria";
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      convocatoria,
      title: str(formData, "title") ?? await failBack("Escribe un título."),
      description: str(formData, "description"),
      unit_id,
      assignee_id: convocatoria ? null : isManager ? str(formData, "assignee_id") : member?.id,
      parent_id: str(formData, "parent_id") ? Number(formData.get("parent_id")) : null,
      project_id: str(formData, "project_id"),
      tipo: isManager ? (str(formData, "tipo") ?? "Del encargado") : "Del integrante",
      prioridad: str(formData, "prioridad") ?? "MEDIA",
      fecha_limite: str(formData, "fecha_limite"),
      horas: isManager ? horasOf(formData) : null,
      created_by: member?.id ?? null,
    })
    .select("id,assignee_id")
    .single();
  if (error) await failBack(`No se pudo crear la tarea: ${error.message}`);
  if (isManager && !convocatoria) await syncParticipants(supabase, data!.id, formData, data!.assignee_id, member?.id ?? null);
  revalidatePath("/tareas");
  redirect(`/tareas/${data!.id}`);
}

export async function updateTask(formData: FormData) {
  const { supabase, member } = await requireWriter();
  const id = Number(formData.get("id"));
  const convocatoria = formData.get("modo") === "convocatoria";
  const assignee = convocatoria ? null : str(formData, "assignee_id");
  const { error } = await supabase
    .from("tasks")
    .update({
      convocatoria,
      title: str(formData, "title") ?? await failBack("Escribe un título."),
      description: str(formData, "description"),
      unit_id: str(formData, "unit_id"),
      assignee_id: assignee,
      project_id: str(formData, "project_id"),
      tipo: str(formData, "tipo"),
      prioridad: str(formData, "prioridad"),
      fecha_limite: str(formData, "fecha_limite"),
      horas: horasOf(formData),
    })
    .eq("id", id);
  if (error) await failBack(error.message);
  await syncParticipants(supabase, id, convocatoria ? new FormData() : formData, assignee, member?.id ?? null);
  revalidatePath(`/tareas/${id}`);
}

export async function updateProgress(formData: FormData) {
  const { supabase } = await requireWriter();
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
  if (error) await failBack(error.message);
  revalidatePath(`/tareas/${id}`);
}

export async function reviewTask(formData: FormData) {
  const { supabase, member } = await requireWriter();
  const id = Number(formData.get("id"));
  const estado = str(formData, "estado");
  const { error } = await supabase
    .from("tasks")
    .update({
      estado,
      avance: estado === "Completada y validada" ? 100 : undefined,
      ...(formData.has("horas") ? { horas: horasOf(formData) } : {}),
      resultado_revision: str(formData, "resultado_revision"),
      revisor_id: member?.id ?? null,
      revisado_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) await failBack(error.message);
  revalidatePath(`/tareas/${id}`);
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await requireWriter();
  const id = Number(formData.get("id"));
  const parent = str(formData, "parent_id");
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) await failBack(error.message);
  revalidatePath("/tareas");
  redirect(parent ? `/tareas/${parent}` : "/tareas");
}

export async function uploadEvidence(formData: FormData) {
  const { supabase, member } = await requireWriter();
  const id = Number(formData.get("id"));
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  const path = `${id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
  const up = await supabase.storage.from("evidencias").upload(path, file, { contentType: file.type });
  if (up.error) await failBack(up.error.message);
  const { error } = await supabase.from("task_files").insert({ task_id: id, name: file.name, path, size: file.size, uploaded_by: member?.id });
  if (error) {
    await supabase.storage.from("evidencias").remove([path]);
    await failBack(error.message);
  }
  revalidatePath(`/tareas/${id}`);
}

export async function downloadEvidence(formData: FormData) {
  const { supabase } = await requireMe();
  const { data, error } = await supabase.storage
    .from("evidencias")
    .createSignedUrl(String(formData.get("path")), 60, { download: String(formData.get("name")) });
  if (error) await failBack(error.message);
  redirect(data!.signedUrl);
}

export async function deleteEvidence(formData: FormData) {
  const { supabase } = await requireWriter();
  const path = String(formData.get("path"));
  const { error } = await supabase.from("task_files").delete().eq("path", path);
  if (error) await failBack(error.message);
  await supabase.storage.from("evidencias").remove([path]);
  revalidatePath(`/tareas/${formData.get("id")}`);
}

export async function addComment(formData: FormData) {
  const { supabase, member } = await requireWriter();
  const id = Number(formData.get("id"));
  const body = str(formData, "body");
  if (!body) return;
  const { error } = await supabase.from("task_comments").insert({ task_id: id, body, author_id: member?.id });
  if (error) await failBack(error.message);
  revalidatePath(`/tareas/${id}`);
}

export async function volunteer(formData: FormData) {
  const { supabase } = await requireWriter();
  const id = Number(formData.get("id"));
  const { error } = await supabase.rpc("task_volunteer", { p_task: id, p_nota: str(formData, "nota") ?? "" });
  if (error) await failBack(error.message);
  revalidatePath(`/tareas/${id}`);
  revalidatePath("/tareas");
}

export async function unvolunteer(formData: FormData) {
  const { supabase } = await requireWriter();
  const id = Number(formData.get("id"));
  const { error } = await supabase.rpc("task_unvolunteer", { p_task: id });
  if (error) await failBack(error.message);
  revalidatePath(`/tareas/${id}`);
  revalidatePath("/tareas");
}

export async function decideVolunteer(formData: FormData) {
  const { supabase } = await requireWriter();
  const { error } = await supabase.rpc("task_volunteer_decide", {
    p_volunteer: Number(formData.get("volunteer_id")),
    p_accept: formData.get("accept") === "1",
  });
  if (error) await failBack(error.message);
  revalidatePath(`/tareas/${formData.get("id")}`);
}
