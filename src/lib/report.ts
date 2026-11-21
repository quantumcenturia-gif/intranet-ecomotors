import "server-only";
import { requireMe, type Member } from "@/lib/me";
import { subtree, unitPath } from "@/lib/units";
import { estadoVisible } from "@/data/eco-motors";

/** Periodo por defecto: el mes actual (hora de Lima). */
export function defaultPeriod() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  return { desde: today.slice(0, 8) + "01", hasta: today };
}

export type ReportParams = { scope: "area" | "integrante"; unit: string; member: string; desde: string; hasta: string };

export function parseParams(sp: Record<string, string | string[] | undefined>): ReportParams {
  const g = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const d = defaultPeriod();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  return {
    scope: g("scope") === "integrante" ? "integrante" : "area",
    unit: g("unit") || "__todos__",
    member: g("member"),
    desde: iso.test(g("desde")) ? g("desde") : d.desde,
    hasta: iso.test(g("hasta")) ? g("hasta") : d.hasta,
  };
}

type Sess = { id: number; unit_id: string | null; tipo: string; titulo: string; fecha: string; estado: string };
type Rec = { session_id: number; member_id: string; entrada: string | null; salida: string | null; horas: number | null; observacion: string | null };
type TaskR = {
  id: number; title: string; unit_id: string; assignee_id: string | null; estado: string; prioridad: string; avance: number;
  fecha_asignacion: string; fecha_limite: string | null; updated_at: string; resultado_revision: string | null; entrega_url: string | null;
  project: { name: string } | null;
};
type Hour = { member_id: string; fecha: string; horas: number; actividad: string };

export type MemberRow = {
  member: Pick<Member, "id" | "full_name" | "unit_id" | "rol" | "email" | "especialidad" | "ciclo">;
  unidad: string;
  convocadas: number;
  asistidas: number;
  pctAsistencia: number | null;
  horasAsistencia: number;
  horasRegistradas: number;
  tareas: number;
  completadas: number;
  abiertas: number;
  atrasadas: number;
  avanceMedio: number | null;
};

