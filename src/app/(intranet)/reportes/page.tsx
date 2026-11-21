/* eslint-disable @next/next/no-img-element -- logo estático en el encabezado imprimible */
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CalendarCheck2, Clock, FileSpreadsheet, FileText, ListChecks, Users } from "lucide-react";
import PrintButton from "@/components/PrintButton";
import { Badge, Label, btnDark, card, inputCls } from "@/components/ui";
import { ESTADO_STYLES } from "@/data/eco-motors";
import { SESSION_STYLES, TIPO_STYLES, dayLabel, fmtHours, hhmm } from "@/lib/attendance";
import { requireMe } from "@/lib/me";
import { buildReport, parseParams } from "@/lib/report";
import { flattenTree } from "@/lib/units";

const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });

function periods() {
  const t = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const [y, m] = t.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const prevY = m === 1 ? y - 1 : y, prevM = m === 1 ? 12 : m - 1;
  const lastDay = new Date(prevY, prevM, 0).getDate();
  const sem = m <= 7 ? { desde: `${y}-03-01`, hasta: `${y}-07-31` } : { desde: `${y}-08-01`, hasta: `${y}-12-31` };
  return [
    { label: "Este mes", desde: `${y}-${pad(m)}-01`, hasta: t },
    { label: "Mes anterior", desde: `${prevY}-${pad(prevM)}-01`, hasta: `${prevY}-${pad(prevM)}-${lastDay}` },
    { label: "Este semestre", ...sem },
    { label: "Este año", desde: `${y}-01-01`, hasta: `${y}-12-31` },
  ];
}

