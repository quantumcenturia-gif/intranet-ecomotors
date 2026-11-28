import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, CheckCircle2, ChevronRight, Download, FileText, FolderKanban, GitBranch, ListChecks, MessageSquare, Paperclip, Pencil, Plus, Send, Timer, Trash2, Upload, User, Users } from "lucide-react";
import Avatar from "@/components/Avatar";
import TaskFields from "@/components/tasks/TaskFields";
import TaskList from "@/components/tasks/TaskList";
import SafetyPanel from "@/components/tasks/SafetyPanel";
import { Badge, Label, btnDark, btnGhost, btnPrimary, card, inputCls } from "@/components/ui";
import { ESTADO_STYLES, PRIORIDAD_STYLES, estadoVisible } from "@/data/eco-motors";
import { formatSize } from "@/lib/format";
import { requireMe } from "@/lib/me";
import { TASK_SELECT, fmtHoras, formatShortDate, type TaskRow } from "@/lib/tasks";
import { unitPath } from "@/lib/units";
import {
  addComment, decideVolunteer, deleteEvidence, deleteTask, downloadEvidence, reviewTask, unvolunteer, updateProgress, updateTask, uploadEvidence, volunteer,
} from "../actions";
import { subtree } from "@/lib/units";
import SubmitButton from "@/components/SubmitButton";

type Person = { id: string; full_name: string; avatar_url: string | null } | null;

