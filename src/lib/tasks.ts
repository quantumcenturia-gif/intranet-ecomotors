import type { SupabaseClient } from "@supabase/supabase-js";

export type Task = {
  id: number;
  title: string;
  description: string | null;
  unit_id: string;
  assignee_id: string | null;
  created_by: string | null;
  parent_id: number | null;
  project_id: string | null;
  tipo: string;
  estado: string;
  prioridad: string;
  avance: number;
  fecha_asignacion: string;
  fecha_limite: string | null;
  entrega_url: string | null;
  entrega_nota: string | null;
  revisor_id: string | null;
  resultado_revision: string | null;
  revisado_at: string | null;
  created_at: string;
  updated_at: string;
  convocatoria: boolean;
  horas: number | null;
  riesgo: string;
  peligros: string[];
  epp: string[];
  trabajo_inicio: string | null;
  trabajo_fin: string | null;
  trabajo_lugar: string | null;
  seguridad_estado: string;
  seguridad_obs: string | null;
  seguridad_por: string | null;
  seguridad_at: string | null;
};

export const TASK_SELECT =
  "*, assignee:members!tasks_assignee_id_fkey(id,full_name,avatar_url), unit:units(id,name), project:projects(id,name), subtasks:tasks!parent_id(id,estado), volunteers:task_volunteers!task_id(id,estado), participants:task_participants(member:members!task_participants_member_id_fkey(id,full_name,avatar_url))";

export type TaskRow = Task & {
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  unit: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  subtasks: { id: number; estado: string }[];
  volunteers?: { id: number; estado: string }[];
  participants?: { member: { id: string; full_name: string; avatar_url: string | null } | null }[];
};

export const formatShortDate = (d: string | null) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" }) : "—";

/** «8 h», «2.5 h». */
export const fmtHoras = (h: number | null | undefined) => (h ? `${Number(Number(h).toFixed(2))} h` : "");

/** Ids de las tareas en las que la persona colabora (además de las que tiene a su cargo). */
export async function participantTaskIds(supabase: SupabaseClient, memberId: string | undefined): Promise<number[]> {
  if (!memberId) return [];
  const { data } = await supabase.from("task_participants").select("task_id").eq("member_id", memberId);
  return ((data ?? []) as { task_id: number }[]).map((r) => r.task_id);
}

/** Filtro PostgREST: tareas a mi cargo o en las que colaboro. */
export const mineFilter = (memberId: string, ids: number[]) =>
  ids.length ? `assignee_id.eq.${memberId},id.in.(${ids.join(",")})` : `assignee_id.eq.${memberId}`;
