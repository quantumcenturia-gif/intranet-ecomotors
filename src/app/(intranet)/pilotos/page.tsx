import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Flag, Timer, Trash2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import LineChart from "@/components/charts/LineChart";
import RunForm from "@/components/pilots/RunForm";
import TrendBadge from "@/components/pilots/TrendBadge";
import { card } from "@/components/ui";
import { requireMe } from "@/lib/me";
import { RUN_SELECT, SERIES_COLORS, bestByDay, dayShort, fmtLap, runStats, type PilotRun } from "@/lib/pilots";
import { deleteRun } from "./actions";

export default async function PilotosPage({ searchParams }: PageProps<"/pilotos">) {
  const sp = await searchParams;
  const { supabase, member, manageable } = await requireMe();
  const canManage = manageable.has("pilotos");
  if (!canManage) {
    if (member?.unit_id === "pilotos") redirect(`/pilotos/${member.id}`);
    return (
      <>
        <PageHeader icon={Timer} title="Pilotos" />
        <p className="text-sm text-neutral-500">Esta sección es del área de Pilotos.</p>
      </>
    );
  }

  const [{ data: pilots }, { data: runsData }, { data: projects }] = await Promise.all([
    supabase.from("members").select("id,full_name,avatar_url").eq("unit_id", "pilotos").eq("es_prueba", false).neq("estado", "Miembro retirado").order("full_name"),
    supabase.from("pilot_runs").select(RUN_SELECT).order("fecha").order("intento").returns<PilotRun[]>(),
    supabase.from("projects").select("id,name").order("sort"),
  ]);
  const runs = runsData ?? [];
  const people = pilots ?? [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const nameOf = new Map(people.map((p) => [p.id, p.full_name]));
  const short = (full: string) => full.split(" ").slice(0, 2).join(" ");
  const projectName = new Map((projects ?? []).map((p) => [p.id, p.name]));

  // Gráfico general: mejor vuelta de cada piloto por día de prueba (el color sigue a la persona)
  const days = [...new Set(runs.map((r) => r.fecha))].sort();
  const series = people
    .map((p, i) => ({ p, color: SERIES_COLORS[i % SERIES_COLORS.length], best: bestByDay(runs.filter((r) => r.piloto_id === p.id)) }))
    .filter((s) => s.best.length)
    .map((s) => ({ name: short(s.p.full_name), color: s.color, values: Object.fromEntries(s.best.map((b) => [b.fecha, b.best])) }));

  const lastBy = Object.fromEntries(
    people.map((p) => {
      const last = runs.filter((r) => r.piloto_id === p.id).at(-1);
      return [p.id, { peso_kg: last?.peso_kg ?? null, traje: last?.traje ?? null, project_id: last?.project_id ?? null, pista: last?.pista ?? null }];
    }),
  );
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];

  return (
    <>
      <PageHeader icon={Timer} title="Pilotos" subtitle="Tiempos de vuelta, intentos, peso y traje · curvas de avance de cada piloto" />
      {sp.ok && <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">✅ Intento guardado. Puedes registrar el siguiente.</p>}

      <section className={`${card} mb-6 p-5`}>
        <h2 className="mb-4 flex items-center gap-2 font-semibold"><Flag className="h-5 w-5 origin-bottom-left text-brand-600 animate-wiggle-slow" /> Registrar intento</h2>
        {people.length ? (
          <RunForm
            pilots={people.map((p) => ({ id: p.id, name: p.full_name }))}
            projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))}
            used={runs.map((r) => ({ piloto_id: r.piloto_id, fecha: r.fecha, intento: r.intento }))}
            trajes={uniq(runs.map((r) => r.traje))}
            pistas={uniq(runs.map((r) => r.pista))}
            defaultPilot={typeof sp.piloto === "string" ? sp.piloto : undefined}
            defaultDate={typeof sp.fecha === "string" ? sp.fecha : today}
            lastBy={lastBy}
          />
        ) : (
          <p className="text-sm text-neutral-500">No hay integrantes en el área de Pilotos. Asígnalos desde Administración.</p>
        )}
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {people.map((p, i) => {
          const mine = runs.filter((r) => r.piloto_id === p.id);
          const byDay = bestByDay(mine);
          const record = byDay.length ? Math.min(...byDay.map((d) => d.best)) : null;
          const last = mine.at(-1);
          return (
            <Link key={p.id} href={`/pilotos/${p.id}`} className={`${card} group block p-4 transition hover:-translate-y-0.5 hover:shadow-md`}>
              <div className="mb-3 flex items-center gap-3">
                <span className="relative">
                  <Avatar name={p.full_name} src={p.avatar_url} size={44} />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{short(p.full_name)}</p>
                  <p className="text-xs text-neutral-500">{mine.length} intento{mine.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <p className="text-xs text-neutral-500">Récord personal</p>
              <p className="text-2xl font-bold">{fmtLap(record)}</p>
              <div className="mt-1 min-h-6"><TrendBadge days={byDay} /></div>
              <p className="mt-2 truncate text-xs text-neutral-500">
                {last ? `${last.peso_kg ? `${Number(last.peso_kg)} kg · ` : ""}${last.traje ?? "Sin traje registrado"}` : "Sin pruebas aún"}
              </p>
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600">Ver su avance <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" /></p>
            </Link>
          );
        })}
      </div>

      <section className={`${card} mb-6 p-5`}>
        <h2 className="mb-1 font-semibold">Mejor vuelta por día de prueba</h2>
        <p className="mb-3 text-xs text-neutral-500">Más abajo = más rápido. Pasa el mouse por el gráfico para ver los tiempos.</p>
        <LineChart
          caption="Mejor vuelta de cada piloto por día de prueba"
          x={days.map((d) => ({ key: d, label: dayShort(d) }))}
          series={series}
          format="lap"
        />
      </section>

      <section className={`${card} p-5`}>
        <h2 className="mb-3 font-semibold">Últimos intentos</h2>
        {runs.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-400">
                <tr><th className="py-2">Fecha</th><th>Piloto</th><th>Prototipo</th><th>Intento</th><th>Vueltas</th><th>Mejor</th><th>Promedio</th><th>Peso</th><th>Traje</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {[...runs].reverse().slice(0, 20).map((r) => {
                  const st = runStats(r);
                  return (
                    <tr key={r.id}>
                      <td className="py-2 whitespace-nowrap">{dayShort(r.fecha)}</td>
                      <td><Link href={`/pilotos/${r.piloto_id}`} className="hover:text-brand-600">{short(nameOf.get(r.piloto_id) ?? "—")}</Link></td>
                      <td>{r.project_id ? projectName.get(r.project_id) : "—"}</td>
                      <td>#{r.intento}</td>
                      <td>{st.count}</td>
                      <td className="font-semibold">{fmtLap(st.best)}</td>
                      <td>{fmtLap(st.avg)}</td>
                      <td>{r.peso_kg ? `${Number(r.peso_kg)} kg` : "—"}</td>
                      <td className="max-w-40 truncate">{r.traje ?? "—"}</td>
                      <td className="text-right">
                        <form action={deleteRun}><input type="hidden" name="id" value={r.id} /><button aria-label="Borrar intento" className="text-neutral-300 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Aún no hay intentos registrados. Usa el formulario de arriba en cada prueba.</p>
        )}
      </section>
    </>
  );
}
