import { TrendingDown, TrendingUp } from "lucide-react";
import { fmtLap } from "@/lib/pilots";

/** Compara la mejor vuelta del último día de prueba con la del día anterior. */
export default function TrendBadge({ days }: { days: { fecha: string; best: number }[] }) {
  if (days.length < 2) return null;
  const diff = days.at(-1)!.best - days.at(-2)!.best;
  if (Math.abs(diff) < 0.005) return <span className="text-xs text-neutral-500">Igual que la prueba anterior</span>;
  const faster = diff < 0;
  const Icon = faster ? TrendingDown : TrendingUp;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${faster ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
      <Icon className="h-3.5 w-3.5" />
      {fmtLap(Math.abs(diff)).replace(/^0:/, "")} {faster ? "más rápido" : "más lento"} que la prueba anterior
    </span>
  );
}
