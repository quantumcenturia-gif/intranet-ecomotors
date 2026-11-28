import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Gauge, Scale, Shirt, Timer, Trash2, Trophy } from "lucide-react";
import Avatar from "@/components/Avatar";
import LineChart from "@/components/charts/LineChart";
import TrendBadge from "@/components/pilots/TrendBadge";
import { card } from "@/components/ui";
import { requireMe, type Member } from "@/lib/me";
import { RUN_SELECT, SERIES_COLORS, bestByDay, dayShort, fmtLap, runStats, type PilotRun } from "@/lib/pilots";
import { deleteRun } from "../actions";
import SubmitButton from "@/components/SubmitButton";

export default async function PilotoPage({ params }: PageProps<"/pilotos/[id]">) {
  const { id } = await params;
  const { supabase, member, manageable } = await requireMe();
  const canManage = manageable.has("pilotos");
  if (!canManage && member?.id !== id) notFound();

  const [{ data: p }, { data: runsData }, { data: projects }] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).maybeSingle<Member>(),
    supabase.from("pilot_runs").select(RUN_SELECT).eq("piloto_id", id).order("fecha").order("intento").returns<PilotRun[]>(),
    supabase.from("projects").select("id,name"),
  ]);
  if (!p) notFound();
  const runs = runsData ?? [];
  const projectName = new Map((projects ?? []).map((x) => [x.id, x.name]));
  const days = bestByDay(runs);
  const record = days.length ? Math.min(...days.map((d) => d.best)) : null;
  const recordRun = runs.find((r) => runStats(r).best === record);
  const first = days[0]?.best, lastDay = days.at(-1)?.best;
  const mejora = first && lastDay && days.length > 1 ? ((first - lastDay) / first) * 100 : null;
  const last = runs.at(-1);
  const lastStats = last ? runStats(last) : null;
  const isSelf = member?.id === id;
  const runKey = (r: PilotRun) => String(r.id);
  const runLabel = (r: PilotRun) => `${dayShort(r.fecha)} · #${r.intento}`;
  const withWeight = runs.filter((r) => r.peso_kg);

  return (
    <>
      {canManage && (
        <Link href="/pilotos" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4" /> Todos los pilotos
        </Link>
      )}

      <section className={`${card} mb-6 overflow-hidden`}>
        <div className="checkered animate-flag h-3 opacity-90" />
        <div className="flex flex-col items-center gap-4 bg-black p-6 text-white sm:flex-row">
          <div className="animate-pop-in rounded-full ring-4 ring-brand-600">
            <Avatar name={p.full_name} src={p.avatar_url} size={88} />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs uppercase tracking-widest text-brand-400">{isSelf ? "Mi avance como piloto" : "Piloto"}</p>
            <h1 className="text-2xl font-bold">{p.full_name}</h1>
            <p className="text-sm text-neutral-400">{runs.length} intento{runs.length === 1 ? "" : "s"} en {days.length} día{days.length === 1 ? "" : "s"} de prueba</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="flex items-center justify-center gap-1 text-xs uppercase tracking-wide text-neutral-400 sm:justify-end"><Trophy className="h-4 w-4 text-amber-400 animate-float" /> Récord personal</p>
            <p className="text-4xl font-bold">{fmtLap(record)}</p>
            {recordRun && <p className="text-xs text-neutral-400">{dayShort(recordRun.fecha)} · intento #{recordRun.intento}</p>}
          </div>
        </div>
      </section>

      {runs.length ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Tile icon={Timer} label="Último intento · mejor vuelta" value={fmtLap(lastStats?.best)} sub={last ? `${dayShort(last.fecha)} · #${last.intento} · ${lastStats?.count} vueltas` : ""} />
            <Tile icon={Gauge} label="Mejora desde la 1.ª prueba" value={mejora === null ? "—" : `${mejora >= 0 ? "−" : "+"}${Math.abs(mejora).toFixed(1)} %`} sub={mejora === null ? "Necesita 2 días de prueba" : mejora >= 0 ? "menos tiempo por vuelta" : "más tiempo por vuelta"} extra={<TrendBadge days={days} />} />
            <Tile icon={Scale} label="Peso actual" value={withWeight.length ? `${Number(withWeight.at(-1)!.peso_kg)} kg` : "—"} sub={withWeight.length > 1 ? `Primera medida: ${Number(withWeight[0].peso_kg)} kg` : ""} />
            <Tile icon={Shirt} label="Traje usado" value={last?.traje ?? "—"} sub={last?.pista ? `Pista: ${last.pista}` : ""} small />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <section className={`${card} p-5 lg:col-span-2`}>
              <h2 className="mb-1 font-semibold">Curva de avance por intento</h2>
              <p className="mb-3 text-xs text-neutral-500">Mejor vuelta y promedio de cada intento. Más abajo = más rápido.</p>
              <LineChart
                caption={`Mejor vuelta y promedio por intento de ${p.full_name}`}
                x={runs.map((r) => ({ key: runKey(r), label: runLabel(r) }))}
                series={[
                  { name: "Mejor vuelta", color: SERIES_COLORS[0], values: Object.fromEntries(runs.map((r) => [runKey(r), runStats(r).best])) },
                  { name: "Promedio", color: SERIES_COLORS[1], values: Object.fromEntries(runs.map((r) => [runKey(r), runStats(r).avg])) },
                ]}
                format="lap"
              />
            </section>
            {last && (
              <section className={`${card} p-5`}>
                <h2 className="mb-1 font-semibold">Vueltas del último intento</h2>
                <p className="mb-3 text-xs text-neutral-500">{dayShort(last.fecha)} · intento #{last.intento}{last.project_id ? ` · ${projectName.get(last.project_id)}` : ""}</p>
                <LineChart
                  caption="Tiempo de cada vuelta del último intento"
                  x={last.vueltas.map((_, i) => ({ key: String(i), label: `V${i + 1}` }))}
                  series={[{ name: "Tiempo de vuelta", color: SERIES_COLORS[0], values: Object.fromEntries(last.vueltas.map((v, i) => [String(i), Number(v)])) }]}
                  format="lap"
                  height={200}
                />
              </section>
            )}
            <section className={`${card} p-5`}>
              <h2 className="mb-1 font-semibold">Peso del piloto</h2>
              <p className="mb-3 text-xs text-neutral-500">Registrado en cada intento.</p>
              <LineChart
                caption="Peso del piloto en cada intento"
                x={withWeight.map((r) => ({ key: runKey(r), label: runLabel(r) }))}
                series={[{ name: "Peso", color: SERIES_COLORS[0], values: Object.fromEntries(withWeight.map((r) => [runKey(r), Number(r.peso_kg)])) }]}
                format="kg"
                height={200}
              />
            </section>
          </div>

          <section className={`${card} p-5`}>
            <h2 className="mb-3 font-semibold">Todos los intentos</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                <thead className="text-left text-xs uppercase tracking-wide text-neutral-400">
                  <tr><th className="py-2">Fecha</th><th>Intento</th><th>Prototipo</th><th>Vueltas</th><th>Mejor</th><th>Promedio</th><th>Total</th><th>Peso</th><th>Traje</th>{canManage && <th />}</tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {[...runs].reverse().map((r) => {
                    const st = runStats(r);
                    return (
                      <tr key={r.id} className="align-top [&>td]:py-2">
                        <td className="py-2 whitespace-nowrap">{dayShort(r.fecha)}</td>
                        <td>#{r.intento}</td>
                        <td>{r.project_id ? projectName.get(r.project_id) : "—"}</td>
                        <td className="max-w-64">
                          <span className="font-mono text-xs text-neutral-600">{r.vueltas.map((v) => fmtLap(Number(v))).join(" · ")}</span>
                          {r.notas && <span className="block text-xs text-neutral-400">{r.notas}</span>}
                        </td>
                        <td className="font-semibold">{fmtLap(st.best)}</td>
                        <td>{fmtLap(st.avg)}</td>
                        <td>{fmtLap(st.total)}</td>
                        <td>{r.peso_kg ? `${Number(r.peso_kg)} kg` : "—"}</td>
                        <td className="max-w-40 truncate">{r.traje ?? "—"}</td>
                        {canManage && (
                          <td className="text-right">
                            <form action={deleteRun}><input type="hidden" name="id" value={r.id} /><SubmitButton aria-label="Borrar intento" className="text-neutral-300 hover:text-red-600"><Trash2 className="h-4 w-4" /></SubmitButton></form>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className={`${card} p-6 text-sm text-neutral-500`}>
          Todavía no hay intentos registrados{isSelf ? " para ti" : ""}. {canManage ? "Regístralos desde la página de Pilotos." : "Aparecerán aquí después de cada prueba."}
        </p>
      )}
    </>
  );
}

function Tile({ icon: Icon, label, value, sub, extra, small }: { icon: typeof Timer; label: string; value: string; sub?: string; extra?: React.ReactNode; small?: boolean }) {
  return (
    <div className={`${card} group p-4`}>
      <p className="mb-1 flex items-center gap-1.5 text-xs text-neutral-500"><Icon className="h-4 w-4 text-brand-600 group-hover:animate-wiggle" /> {label}</p>
      <p className={`${small ? "text-base" : "text-2xl"} truncate font-bold`}>{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
      {extra && <div className="mt-1">{extra}</div>}
    </div>
  );
}
