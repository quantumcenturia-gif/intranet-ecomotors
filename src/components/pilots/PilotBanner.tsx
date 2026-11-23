import Link from "next/link";
import { ArrowRight, Timer, Trophy } from "lucide-react";
import TrendBadge from "@/components/pilots/TrendBadge";
import { bestByDay, fmtLap, runStats, type PilotRun } from "@/lib/pilots";

/** Acceso rápido a los tiempos de un piloto: récord, último intento y tendencia. */
export default function PilotBanner({ memberId, runs, isSelf }: { memberId: string; runs: PilotRun[]; isSelf: boolean }) {
  const days = bestByDay(runs);
  const record = days.length ? Math.min(...days.map((d) => d.best)) : null;
  const last = runs.at(-1);
  return (
    <Link href={`/pilotos/${memberId}`} className="group flex flex-wrap items-center gap-4 overflow-hidden rounded-xl bg-black p-5 text-white transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="checkered animate-flag h-12 w-3 shrink-0 rounded-sm" />
      <Timer className="h-8 w-8 shrink-0 text-brand-500 animate-float group-hover:animate-wiggle" />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-neutral-400">{isSelf ? "Mis tiempos de piloto" : "Tiempos de piloto"}</p>
        {runs.length ? (
          <>
            <p className="flex items-center gap-2 text-xl font-bold"><Trophy className="h-5 w-5 text-amber-400" /> Récord: {fmtLap(record)}</p>
            <p className="text-sm text-neutral-400">
              {runs.length} intento{runs.length === 1 ? "" : "s"} · último: {fmtLap(last ? runStats(last).best : null)}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold">Aún no hay intentos registrados</p>
            <p className="text-sm text-neutral-400">Tu récord y tus curvas de avance aparecerán aquí después de cada prueba.</p>
          </>
        )}
      </div>
      <div className="[&_span]:bg-white/10 [&_span]:text-white"><TrendBadge days={days} /></div>
      <span className="flex items-center gap-1 text-sm font-medium text-brand-400">
        {runs.length ? "Ver curvas de avance" : "Ver mi página de piloto"} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </span>
    </Link>
  );
}
