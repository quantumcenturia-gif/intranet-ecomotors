import Link from "next/link";
import { BookOpenCheck, ClipboardList, HardHat, Megaphone, ShieldCheck, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Badge, Label, btnDark, btnPrimary, card, inputCls } from "@/components/ui";
import { requireMe } from "@/lib/me";
import {
  EPP, FICHA_CATEGORIAS, PERMISO_ICON, PERMISO_STYLES, REPORTE_ESTADOS, REPORTE_TIPOS, RIESGO_STYLES, SEVERIDADES, SEVERIDAD_STYLES, fmtFechaHora,
} from "@/lib/safety";
import { TASK_SELECT, type TaskRow } from "@/lib/tasks";
import { flattenTree } from "@/lib/units";
import { createReport, deleteSheet, markRead, saveSheet, updateReport } from "./actions";
import SubmitButton from "@/components/SubmitButton";

type Report = {
  id: number; fecha: string; tipo: string; severidad: string; descripcion: string; lugar: string | null; accion: string | null; estado: string;
  created_at: string; cerrado_at: string | null;
  persona: { full_name: string } | null; reporta: { full_name: string } | null; unit: { name: string } | null;
};
type Sheet = {
  id: number; titulo: string; categoria: string; peligros: string | null; epp: string[]; precauciones: string | null;
  primeros_auxilios: string | null; enlace: string | null; obligatoria: boolean; publicada: boolean; updated_at: string;
};