export default async function TareaPage({ params }: PageProps<"/tareas/[id]">) {
  const id = Number((await params).id);
  const { supabase, member, units, manageable, isSafety } = await requireMe();

  const { data: task, error } = await supabase
    .from("tasks")
    .select(`${TASK_SELECT}, creator:members!tasks_created_by_fkey(id,full_name,avatar_url), revisor:members!tasks_revisor_id_fkey(id,full_name,avatar_url)`)
    .eq("id", id)
    .maybeSingle<TaskRow & { creator: Person; revisor: Person }>();
  if (error) throw new Error(error.message);
  if (!task) notFound();

  // Cadena de tareas madre (para la ruta de navegación)
  const ancestors: { id: number; title: string }[] = [];
  let parentId = task.parent_id;
  while (parentId && ancestors.length < 8) {
    const { data: p } = await supabase.from("tasks").select("id,title,parent_id").eq("id", parentId).maybeSingle();
    if (!p) break;
    ancestors.unshift({ id: p.id, title: p.title });
    parentId = p.parent_id;
  }

  const [{ data: subtasks }, { data: files }, { data: comments }, { data: members }, { data: projects }, { data: vols }] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).eq("parent_id", id).order("created_at").returns<TaskRow[]>(),
    supabase.from("task_files").select("id,name,path,size,created_at,uploaded_by").eq("task_id", id).order("created_at"),
    supabase.from("task_comments").select("id,body,created_at,author:members(full_name,avatar_url)").eq("task_id", id).order("created_at"),
    supabase.from("members").select("id,full_name,unit_id").eq("es_prueba", false).neq("estado", "Miembro retirado").order("full_name"),
    supabase.from("projects").select("id,name").order("sort"),
    supabase.from("task_volunteers").select("id,member_id,nota,estado,created_at,member:members(id,full_name,avatar_url,unit_id)").eq("task_id", id).order("created_at"),
  ]);
  type Vol = { id: number; member_id: string; nota: string | null; estado: string; created_at: string; member: { id: string; full_name: string; avatar_url: string | null; unit_id: string } | null };
  const volunteers = (vols ?? []) as unknown as Vol[];

  const canManage = manageable.has(task.unit_id);
  const { data: approver } = task.seguridad_por
    ? await supabase.from("members").select("full_name").eq("id", task.seguridad_por).maybeSingle()
    : { data: null };
  const collaborators = (task.participants ?? []).map((p) => p.member).filter((x): x is NonNullable<typeof x> => !!x);
  const involved = [task.assignee, ...collaborators].filter(Boolean).length;
  const validated = task.estado === "Completada y validada";
  const isCreator = !!member && member.id === task.created_by;
  const openCall = task.convocatoria && !["Completada y validada", "Cancelada"].includes(task.estado);
  const canVolunteer = openCall && !!member && !isCreator && subtree(units, task.unit_id).includes(member.unit_id);
  const myVol = volunteers.find((v) => v.member_id === member?.id);
  const unitLabel = new Map(units.map((u) => [u.id, u.name]));
  const isAssignee = !!member && member.id === task.assignee_id;
  const canWork = canManage || isAssignee;
  const estado = estadoVisible(task);
  const path = unitPath(units, task.unit_id).map((u) => u.name).join(" › ");

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-neutral-500">
        <Link href="/tareas" className="hover:text-brand-600">Tareas</Link>
        {ancestors.map((a) => (
          <span key={a.id} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" />
            <Link href={`/tareas/${a.id}`} className="max-w-48 truncate hover:text-brand-600">{a.title}</Link>
          </span>
        ))}
        <ChevronRight className="h-4 w-4" />
        <span className="text-neutral-800">#{task.id}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-2">
          <section className={`${card} p-6`}>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge className={ESTADO_STYLES[estado]}>{estado}</Badge>
              <Badge className={`bg-neutral-100 ${PRIORIDAD_STYLES[task.prioridad]}`}>Prioridad {task.prioridad}</Badge>
              <Badge className="bg-neutral-100 text-neutral-600">{task.tipo}</Badge>
              {task.convocatoria && <Badge className="bg-brand-600 text-white">📣 Convocatoria</Badge>}
            </div>
            <h1 className="text-2xl font-bold">{task.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">{path}</p>
            {task.description ? (
              <p className="mt-4 whitespace-pre-line text-neutral-700">{task.description}</p>
            ) : (
              <p className="mt-4 text-sm italic text-neutral-400">Sin objetivo ni criterios descritos.</p>
            )}
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-neutral-500">
                <span>Avance</span>
                <span>{task.avance}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div className="grow-x h-full bg-brand-600 transition-all" style={{ width: `${task.avance}%` }} />
              </div>
            </div>
          </section>

          <SafetyPanel task={task} isSafety={isSafety} approver={approver?.full_name} />

          {/* Convocatoria */}
          {task.convocatoria && (
            <section className={`${card} border-l-4 border-l-brand-600 p-6`}>
              <h2 className="mb-1 flex flex-wrap items-center gap-2 font-semibold">
                📣 Convocatoria abierta a {unitLabel.get(task.unit_id)}
                {task.horas && <span className="rounded-full bg-black px-2.5 py-0.5 text-xs font-semibold text-white">⏱ Vale {fmtHoras(task.horas)} para quien la haga</span>}
              </h2>
              <p className="mb-4 text-sm text-neutral-600">
                {openCall ? "Los integrantes de esta área pueden apuntarse. Quien la publicó elige a quién acepta; a cada persona aceptada se le crea su subtarea." : "Esta convocatoria está cerrada."}
              </p>

              {canVolunteer && !myVol && (
                <form action={volunteer} className="flex flex-col gap-2 rounded-lg bg-brand-50 p-4 sm:flex-row">
                  <input type="hidden" name="id" value={task.id} />
                  <input name="nota" placeholder="Comentario opcional (p. ej. «Tengo experiencia en soldadura»)" className={inputCls} />
                  <SubmitButton className={`${btnPrimary} whitespace-nowrap`}>🙋 Yo lo voy a hacer</SubmitButton>
                </form>
              )}
              {myVol && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 p-4 text-sm">
                  {myVol.estado === "Pendiente" && <>Te apuntaste. Esperando la respuesta de quien publicó la tarea.
                    <form action={unvolunteer}><input type="hidden" name="id" value={task.id} /><SubmitButton className="text-brand-600 hover:underline">Retirarme</SubmitButton></form></>}
                  {myVol.estado === "Aceptado" && <>✅ Te aceptaron: tienes tu subtarea abajo, en «Subtareas».</>}
                  {myVol.estado === "Rechazado" && <>No fuiste seleccionado/a esta vez.</>}
                </div>
              )}

              {(canManage || isCreator) && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold">Se apuntaron ({volunteers.length})</h3>
                  {volunteers.length ? (
                    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                      {volunteers.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center gap-3 p-3">
                          <Avatar name={v.member?.full_name ?? "?"} src={v.member?.avatar_url} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{v.member?.full_name}</p>
                            <p className="text-xs text-neutral-500">{unitLabel.get(v.member?.unit_id ?? "")}{v.nota ? ` · «${v.nota}»` : ""}</p>
                          </div>
                          {v.estado === "Pendiente" ? (
                            <div className="flex gap-2">
                              <form action={decideVolunteer}>
                                <input type="hidden" name="id" value={task.id} /><input type="hidden" name="volunteer_id" value={v.id} /><input type="hidden" name="accept" value="1" />
                                <SubmitButton className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700">Aceptar</SubmitButton>
                              </form>
                              <form action={decideVolunteer}>
                                <input type="hidden" name="id" value={task.id} /><input type="hidden" name="volunteer_id" value={v.id} /><input type="hidden" name="accept" value="0" />
                                <SubmitButton className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50">Rechazar</SubmitButton>
                              </form>
                            </div>
                          ) : (
                            <Badge className={v.estado === "Aceptado" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}>{v.estado}</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500">Todavía nadie se ha apuntado. Te llegará un aviso 🔔 cuando alguien lo haga.</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Subtareas */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <GitBranch className="h-5 w-5 text-brand-600" /> Subtareas
              </h2>
              {(member || canManage) && (
                <Link href={`/tareas/nueva?parent=${task.id}`} className={btnGhost}>
                  <Plus className="h-4 w-4" /> Añadir subtarea
                </Link>
              )}
            </div>
            <TaskList tasks={subtasks ?? []} empty="Esta tarea no tiene subtareas." />
          </section>

          {/* Entrega del responsable (una convocatoria sin responsable avanza con sus subtareas) */}
          {canWork && !(task.convocatoria && !task.assignee_id) && (
            <section className={`${card} p-6`}>
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Send className="h-5 w-5 text-brand-600" /> Mi entrega
              </h2>
              {["Pendiente", "Rechazada"].includes(task.seguridad_estado) && (
                <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  🦺 {task.seguridad_estado === "Pendiente" ? "Espera la aprobación de Seguridad antes de empezar este trabajo." : "Seguridad detuvo este trabajo; revisa el motivo arriba."}
                </p>
              )}
              {(member?.drive_url || units.find((u) => u.id === task.unit_id)?.drive_url) && (
                <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-neutral-50 p-3 text-sm">
                  <span className="w-full text-xs text-neutral-500">1) Sube tus archivos a Drive · 2) copia el enlace del archivo o carpeta y pégalo abajo · 3) envía a revisión</span>
                  {member?.drive_url && (
                    <a href={member.drive_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-white hover:bg-neutral-800">
                      📁 Subir a mi carpeta de Drive
                    </a>
                  )}
                  {canManage && units.find((u) => u.id === task.unit_id)?.drive_url && (
                    <a href={units.find((u) => u.id === task.unit_id)!.drive_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 hover:bg-neutral-50">
                      📂 Carpeta de {units.find((u) => u.id === task.unit_id)?.name}
                    </a>
                  )}
                </div>
              )}
              {["Completada y validada", "Cancelada"].includes(task.estado) ? (
                <p className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">
                  {task.estado === "Cancelada" ? "Esta tarea fue cancelada." : "✅ Esta tarea ya fue validada."} Si hay que reabrirla, el responsable del área cambia su estado en «Revisión».
                </p>
              ) : (
              <form key={`p-${task.updated_at}`} action={updateProgress} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={task.id} />
                <Label label={`Avance (%)`}>
                  <input type="number" name="avance" min={0} max={100} step={5} defaultValue={task.avance} className={inputCls} />
                </Label>
                <Label label="Estado">
                  <select
                    name="estado"
                    defaultValue={["Pendiente", "En proceso", "En revisión"].includes(task.estado) ? task.estado : "En proceso"}
                    className={inputCls}
                  >
                    <option>Pendiente</option>
                    <option>En proceso</option>
                    <option value="En revisión">En revisión (enviar al encargado)</option>
                  </select>
                </Label>
                <Label label="Enlace del archivo o carpeta entregada (Drive)" className="sm:col-span-2">
                  <input type="url" name="entrega_url" defaultValue={task.entrega_url ?? ""} placeholder="https://drive.google.com/…" className={inputCls} />
                </Label>
                <Label label="Nota para el revisor" className="sm:col-span-2">
                  <textarea name="entrega_nota" rows={2} defaultValue={task.entrega_nota ?? ""} className={inputCls} />
                </Label>
                <div>
                  <SubmitButton className={btnPrimary}>Guardar avance</SubmitButton>
                </div>
              </form>
              )}
            </section>
          )}

          {/* Evidencias */}
          <section className={`${card} p-6`}>
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <Paperclip className="h-5 w-5 text-brand-600" /> Evidencias
            </h2>
            {task.entrega_url && (
              <a href={task.entrega_url} target="_blank" rel="noreferrer" className="mb-3 flex items-center gap-2 text-sm text-brand-600 hover:underline">
                <FolderKanban className="h-4 w-4" /> Abrir entrega enlazada
              </a>
            )}
            {task.entrega_nota && <p className="mb-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{task.entrega_nota}</p>}
            {files?.length ? (
              <ul className="mb-4 divide-y divide-neutral-100">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 py-2">
                    <FileText className="h-5 w-5 shrink-0 text-neutral-400" />
                    <span className="min-w-0 flex-1 truncate text-sm">{f.name}</span>
                    <span className="text-xs text-neutral-400">{formatSize(f.size)}</span>
                    <form action={downloadEvidence}>
                      <input type="hidden" name="path" value={f.path} />
                      <input type="hidden" name="name" value={f.name} />
                      <SubmitButton aria-label="Descargar" className="text-neutral-500 hover:text-brand-600"><Download className="h-4 w-4" /></SubmitButton>
                    </form>
                    {(canManage || f.uploaded_by === member?.id) && (
                      <form action={deleteEvidence}>
                        <input type="hidden" name="id" value={task.id} />
                        <input type="hidden" name="path" value={f.path} />
                        <SubmitButton aria-label="Borrar" className="text-neutral-400 hover:text-brand-600"><Trash2 className="h-4 w-4" /></SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-neutral-500">Aún no hay archivos.</p>
            )}
            {canWork && (
              <form action={uploadEvidence} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input type="hidden" name="id" value={task.id} />
                <input name="file" type="file" required className="flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2" />
                <SubmitButton className={btnDark}><Upload className="h-4 w-4" /> Subir</SubmitButton>
              </form>
            )}
          </section>

          {/* Comentarios */}
          <section className={`${card} p-6`}>
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <MessageSquare className="h-5 w-5 text-brand-600" /> Comentarios
            </h2>
            <ul className="mb-4 space-y-4">
              {comments?.map((c) => {
                const a = (Array.isArray(c.author) ? c.author[0] : c.author) as { full_name: string; avatar_url: string | null } | null;
                return (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={a?.full_name ?? "?"} src={a?.avatar_url} size={32} />
                    <div>
                      <p className="text-sm">
                        <b>{a?.full_name ?? "—"}</b>{" "}
                        <span className="text-xs text-neutral-400">{new Date(c.created_at).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" })}</span>
                      </p>
                      <p className="whitespace-pre-line text-sm text-neutral-700">{c.body}</p>
                    </div>
                  </li>
                );
              })}
              {!comments?.length && <li className="text-sm text-neutral-500">Sin comentarios todavía.</li>}
            </ul>
            {member && (
              <form action={addComment} className="flex gap-2">
                <input type="hidden" name="id" value={task.id} />
                <input name="body" required placeholder="Escribe un comentario…" className={inputCls} />
                <SubmitButton className={btnDark} aria-label="Enviar"><Send className="h-4 w-4" /></SubmitButton>
              </form>
            )}
          </section>
        </div>

        {/* Lateral: datos, revisión, edición */}
        <aside className="space-y-6">
          <section className={`${card} space-y-4 p-5 text-sm`}>
            <Row icon={User} label="Responsable">
              {task.assignee ? (
                <Link href={`/directorio/${task.assignee.id}`} className="flex items-center gap-2 hover:text-brand-600">
                  <Avatar name={task.assignee.full_name} src={task.assignee.avatar_url} size={24} /> {task.assignee.full_name}
                </Link>
              ) : "Sin asignar"}
            </Row>
            {collaborators.length > 0 && (
              <Row icon={Users} label={`Colaboradores (${collaborators.length})`}>
                <ul className="space-y-1.5">
                  {collaborators.map((c) => (
                    <li key={c.id}>
                      <Link href={`/directorio/${c.id}`} className="flex items-center gap-2 hover:text-brand-600">
                        <Avatar name={c.full_name} src={c.avatar_url} size={22} /> <span className="truncate">{c.full_name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Row>
            )}
            <Row icon={Timer} label="Horas">
              {task.horas ? (
                validated ? (
                  <span className="text-emerald-700">✅ Se sumaron <b>{fmtHoras(task.horas)}</b> a {involved === 1 ? "la persona responsable" : `cada una de las ${involved} personas`}</span>
                ) : (
                  <span>Vale <b>{fmtHoras(task.horas)}</b> por persona · se suman al validarla</span>
                )
              ) : (
                <span className="text-neutral-500">Sin horas asignadas</span>
              )}
            </Row>
            <Row icon={User} label="Asignada por">{task.creator?.full_name ?? "—"}</Row>
            <Row icon={CalendarClock} label="Fechas">
              Asignada {formatShortDate(task.fecha_asignacion)} · Límite <b>{formatShortDate(task.fecha_limite)}</b>
            </Row>
            {task.project && (
              <Row icon={FolderKanban} label="Proyecto">
                <Link href="/proyectos" className="hover:text-brand-600">{task.project.name}</Link>
              </Row>
            )}
            {ancestors.length > 0 && (
              <Row icon={GitBranch} label="Tarea madre">
                <Link href={`/tareas/${ancestors.at(-1)!.id}`} className="hover:text-brand-600">{ancestors.at(-1)!.title}</Link>
              </Row>
            )}
          </section>

          {(task.resultado_revision || canManage) && (
            <section className={`${card} p-5`}>
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-brand-600" /> Revisión
              </h2>
              {task.resultado_revision && (
                <div className="mb-4 rounded-lg bg-neutral-50 p-3 text-sm">
                  <p className="whitespace-pre-line text-neutral-700">{task.resultado_revision}</p>
                  <p className="mt-1 text-xs text-neutral-400">{task.revisor?.full_name ?? "—"}</p>
                </div>
              )}
              {canManage && (
                <form key={`r-${task.updated_at}`} action={reviewTask} className="space-y-3">
                  <input type="hidden" name="id" value={task.id} />
                  <select name="estado" defaultValue="Completada y validada" className={inputCls}>
                    <option>Completada y validada</option>
                    <option>Observada</option>
                    <option>En proceso</option>
                    <option>Cancelada</option>
                  </select>
                  {!task.convocatoria && (
                    <Label label="Horas a sumar a cada persona (si la validas)">
                      <input type="number" name="horas" min={0.5} max={500} step={0.5} defaultValue={task.horas ?? ""} placeholder="Sin horas" className={inputCls} />
                      <span className="mt-1 block text-xs text-neutral-500">
                        {involved ? `Se sumarán a ${[task.assignee?.full_name, ...collaborators.map((c) => c.full_name)].filter(Boolean).map((n) => n!.split(" ")[0]).join(", ")}.` : "Asigna un responsable para que reciba las horas."} Puedes ajustarlas si el trabajo fue parcial.
                      </span>
                    </Label>
                  )}
                  <textarea name="resultado_revision" rows={3} placeholder="Comentario de la revisión…" className={inputCls} />
                  <SubmitButton className={`${btnPrimary} w-full`}>Guardar revisión</SubmitButton>
                </form>
              )}
            </section>
          )}

          {canManage && (
            <details className={`${card} p-5`}>
              <summary className="flex cursor-pointer items-center gap-2 font-semibold">
                <Pencil className="h-4 w-4 text-brand-600" /> Editar tarea
              </summary>
              <form key={`e-${task.updated_at}`} action={updateTask} className="mt-4 space-y-4 [&_.sm\:grid-cols-2]:grid-cols-1">
                <input type="hidden" name="id" value={task.id} />
                <TaskFields task={task} units={units} manageable={manageable} members={members ?? []} projects={projects ?? []} canAssign participantIds={collaborators.map((c) => c.id)} />
                <SubmitButton className={`${btnDark} w-full`}>Guardar cambios</SubmitButton>
              </form>
              <form action={deleteTask} className="mt-3">
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="parent_id" value={task.parent_id ?? ""} />
                <SubmitButton className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-sm text-brand-600 hover:bg-brand-50">
                  <Trash2 className="h-4 w-4" /> Eliminar tarea y subtareas
                </SubmitButton>
              </form>
            </details>
          )}

          <Link href="/tareas" className="flex items-center gap-2 text-sm text-neutral-500 hover:text-brand-600">
            <ListChecks className="h-4 w-4" /> Volver a tareas
          </Link>
        </aside>
      </div>
    </>
  );
}

function Row({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-neutral-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <div className="text-neutral-800">{children}</div>
    </div>
  );
}
