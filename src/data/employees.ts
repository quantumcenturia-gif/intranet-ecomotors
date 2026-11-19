import mock from "./mock-employees.json";

export type Employee = {
  id: string;
  full_name: string | null;
  email: string | null;
  position: string | null;
  department: string | null;
  phone: string | null;
  birthday: string | null;
  avatar_url: string | null;
  isMock?: boolean;
};

/**
 * Muestra empleados de ejemplo junto a los reales.
 * Ponlo en `false` cuando tu equipo ya esté dado de alta.
 */
export const SHOW_MOCK_EMPLOYEES = true;

export const mockEmployees: Employee[] = SHOW_MOCK_EMPLOYEES
  ? mock.map((e) => ({ ...e, isMock: true }))
  : [];

/** Días que faltan para el próximo cumpleaños (0 = hoy). */
export function daysUntilBirthday(birthday: string, today = new Date()) {
  const [, m, d] = birthday.split("-").map(Number);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), m - 1, d);
  if (next < base) next = new Date(today.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - base.getTime()) / 86_400_000);
}
