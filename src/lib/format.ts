export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export const formatSize = (bytes: number | null) => {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
};