export default async function SeguridadPage({ searchParams }: PageProps<"/seguridad">) {
  const sp = await searchParams;
  const { supabase, member, units, isSafety } = await requireMe();
  const vistas = isSafety ? (["aprobar", "trabajos", "reportes", "fichas"] as const) : (["fichas", "reportes", "trabajos"] as const);
  const vista = (vistas as readonly string[]).includes(String(sp.vista)) ? String(sp.vista) : vistas[0];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

  const [{ data: dias }, { data: risky }, { data: reportsData }, { data: sheetsData }, { data: myReads }, { data: people }] = await Promise.all([
    supabase.rpc("dias_sin_incidentes"),
    supabase.from("tasks").select(TASK_SELECT).neq("riesgo", "Bajo").not("estado", "in", "(Completada y validada,Cancelada)")
      .order("trabajo_inicio", { ascending: true, nullsFirst: false }).limit(200).returns<TaskRow[]>(),
    supabase.from("safety_reports")
      .select("id,fecha,tipo,severidad,descripcion,lugar,accion,estado,created_at,cerrado_at,persona:members!safety_reports_member_id_fkey(full_name),reporta:members!safety_reports_reportado_por_fkey(full_name),unit:units(name)")
      .order("created_at", { ascending: false }).limit(100).returns<Report[]>(),
    supabase.from("safety_sheets").select("*").order("categoria").order("titulo").returns<Sheet[]>(),
    member ? supabase.from("safety_reads").select("sheet_id,read_at").eq("member_id", member.id) : Promise.resolve({ data: [] as { sheet_id: number; read_at: string }[] }),
    supabase.from("members").select("id,full_name,unit_id").eq("es_prueba", false).neq("estado", "Miembro retirado").order("full_name"),
  ]);
  const { data: allReads } = isSafety ? await supabase.from("safety_reads").select("sheet_id,member_id") : { data: [] as { sheet_id: number; member_id: string }[] };

  const tasks = risky ?? [];
  const pendientes = tasks.filter((t) => t.seguridad_estado === "Pendiente");
  const reports = reportsData ?? [];
  const abiertos = reports.filter((r) => r.estado !== "Cerrado");
  const sheets = sheetsData ?? [];
  const readAt = new Map((myReads ?? []).map((r) => [r.sheet_id, r.read_at]));
  const team = people ?? [];
  const porLeer = sheets.filter((s) => s.publicada && s.obligatoria && !readAt.has(s.id));

  const label: Record<string, string> = { aprobar: `Por aprobar`, trabajos: "Trabajos de riesgo", reportes: "Reportes", fichas: "Fichas de seguridad" };
  const badge: Record<string, number> = { aprobar: pendientes.length, reportes: isSafety ? abiertos.length : 0, fichas: porLeer.length };

  return (
    <>
      <PageHeader icon={HardHat} title="Seguridad" subtitle="Trabajos de riesgo, reportes y fichas · la seguridad es de todos" />

      <div className="stagger mb-6 grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-xl bg-black p-5 text-white sm:col-span-1">
          <ShieldCheck className="h-10 w-10 shrink-0 text-emerald-400 animate-float" />
          <div>
            <p className="text-3xl font-bold">{dias === null || dias === undefined || dias < 0 ? "0" : dias}</p>
            <p className="text-sm text-neutral-400">{dias === null || dias === undefined || dias < 0 ? "incidentes registrados" : `día${dias === 1 ? "" : "s"} sin incidentes`}</p>
          </div>
        </div>
        <Link href="/seguridad?vista=reportes#reportar" className={`${card} group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md`}>
          <Megaphone className="h-8 w-8 shrink-0 text-amber-600 group-hover:animate-wiggle" />
          <div>
            <p className="font-semibold">¿Viste algo inseguro?</p>
            <p className="text-sm text-neutral-500">Repórtalo en 1 minuto: falta de EPP, una condición peligrosa o un incidente.</p>
          </div>
        </Link>
        <Link href="/seguridad?vista=fichas" className={`${card} group flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md`}>
          <BookOpenCheck className="h-8 w-8 shrink-0 text-amber-600 group-hover:animate-wiggle" />
          <div>
            <p className="font-semibold">{porLeer.length ? `Tienes ${porLeer.length} ficha${porLeer.length > 1 ? "s" : ""} por leer` : "Fichas al día ✅"}</p>
            <p className="text-sm text-neutral-500">Riesgos de los materiales y herramientas que usamos.</p>
          </div>
        </Link>
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 rounded-xl bg-neutral-200/60 p-1">
        {vistas.map((v) => (
          <Link key={v} href={`/seguridad?vista=${v}`} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition duration-200 active:scale-95 ${vista === v ? "bg-black text-white shadow-md" : "text-neutral-600 hover:bg-neutral-200"}`}>
            {label[v]}
            {!!badge[v] && <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{badge[v]}</span>}
          </Link>
        ))}
      </nav>

      {/* ---------- Por aprobar (solo Seguridad) ---------- */}
      {vista === "aprobar" && (
        pendientes.length ? (
          <div className="stagger space-y-3">
            {pendientes.map((t) => <RiskCard key={t.id} t={t} action="Revisar y decidir" />)}
          </div>
        ) : (
          <Empty text="No hay trabajos esperando aprobación. 🎉" />
        )
      )}

      {/* ---------- Trabajos de riesgo ---------- */}
      {vista === "trabajos" && (
        tasks.length ? (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500">{isSafety ? "Todos los trabajos de riesgo medio o mayor que siguen abiertos, por fecha." : "Tus trabajos de riesgo y los de tu área, por fecha."}</p>
            {tasks.map((t) => <RiskCard key={t.id} t={t} action="Ver tarea" />)}
          </div>
        ) : (
          <Empty text="No hay trabajos de riesgo abiertos." />
        )
      )}

      {/* ---------- Reportes ---------- */}
      {vista === "reportes" && (
        <div className="space-y-6">
          <details id="reportar" className={`${card} p-5`} open={!reports.length || sp.nuevo === "1"}>
            <summary className="cursor-pointer font-semibold">🦺 Reportar algo inseguro</summary>
            <form action={createReport} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Label label="¿Qué pasó?">
                <select name="tipo" className={inputCls}>{REPORTE_TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
              </Label>
              <Label label="Gravedad">
                <select name="severidad" className={inputCls}>{SEVERIDADES.map((t) => <option key={t}>{t}</option>)}</select>
              </Label>
              <Label label="Descripción" className="sm:col-span-2">
                <textarea name="descripcion" required rows={3} placeholder="Ej. Estaban usando la amoladora sin lentes ni guarda." className={inputCls} />
              </Label>
              <Label label="Fecha"><input type="date" name="fecha" defaultValue={today} max={today} className={inputCls} /></Label>
              <Label label="Lugar"><input name="lugar" placeholder="Ej. Taller FIM" className={inputCls} /></Label>
              <Label label="Área (opcional)">
                <select name="unit_id" defaultValue="" className={inputCls}>
                  <option value="">—</option>
                  {flattenTree(units).map(({ unit, depth }) => <option key={unit.id} value={unit.id}>{"  ".repeat(depth)}{unit.name}</option>)}
                </select>
              </Label>
              <Label label="Persona involucrada (opcional)">
                <select name="member_id" defaultValue="" className={inputCls}>
                  <option value="">— Nadie en particular —</option>
                  {team.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </Label>
              <p className="text-xs text-neutral-500 sm:col-span-2">El objetivo es prevenir, no castigar. Si indicas a una persona, recibirá un aviso respetuoso y Seguridad lo revisará con ella.</p>
              <div><SubmitButton className={btnPrimary}>Enviar reporte</SubmitButton></div>
            </form>
          </details>

          {reports.length ? (
            <ul className="stagger space-y-3">
              {reports.map((r) => (
                <li key={r.id} className={`${card} p-5`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-neutral-900 text-white">{r.tipo}</Badge>
                    <Badge className={SEVERIDAD_STYLES[r.severidad]}>{r.severidad}</Badge>
                    <Badge className={r.estado === "Cerrado" ? "bg-emerald-100 text-emerald-800" : r.estado === "En seguimiento" ? "bg-amber-100 text-amber-900" : "bg-red-100 text-red-800"}>{r.estado}</Badge>
                    <span className="ml-auto text-xs text-neutral-500">{new Date(r.fecha + "T12:00").toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-neutral-800">{r.descripcion}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {[r.lugar, r.unit?.name, r.persona ? `Involucrado/a: ${r.persona.full_name}` : null, r.reporta ? `Reportó: ${r.reporta.full_name}` : null].filter(Boolean).join(" · ")}
                  </p>
                  {r.accion && <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-900"><b>Acción:</b> {r.accion}</p>}
                  {isSafety && (
                    <form key={`${r.id}-${r.estado}`} action={updateReport} className="mt-3 grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="estado" defaultValue={r.estado} className={inputCls}>{REPORTE_ESTADOS.map((e) => <option key={e}>{e}</option>)}</select>
                      <input name="accion" defaultValue={r.accion ?? ""} placeholder="Acción correctiva (charla, entrega de EPP, arreglo…)" className={inputCls} />
                      <SubmitButton className={btnDark}>Guardar</SubmitButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Aún no hay reportes. ¡Ojalá siga así!" />
          )}
        </div>
      )}

      {/* ---------- Fichas ---------- */}
      {vista === "fichas" && (
        <div className="space-y-4">
          {isSafety && (
            <details className={`${card} p-5`}>
              <summary className="cursor-pointer font-semibold">➕ Nueva ficha de seguridad</summary>
              <SheetForm />
            </details>
          )}
          {sheets.length ? sheets.map((s) => {
            const readers = (allReads ?? []).filter((r) => r.sheet_id === s.id).map((r) => r.member_id);
            const missing = team.filter((m) => !readers.includes(m.id));
            return (
              <article key={s.id} className={`${card} p-5 ${!s.publicada ? "border-dashed opacity-90" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{s.titulo}</h2>
                  <Badge className="bg-neutral-100 text-neutral-700">{s.categoria}</Badge>
                  {s.obligatoria && <Badge className="bg-amber-100 text-amber-900">Obligatoria</Badge>}
                  {!s.publicada && <Badge className="bg-neutral-900 text-white">Borrador · solo Seguridad la ve</Badge>}
                </div>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {s.peligros && <Block title="⚠️ Riesgos" text={s.peligros} />}
                  {s.epp.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">🦺 EPP</p>
                      <div className="mt-1 flex flex-wrap gap-1">{s.epp.map((e) => <Badge key={e} className="bg-neutral-900 text-white">{e}</Badge>)}</div>
                    </div>
                  )}
                  {s.precauciones && <Block title="✅ Cómo trabajar seguro" text={s.precauciones} />}
                  {s.primeros_auxilios && <Block title="🩹 Si pasa algo" text={s.primeros_auxilios} />}
                </div>
                {s.enlace && <a href={s.enlace} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand-600 hover:underline">📄 Hoja de seguridad / documento</a>}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3">
                  {s.publicada && (readAt.has(s.id) ? (
                    <span className="text-sm text-emerald-700">✅ La leíste el {new Date(readAt.get(s.id)!).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}</span>
                  ) : member ? (
                    <form action={markRead}><input type="hidden" name="id" value={s.id} /><SubmitButton className={btnPrimary}>📖 Leí y entendí</SubmitButton></form>
                  ) : null)}
                  {isSafety && s.publicada && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-neutral-600">{readers.length} de {team.length} la leyeron · ver quién falta</summary>
                      <p className="mt-2 max-h-40 overflow-y-auto text-xs text-neutral-600">{missing.map((m) => m.full_name).join(" · ") || "¡Todos la leyeron!"}</p>
                    </details>
                  )}
                  {isSafety && (
                    <details className="w-full">
                      <summary className="cursor-pointer text-sm text-brand-600">✏️ Editar, publicar o borrar</summary>
                      <SheetForm s={s} />
                      <form action={deleteSheet} className="mt-2"><input type="hidden" name="id" value={s.id} /><SubmitButton className="flex items-center gap-1 text-sm text-red-600 hover:underline"><Trash2 className="h-4 w-4" /> Borrar ficha</SubmitButton></form>
                    </details>
                  )}
                </div>
              </article>
            );
          }) : (
            <Empty text="Seguridad aún no ha publicado fichas." />
          )}
        </div>
      )}
    </>
  );
}

