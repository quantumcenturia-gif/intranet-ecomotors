export type Employee = {
  id: string;
  full_name: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  phone: string | null;
  birthday: string | null;
  avatar_url: string | null;
};

/** Días que faltan para el próximo cumpleaños (0 = hoy). */
export function daysUntilBirthday(birthday: string, today = new Date()) {
  const [, m, d] = birthday.split("-").map(Number);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < base) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - base.getTime()) / 86_400_000);
}

/** Normaliza un nombre para emparejar el perfil de Supabase con el integrante de Notion. */
export const normalizeName = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
