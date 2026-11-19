/* eslint-disable @next/next/no-img-element -- fotos de origen externo y variable */
export default function Avatar({ name, src, size = 48 }: { name: string | null; src?: string | null; size?: number }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const style = { width: size, height: size };
  return src ? (
    <img src={src} alt={name ?? ""} style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div style={style} className="flex shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
      {initials}
    </div>
  );
}