function RiskCard({ t, action }: { t: TaskRow; action: string }) {
  return (
    <Link href={`/tareas/${t.id}`} className={`${card} group block p-4 transition hover:shadow-md`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={RIESGO_STYLES[t.riesgo]}>🦺 {t.riesgo}</Badge>
        <Badge className={PERMISO_STYLES[t.seguridad_estado]}>{PERMISO_ICON[t.seguridad_estado]} {t.seguridad_estado === "Pendiente" ? "Por aprobar" : t.seguridad_estado}</Badge>
        <p className="min-w-0 flex-1 truncate font-semibold">{t.title}</p>
        <span className="text-sm font-medium text-brand-600">{action} →</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        <ClipboardList className="mr-1 inline h-3 w-3" />
        {[t.unit?.name, t.assignee?.full_name, `${fmtFechaHora(t.trabajo_inicio)}${t.trabajo_lugar ? ` · ${t.trabajo_lugar}` : ""}`].filter(Boolean).join(" · ")}
      </p>
      {(t.peligros.length > 0 || t.epp.length > 0) && (
        <p className="mt-1 text-xs text-neutral-600">{[...t.peligros.map((p) => `⚠️ ${p}`), ...t.epp.map((e) => `🦺 ${e}`)].join("  ")}</p>
      )}
    </Link>
  );
}

function SheetForm({ s }: { s?: Sheet }) {
  return (
    <form action={saveSheet} className="mt-4 grid gap-3 sm:grid-cols-2">
      {s && <input type="hidden" name="id" value={s.id} />}
      <Label label="Título" className="sm:col-span-2"><input name="titulo" required defaultValue={s?.titulo} placeholder="Ej. Fibra de carbono" className={inputCls} /></Label>
      <Label label="Categoría">
        <select name="categoria" defaultValue={s?.categoria ?? "Material"} className={inputCls}>{FICHA_CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select>
      </Label>
      <Label label="Enlace a la hoja de seguridad (opcional)"><input name="enlace" type="url" defaultValue={s?.enlace ?? ""} placeholder="https://…" className={inputCls} /></Label>
      <Label label="Riesgos" className="sm:col-span-2"><textarea name="peligros" rows={2} defaultValue={s?.peligros ?? ""} className={inputCls} /></Label>
      <Label label="Cómo trabajar seguro" className="sm:col-span-2"><textarea name="precauciones" rows={3} defaultValue={s?.precauciones ?? ""} className={inputCls} /></Label>
      <Label label="Si pasa algo (primeros auxilios)" className="sm:col-span-2"><textarea name="primeros_auxilios" rows={2} defaultValue={s?.primeros_auxilios ?? ""} className={inputCls} /></Label>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">EPP</legend>
        <div className="grid gap-1 sm:grid-cols-3">
          {EPP.map((e) => (
            <label key={e} className="flex items-center gap-2 text-sm"><input type="checkbox" name="epp" value={e} defaultChecked={s?.epp.includes(e)} className="accent-amber-600" /> {e}</label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="obligatoria" defaultChecked={s?.obligatoria} className="accent-amber-600" /> Obligatoria (todos deben leerla)</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="publicada" defaultChecked={s ? s.publicada : true} className="accent-amber-600" /> Publicada (visible para el equipo)</label>
      <p className="text-xs text-neutral-500 sm:col-span-2">Al publicar una ficha obligatoria, todo el equipo recibe un aviso para leerla.</p>
      <div><SubmitButton className={btnPrimary}>Guardar ficha</SubmitButton></div>
    </form>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</p>
      <p className="mt-1 whitespace-pre-line text-neutral-700">{text}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">{text}</p>;
}
