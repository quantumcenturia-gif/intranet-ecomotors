import type { NextRequest } from "next/server";
import { buildReport, parseParams, toCsv } from "@/lib/report";
import { hhmm } from "@/lib/attendance";

/** Descarga de los datos del reporte en CSV (se abre directamente en Excel). */
export async function GET(request: NextRequest) {
  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const tipo = sp.tipo ?? "resumen";
  const r = await buildReport(parseParams(sp));
  const n = (x: number) => Number(x.toFixed(2));
  let csv: string;

  if (tipo === "asistencia") {
    csv = toCsv(
      ["Fecha", "Tipo", "Sesión", "Área", "Estado de la sesión", "Integrante", "Entrada", "Salida", "Horas", "Observación"],
      r.attendanceDetail.map((a) => [a.sesion.fecha, a.sesion.tipo, a.sesion.titulo, a.sesion.unit_id ?? "Todo el equipo", a.sesion.estado, a.nombre, hhmm(a.entrada), hhmm(a.salida), a.horas ?? "", a.observacion ?? ""]),
    );
  } else if (tipo === "tareas") {
    csv = toCsv(
      ["Tarea", "Unidad", "Responsable", "Estado", "Prioridad", "Avance %", "Asignada", "Fecha límite", "Proyecto", "Resultado de revisión", "Entrega"],
      r.tasks.map((t) => [t.title, t.unidad, t.responsable, t.estadoVisible, t.prioridad, t.avance, t.fecha_asignacion, t.fecha_limite ?? "", t.project?.name ?? "", t.resultado_revision ?? "", t.entrega_url ?? ""]),
    );
  } else if (tipo === "horas") {
    csv = toCsv(["Fecha", "Integrante", "Horas", "Actividad"], r.hours.map((h) => [h.fecha, h.nombre, h.horas, h.actividad]));
  } else {
    csv = toCsv(
      ["Integrante", "Correo", "Subárea", "Rol", "Especialidad", "Ciclo", "Asistencias", "Convocatorias", "% asistencia", "Horas asistencia (verificadas)", "Horas registradas", "Tareas", "Completadas", "Abiertas", "Atrasadas", "Avance medio %"],
      r.rows.map((x) => [x.member.full_name, x.member.email, x.unidad, x.member.rol, x.member.especialidad, x.member.ciclo, x.asistidas, x.convocadas, x.pctAsistencia ?? "", n(x.horasAsistencia), n(x.horasRegistradas), x.tareas, x.completadas, x.abiertas, x.atrasadas, x.avanceMedio ?? ""]),
    );
  }
  const slug = r.scopeLabel.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").toLowerCase().slice(0, 40);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte-${tipo}-${slug}-${r.params.desde}_${r.params.hasta}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
