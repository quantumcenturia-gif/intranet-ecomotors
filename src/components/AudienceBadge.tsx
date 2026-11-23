import { Megaphone, Users } from "lucide-react";

/** Etiqueta de destinatarios de un comunicado. */
export default function AudienceBadge({ name }: { name?: string | null }) {
  return name ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
      <Users className="h-3 w-3" /> Para {name}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 font-medium text-white">
      <Megaphone className="h-3 w-3" /> Todo el equipo
    </span>
  );
}
