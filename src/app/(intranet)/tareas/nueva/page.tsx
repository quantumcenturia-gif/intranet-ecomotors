import Link from "next/link";
import { GitBranch, Plus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import TaskFields from "@/components/tasks/TaskFields";
import { Label, btnPrimary, card, inputCls } from "@/components/ui";
import { requireMe } from "@/lib/me";
import { createTask } from "../actions";

export default async function NuevaTareaPage({ searchParams }: PageProps<"/tareas/nueva">) {
  const sp = await searchParams;
  const parentId = typeof sp.parent === "string" ? Number(sp.parent) : null;
  const { supabase, member, units, manageable, isManager } = await requireMe();

  const [{ data: members }, { data: projects }, { data: parent }, { data: openTasks }] = await Promise.all([
    supabase.from("members").select("id,full_name,unit_id").neq("estado", "Miembro retirado").order("full_name"),
    supabase.from("projects").select("id,name").order("sort"),
    parentId
      ? supabase.from("tasks").select("id,title,unit_id,project_id").eq("id", parentId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("tasks").select("id,title").not("estado", "in", "(Completada y validada,Cancelada)").order("created_at", { ascending: false }).limit(200),
  ]);

  if (!member && !isManager) {
    return (
      <>
        <PageHeader icon={Plus} title="Nueva tarea" />
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
          Tu cuenta aún no está vinculada a tu ficha de integrante. Pide a coordinación que añada tu correo en Administración.
        </p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        icon={Plus}
        title={parent ? "Nueva subtarea" : "Nueva tarea"}
        subtitle={isManager ? "Asigna trabajo a tu equipo" : "Registra una tarea propia para tu subárea"}
      />
      <form action={createTask} className={`${card} max-w-3xl space-y-5 p-6`}>
        {parent ? (
          <div className="flex items-center gap-2 rounded-lg bg-neutral-100 p-3 text-sm">
            <GitBranch className="h-4 w-4 text-brand-600" />
            Subtarea de{" "}
            <Link href={`/tareas/${parent.id}`} className="font-medium hover:text-brand-600">
              {parent.title}
            </Link>
            <input type="hidden" name="parent_id" value={parent.id} />
          </div>
        ) : (
          <Label label="Tarea madre (opcional)">
            <select name="parent_id" defaultValue="" className={inputCls}>
              <option value="">— Es una tarea principal —</option>
              {openTasks?.map((t) => <option key={t.id} value={t.id}>#{t.id} · {t.title}</option>)}
            </select>
          </Label>
        )}

        <TaskFields
          task={{ unit_id: parent?.unit_id ?? member?.unit_id, project_id: parent?.project_id ?? null }}
          units={units}
          manageable={manageable}
          members={members ?? []}
          projects={projects ?? []}
          canAssign={isManager}
          defaultConvocatoria={!parent}
        />

        <button className={btnPrimary}>
          <Plus className="h-4 w-4" /> Crear tarea
        </button>
      </form>
    </>
  );
}
