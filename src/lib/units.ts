export type Unit = {
  id: string;
  name: string;
  kind: "area" | "supervision" | "subarea";
  parent_id: string | null;
  sort: number;
  leader_id?: string | null;
  drive_url?: string | null;
};

/** Todas las unidades dentro de root (incluida). */
export function subtree(units: Unit[], root: string): string[] {
  const out = [root];
  for (let i = 0; i < out.length; i++) {
    for (const u of units) if (u.parent_id === out[i]) out.push(u.id);
  }
  return out;
}

/** Ruta desde el área raíz hasta la unidad: ["Ingeniería", "Mecánica", "Estructuras y Chasis"]. */
export function unitPath(units: Unit[], id: string | null | undefined): Unit[] {
  const byId = new Map(units.map((u) => [u.id, u]));
  const path: Unit[] = [];
  let cur = id ? byId.get(id) : undefined;
  while (cur) {
    path.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return path;
}

/** Unidades ordenadas como árbol, con su profundidad, para listas desplegables. */
export function flattenTree(units: Unit[], only?: Set<string>) {
  const out: { unit: Unit; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    units
      .filter((u) => u.parent_id === parent)
      .sort((a, b) => a.sort - b.sort)
      .forEach((u) => {
        if (!only || only.has(u.id)) out.push({ unit: u, depth });
        walk(u.id, depth + 1);
      });
  };
  walk(null, 0);
  return out;
}

/** Área de primer nivel de una unidad (para agrupar el directorio). */
export const rootOf = (units: Unit[], id: string) => unitPath(units, id)[0];
