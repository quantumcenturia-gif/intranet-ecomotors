/* eslint-disable @next/next/no-img-element -- imágenes subidas por el equipo */
import Link from "next/link";
import { ListChecks, Pencil, Rocket } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { btnDark, card, inputCls } from "@/components/ui";
import { requireMe } from "@/lib/me";
import { updateProject } from "./actions";

export default async function ProyectosPage() {
  const { supabase, isAdmin } = await requireMe();
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").order("sort"),
    supabase.from("tasks").select("project_id,estado").not("project_id", "is", null),
  ]);

  return (
    <>
      <PageHeader icon={Rocket} title="Proyectos" subtitle="Lo que construimos en Eco Motors" />
      <div className="grid gap-6 sm:grid-cols-2">
        {projects?.map((p) => {
          const pt = tasks?.filter((t) => t.project_id === p.id) ?? [];
          const open = pt.filter((t) => !["Completada y validada", "Cancelada"].includes(t.estado)).length;
          return (
            <article key={p.id} className={`${card} overflow-hidden`}>
              <div className="racing-stripes relative flex h-44 items-center justify-center bg-black">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="text-6xl">{p.emoji}</span>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold">{p.name}</h2>
                <p className="mt-1 text-sm text-neutral-600">{p.description}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
                  <ListChecks className="h-4 w-4" /> {open} tareas abiertas · {pt.length} en total
                </p>
                {isAdmin && (
                  <details className="mt-4">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-sm text-brand-600">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </summary>
                    <form action={updateProject} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={p.id} />
                      <textarea name="description" rows={3} defaultValue={p.description ?? ""} className={inputCls} />
                      <input name="image" type="file" accept="image/*" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2" />
                      <button className={btnDark}>Guardar</button>
                    </form>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-neutral-500">
        Para enlazar una tarea a un proyecto, elígelo en el campo «Proyecto» al crearla en <Link href="/tareas" className="text-brand-600 hover:underline">Tareas</Link>.
      </p>
    </>
  );
}
