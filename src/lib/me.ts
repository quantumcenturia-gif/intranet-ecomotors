import { cache } from "react";
import { getCurrentUser } from "@/lib/supabase/server";
import { subtree, type Unit } from "@/lib/units";

export type Member = {
  id: string;
  full_name: string;
  unit_id: string;
  rol: string;
  estado: string;
  condicion: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  avatar_url: string | null;
  bio: string | null;
  especialidad?: string | null;
  ciclo?: number | null;
  profile_id: string | null;
};

export const MANAGER_ROLES = ["Supervisor/a", "Encargado/a"];

/** Usuario actual con su ficha de miembro y permisos. Se calcula una vez por petición. */
export const getMe = cache(async () => {
  const current = await getCurrentUser();
  if (!current) return null;
  const { supabase, user, profile } = current;
  const [{ data: member }, { data: units }] = await Promise.all([
    supabase.from("members").select("*").eq("profile_id", user.id).maybeSingle<Member>(),
    supabase.from("units").select("*").order("sort").returns<Unit[]>(),
  ]);
  const isAdmin = profile?.role === "admin" || member?.rol === "Coordinador general";
  const isManager = isAdmin || (!!member && MANAGER_ROLES.includes(member.rol));
  const allUnits = units ?? [];
  const manageable = new Set(
    isAdmin ? allUnits.map((u) => u.id) : isManager && member ? subtree(allUnits, member.unit_id) : [],
  );
  return { supabase, user, profile, member, units: allUnits, isAdmin, isManager, manageable };
});

export async function requireMe() {
  const me = await getMe();
  if (!me) throw new Error("Sin sesión");
  return me;
}
