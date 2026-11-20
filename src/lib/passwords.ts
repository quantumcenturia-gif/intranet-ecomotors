import { randomInt } from "node:crypto";

// Sin caracteres que se confunden (0/O, 1/l/I)
const ALPHA = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

/** Contraseña fácil de dictar, p. ej. «Eco-kTmP-4827». */
export function generatePassword() {
  const pick = (set: string, n: number) => Array.from({ length: n }, () => set[randomInt(set.length)]).join("");
  return `Eco-${pick(ALPHA, 4)}-${pick(DIGITS, 4)}`;
}
