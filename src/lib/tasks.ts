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
};

export const TASK_SELECT =
  "*, assignee:members!tasks_assignee_id_fkey(id,full_name,avatar_url), unit:units(id,name), project:projects(id,name), subtasks:tasks!parent_id(id,estado)";

export type TaskRow = Task & {
  assignee: { id: string; full_name: string; avatar_url: string | null } | null;
  unit: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  subtasks: { id: number; estado: string }[];
};

export const formatShortDate = (d: string | null) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "short" }) : "—";