/** Reúne asistencias, horas y tareas del alcance elegido, respetando los permisos de quien consulta. */
export async function buildReport(p: ReportParams) {
  const me = await requireMe();
  const { supabase, units, manageable, isAdmin, isManager } = me;
  if (!isManager) throw new Error("Solo dirección, supervisores y encargados pueden ver reportes.");
  const unitName = new Map(units.map((u) => [u.id, u.name]));

  // 1) Miembros del alcance (limitado a lo que el usuario gestiona)
  let mq = supabase.from("members").select("id,full_name,unit_id,rol,email,especialidad,ciclo,estado").neq("estado", "Miembro retirado").order("full_name");
  let scopeLabel = "Todo el equipo";
  if (p.scope === "integrante") {
    mq = mq.eq("id", p.member || "00000000-0000-0000-0000-000000000000");
  } else if (p.unit !== "__todos__") {
    mq = mq.in("unit_id", subtree(units, p.unit));
    scopeLabel = unitPath(units, p.unit).map((u) => u.name).join(" › ");
  }
  const { data: allMembers, error: e1 } = await mq;
  if (e1) throw new Error(e1.message);
  const members = (allMembers ?? []).filter((m) => isAdmin || manageable.has(m.unit_id)) as MemberRow["member"][];
  if (p.scope === "integrante") scopeLabel = members[0]?.full_name ?? "—";
  const ids = members.map((m) => m.id);
  const none = ["00000000-0000-0000-0000-000000000000"];

  // 2) Asistencias, horas y tareas del periodo
  const [{ data: sessions }, { data: hours }, { data: tasks }] = await Promise.all([
    supabase.from("attendance_sessions").select("id,unit_id,tipo,titulo,fecha,estado").gte("fecha", p.desde).lte("fecha", p.hasta).order("fecha"),
    supabase.from("time_entries").select("member_id,fecha,horas,actividad").in("member_id", ids.length ? ids : none).gte("fecha", p.desde).lte("fecha", p.hasta).order("fecha"),
    supabase
      .from("tasks")
      .select("id,title,unit_id,assignee_id,estado,prioridad,avance,fecha_asignacion,fecha_limite,updated_at,resultado_revision,entrega_url,project:projects(name)")
      .in("assignee_id", ids.length ? ids : none)
      .lte("fecha_asignacion", p.hasta)
      .order("fecha_asignacion"),
  ]);
  const sess = (sessions ?? []) as Sess[];
  const sessIds = sess.map((s) => s.id);
  const { data: records } = await supabase
    .from("attendance_records")
    .select("session_id,member_id,entrada,salida,horas,observacion")
    .in("session_id", sessIds.length ? sessIds : [-1])
    .in("member_id", ids.length ? ids : none);
  const recs = (records ?? []) as Rec[];
  const hrs = (hours ?? []) as Hour[];
  // Tareas relevantes: abiertas, o cerradas/actualizadas dentro del periodo
  const tks = ((tasks ?? []) as unknown as TaskR[]).filter(
    (t) => !["Completada y validada", "Cancelada"].includes(t.estado) || t.updated_at.slice(0, 10) >= p.desde,
  );

  const convoca = (s: Sess, m: MemberRow["member"]) => s.unit_id === null || subtree(units, s.unit_id).includes(m.unit_id);
  const relevantSessions = sess.filter((s) => s.estado !== "Abierta" && members.some((m) => convoca(s, m)));

  const rows: MemberRow[] = members.map((m) => {
    const conv = relevantSessions.filter((s) => convoca(s, m));
    const mine = recs.filter((r) => r.member_id === m.id && conv.some((s) => s.id === r.session_id));
    const verifiedIds = new Set(conv.filter((s) => s.estado === "Verificada").map((s) => s.id));
    const mt = tks.filter((t) => t.assignee_id === m.id);
    const open = mt.filter((t) => !["Completada y validada", "Cancelada"].includes(t.estado));
    return {
      member: m,
      unidad: unitName.get(m.unit_id) ?? "",
      convocadas: conv.length,
      asistidas: mine.filter((r) => r.entrada).length,
      pctAsistencia: conv.length ? Math.round((mine.filter((r) => r.entrada).length / conv.length) * 100) : null,
      horasAsistencia: mine.filter((r) => verifiedIds.has(r.session_id)).reduce((a, r) => a + Number(r.horas ?? 0), 0),
      horasRegistradas: hrs.filter((h) => h.member_id === m.id).reduce((a, h) => a + Number(h.horas), 0),
      tareas: mt.length,
      completadas: mt.filter((t) => t.estado === "Completada y validada").length,
      abiertas: open.length,
      atrasadas: open.filter((t) => estadoVisible(t) === "Atrasada").length,
      avanceMedio: open.length ? Math.round(open.reduce((a, t) => a + t.avance, 0) / open.length) : null,
    };
  });

  const sum = (f: (r: MemberRow) => number) => rows.reduce((a, r) => a + f(r), 0);
  const conv = sum((r) => r.convocadas);
  const totals = {
    integrantes: rows.length,
    sesiones: relevantSessions.length,
    sesionesVerificadas: relevantSessions.filter((s) => s.estado === "Verificada").length,
    pctAsistencia: conv ? Math.round((sum((r) => r.asistidas) / conv) * 100) : null,
    horasAsistencia: sum((r) => r.horasAsistencia),
    horasRegistradas: sum((r) => r.horasRegistradas),
    tareas: sum((r) => r.tareas),
    completadas: sum((r) => r.completadas),
    abiertas: sum((r) => r.abiertas),
    atrasadas: sum((r) => r.atrasadas),
  };

  const nameOf = new Map(members.map((m) => [m.id, m.full_name]));
  return {
    scopeLabel,
    params: p,
    rows,
    totals,
    sessions: relevantSessions.map((s) => {
      const convocados = members.filter((m) => convoca(s, m));
      const presentes = recs.filter((r) => r.session_id === s.id && r.entrada);
      return { ...s, lugar: s.unit_id ? unitName.get(s.unit_id) ?? "" : "Todo el equipo", convocados: convocados.length, presentes: presentes.length,
        horas: presentes.reduce((a, r) => a + Number(r.horas ?? 0), 0) };
    }),
    attendanceDetail: recs
      .map((r) => ({ ...r, nombre: nameOf.get(r.member_id) ?? "", sesion: sess.find((s) => s.id === r.session_id)! }))
      .filter((r) => r.sesion)
      .sort((a, b) => a.sesion.fecha.localeCompare(b.sesion.fecha) || a.nombre.localeCompare(b.nombre)),
    tasks: tks.map((t) => ({ ...t, responsable: nameOf.get(t.assignee_id ?? "") ?? "", unidad: unitName.get(t.unit_id) ?? "", estadoVisible: estadoVisible(t) })),
    hours: hrs.map((h) => ({ ...h, nombre: nameOf.get(h.member_id) ?? "" })),
    isAdmin,
    generado: new Date().toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" }),
    por: me.member?.full_name ?? me.profile?.full_name ?? "",
  };
}

export type Report = Awaited<ReturnType<typeof buildReport>>;

/** CSV con BOM para que Excel lo abra con tildes. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}