export default async function ReportesPage({ searchParams }: PageProps<"/reportes">) {
  await connection();
  const sp = await searchParams;
  const p = parseParams(sp);
  const { supabase, units, manageable, isAdmin, isManager } = await requireMe();
  if (!isManager) redirect("/");

  const [r, { data: allMembers }] = await Promise.all([
    buildReport(p),
    supabase.from("members").select("id,full_name,unit_id").eq("es_prueba", false).neq("estado", "Miembro retirado").order("full_name"),
  ]);
  const members = (allMembers ?? []).filter((m) => isAdmin || manageable.has(m.unit_id));
  const tree = flattenTree(units, isAdmin ? undefined : manageable).filter(({ unit }) => unit.id !== "por-asignar" || isAdmin);
  const qs = (extra: Record<string, string>) => new URLSearchParams({ scope: p.scope, unit: p.unit, member: p.member, desde: p.desde, hasta: p.hasta, ...extra }).toString();
  const t = r.totals;
  const isOne = p.scope === "integrante";

  return (
    <div className="space-y-6">
      {/* Filtros (no se imprimen) */}
      <form key={qs({})} className={`${card} grid gap-4 p-5 md:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] md:items-end print:hidden`}>
        <Label label="Reporte de">
          <select name="scope" defaultValue={p.scope} className={inputCls}>
            <option value="area">Un área</option>
            <option value="integrante">Un integrante</option>
          </select>
        </Label>
        {p.scope === "integrante" ? (
          <Label label="Integrante">
            <select name="member" defaultValue={p.member} required className={inputCls}>
              <option value="" disabled>Elige…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </Label>
        ) : (
          <Label label="Área">
            <select name="unit" defaultValue={p.unit} className={inputCls}>
              {isAdmin && <option value="__todos__">Todo el equipo</option>}
              {tree.map(({ unit, depth }) => <option key={unit.id} value={unit.id}>{"  ".repeat(depth)}{unit.name}</option>)}
            </select>
          </Label>
        )}
        <Label label="Desde"><input type="date" name="desde" defaultValue={p.desde} className={inputCls} /></Label>
        <Label label="Hasta"><input type="date" name="hasta" defaultValue={p.hasta} className={inputCls} /></Label>
        <button className={btnDark}>Ver reporte</button>
        <div className="flex flex-wrap items-center gap-2 md:col-span-5">
          <span className="text-xs text-neutral-500">Periodos rápidos:</span>
          {periods().map((x) => (
            <Link key={x.label} href={`/reportes?${qs({ desde: x.desde, hasta: x.hasta })}`} className="rounded-full bg-neutral-100 px-3 py-1 text-xs hover:bg-brand-50">{x.label}</Link>
          ))}
          <span className="ml-auto text-xs text-neutral-400">Cambia «Reporte de» y pulsa «Ver reporte» para elegir integrante o área.</span>
        </div>
      </form>

      {/* Exportar (no se imprime) */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <PrintButton />
        {[
          ["resumen", isOne ? "Excel · resumen" : "Excel · por integrante"],
          ["asistencia", "Excel · asistencias"],
          ["tareas", "Excel · tareas"],
          ["horas", "Excel · horas registradas"],
        ].map(([tipo, label]) => (
          <a key={tipo} href={`/reportes/export?${qs({ tipo })}`} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {label}
          </a>
        ))}
      </div>

      {/* ===== Documento del reporte ===== */}
      <article className="space-y-6">
        <header className="print-exact flex flex-wrap items-center gap-5 rounded-xl border-l-8 border-brand-600 bg-black p-6 text-white">
          <img src="/logo-eco-motors.png" alt="Eco Motors" className="h-12 w-auto" />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-neutral-400">Semillero de Investigación Eco Motors · FIM UNI</p>
            <h1 className="text-2xl font-bold">Reporte de actividad · {r.scopeLabel}</h1>
            <p className="text-sm text-neutral-300">Del {fmtDate(p.desde)} al {fmtDate(p.hasta)}</p>
          </div>
          <div className="text-right text-xs text-neutral-400">
            <p>Generado el {r.generado}</p>
            {r.por && <p>por {r.por}</p>}
          </div>
        </header>

        {isOne && r.rows[0] && (
          <section className={`${card} grid gap-2 p-5 text-sm sm:grid-cols-3`}>
            <p><span className="text-neutral-500">Integrante:</span> <b>{r.rows[0].member.full_name}</b></p>
            <p><span className="text-neutral-500">Subárea:</span> {r.rows[0].unidad} · {r.rows[0].member.rol}</p>
            <p><span className="text-neutral-500">Correo:</span> {r.rows[0].member.email ?? "—"}</p>
            {r.rows[0].member.especialidad && <p><span className="text-neutral-500">Especialidad:</span> {r.rows[0].member.especialidad}{r.rows[0].member.ciclo ? ` · ${r.rows[0].member.ciclo}.º ciclo` : ""}</p>}
          </section>
        )}
        {isOne && !r.rows[0] && <p className={`${card} p-5 text-sm text-neutral-500`}>Elige un integrante arriba.</p>}

        {/* Indicadores */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Users, label: isOne ? "Subárea" : "Integrantes", value: isOne ? r.rows[0]?.unidad ?? "—" : String(t.integrantes) },
            { icon: CalendarCheck2, label: "Asistencia", value: t.pctAsistencia === null ? "—" : `${t.pctAsistencia}%`, sub: `${t.sesiones} sesiones (${t.sesionesVerificadas} verificadas)` },
            { icon: Clock, label: "Horas de asistencia verificadas", value: fmtHours(t.horasAsistencia), sub: `+ ${fmtHours(t.horasRegistradas)} registradas en «Horas»` },
            { icon: ListChecks, label: "Tareas completadas", value: `${t.completadas} / ${t.tareas}`, sub: `${t.abiertas} abiertas · ${t.atrasadas} atrasadas` },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="print-exact rounded-xl border-l-4 border-brand-600 bg-black p-4 text-white">
              <Icon className="mb-2 h-5 w-5 text-brand-500" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-neutral-300">{label}</p>
              {sub && <p className="mt-1 text-[11px] text-neutral-500">{sub}</p>}
            </div>
          ))}
        </section>

        {/* Por integrante */}
        {!isOne && (
          <section className={`${card} overflow-x-auto`}>
            <h2 className="border-b border-neutral-100 p-4 font-semibold">Resumen por integrante</h2>
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-2">Integrante</th><th className="px-2">Subárea</th><th className="px-2 text-right">Asistencia</th>
                  <th className="px-2 text-right">H. asistencia</th><th className="px-2 text-right">H. registradas</th>
                  <th className="px-2 text-right">Tareas</th><th className="px-2 text-right">Atrasadas</th><th className="px-4 text-right">Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {r.rows.map((x) => (
                  <tr key={x.member.id} className="break-inside-avoid">
                    <td className="px-4 py-2">
                      <Link href={`/reportes?${qs({ scope: "integrante", member: x.member.id })}`} className="font-medium hover:text-brand-600">{x.member.full_name}</Link>
                      <span className="block text-xs text-neutral-400">{x.member.rol}</span>
                    </td>
                    <td className="px-2 text-neutral-600">{x.unidad}</td>
                    <td className="px-2 text-right">{x.convocadas ? <>{x.asistidas}/{x.convocadas} <span className="text-xs text-neutral-400">({x.pctAsistencia}%)</span></> : "—"}</td>
                    <td className="px-2 text-right">{x.horasAsistencia ? fmtHours(x.horasAsistencia) : "—"}</td>
                    <td className="px-2 text-right">{x.horasRegistradas ? fmtHours(x.horasRegistradas) : "—"}</td>
                    <td className="px-2 text-right">{x.tareas ? `${x.completadas}/${x.tareas}` : "—"}</td>
                    <td className={`px-2 text-right ${x.atrasadas ? "font-semibold text-brand-600" : "text-neutral-300"}`}>{x.atrasadas}</td>
                    <td className="px-4 text-right">{x.avanceMedio === null ? "—" : `${x.avanceMedio}%`}</td>
                  </tr>
                ))}
                {!r.rows.length && <tr><td colSpan={8} className="p-5 text-center text-neutral-500">No hay integrantes en esta selección.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {/* Asistencias */}
        <section className={`${card} overflow-x-auto break-inside-avoid-page`}>
          <h2 className="border-b border-neutral-100 p-4 font-semibold">Asistencias del periodo</h2>
          {isOne ? (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500"><tr className="border-b border-neutral-100">
                <th className="px-4 py-2">Fecha</th><th className="px-2">Sesión</th><th className="px-2">Entrada</th><th className="px-2">Salida</th><th className="px-2 text-right">Horas</th><th className="px-4">Estado</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {r.sessions.map((s) => {
                  const a = r.attendanceDetail.find((d) => d.session_id === s.id);
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-2 whitespace-nowrap">{dayLabel(s.fecha)}</td>
                      <td className="px-2"><span className="mr-1"><Badge className={TIPO_STYLES[s.tipo]}>{s.tipo}</Badge></span>{s.titulo}</td>
                      <td className="px-2">{a ? hhmm(a.entrada) : <span className="text-brand-600">Ausente</span>}</td>
                      <td className="px-2">{a ? hhmm(a.salida) : ""}</td>
                      <td className="px-2 text-right">{a?.horas ? fmtHours(Number(a.horas)) : "—"}</td>
                      <td className="px-4"><Badge className={SESSION_STYLES[s.estado]}>{s.estado === "Verificada" ? "Verificada" : "Por verificar"}</Badge></td>
                    </tr>
                  );
                })}
                {!r.sessions.length && <tr><td colSpan={6} className="p-5 text-center text-neutral-500">No hubo asistencias en este periodo.</td></tr>}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500"><tr className="border-b border-neutral-100">
                <th className="px-4 py-2">Fecha</th><th className="px-2">Sesión</th><th className="px-2">Para</th><th className="px-2 text-right">Presentes</th><th className="px-2 text-right">Horas</th><th className="px-4">Estado</th></tr></thead>
              <tbody className="divide-y divide-neutral-100">
                {r.sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2 whitespace-nowrap">{dayLabel(s.fecha)}</td>
                    <td className="px-2"><span className="mr-1"><Badge className={TIPO_STYLES[s.tipo]}>{s.tipo}</Badge></span>{s.titulo}</td>
                    <td className="px-2 text-neutral-600">{s.lugar}</td>
                    <td className="px-2 text-right">{s.presentes}/{s.convocados}</td>
                    <td className="px-2 text-right">{fmtHours(s.horas)}</td>
                    <td className="px-4"><Badge className={SESSION_STYLES[s.estado]}>{s.estado === "Verificada" ? "Verificada" : "Por verificar"}</Badge></td>
                  </tr>
                ))}
                {!r.sessions.length && <tr><td colSpan={6} className="p-5 text-center text-neutral-500">No hubo asistencias en este periodo.</td></tr>}
              </tbody>
            </table>
          )}
        </section>

        {/* Tareas */}
        <section className={`${card} overflow-x-auto`}>
          <h2 className="border-b border-neutral-100 p-4 font-semibold">Tareas y avances</h2>
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500"><tr className="border-b border-neutral-100">
              <th className="px-4 py-2">Tarea</th>{!isOne && <th className="px-2">Responsable</th>}<th className="px-2">Unidad</th><th className="px-2">Límite</th><th className="px-2 text-right">Avance</th><th className="px-4">Estado</th></tr></thead>
            <tbody className="divide-y divide-neutral-100">
              {r.tasks.map((x) => (
                <tr key={x.id} className="break-inside-avoid">
                  <td className="px-4 py-2">
                    <Link href={`/tareas/${x.id}`} className="font-medium hover:text-brand-600">{x.title}</Link>
                    {x.resultado_revision && <span className="block text-xs text-neutral-500">Revisión: {x.resultado_revision}</span>}
                  </td>
                  {!isOne && <td className="px-2 text-neutral-600">{x.responsable}</td>}
                  <td className="px-2 text-neutral-600">{x.unidad}</td>
                  <td className="px-2 whitespace-nowrap">{x.fecha_limite ? dayLabel(x.fecha_limite) : "—"}</td>
                  <td className="px-2 text-right">{x.avance}%</td>
                  <td className="px-4"><Badge className={ESTADO_STYLES[x.estadoVisible]}>{x.estadoVisible}</Badge></td>
                </tr>
              ))}
              {!r.tasks.length && <tr><td colSpan={6} className="p-5 text-center text-neutral-500">No hay tareas en este periodo.</td></tr>}
            </tbody>
          </table>
        </section>

        {/* Horas registradas (detalle de un integrante) */}
        {isOne && (
          <section className={`${card} overflow-x-auto`}>
            <h2 className="border-b border-neutral-100 p-4 font-semibold">Horas registradas por el integrante</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-neutral-100">
                {r.hours.map((h, i) => (
                  <tr key={i}><td className="w-32 px-4 py-2">{dayLabel(h.fecha)}</td><td className="px-2">{h.actividad}</td><td className="px-4 text-right font-medium">{fmtHours(Number(h.horas))}</td></tr>
                ))}
                {!r.hours.length && <tr><td className="p-5 text-center text-neutral-500">No registró horas en este periodo.</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        <footer className="hidden border-t border-neutral-300 pt-8 text-sm print:block">
          <div className="grid grid-cols-2 gap-16 pt-10">
            <p className="border-t border-neutral-400 pt-1 text-center">Coordinación General · Eco Motors</p>
            <p className="border-t border-neutral-400 pt-1 text-center">Unidad de Investigación · FIM UNI</p>
          </div>
        </footer>
      </article>

      <p className="flex items-center gap-1.5 text-xs text-neutral-400 print:hidden">
        <FileText className="h-3.5 w-3.5" /> Para el PDF: «Imprimir / Guardar PDF» → Destino «Guardar como PDF». Activa «Gráficos de fondo» para conservar los colores.
      </p>
    </div>
  );
}
