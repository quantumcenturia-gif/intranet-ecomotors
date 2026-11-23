import { cache } from "react";
import { getCurrentUser } from "@/lib/supabase/server";
import { subtree, type Unit } from "@/lib/units";
import { failBack } from "@/lib/action-error";

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
  drive_url?: string | null;
  es_prueba?: boolean;
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
  // La ficha y los permisos los decide la base de datos: así la «vista previa» de dirección
  // muestra exactamente lo mismo que vería una persona de ese rol y área.
  const [mm, adm, real, { data: units }] = await Promise.all([
    supabase.rpc("my_member"),
    supabase.rpc("is_admin"),
    supabase.rpc("real_is_admin"),
    supabase.from("units").select("*").order("sort").returns<Unit[]>(),
  ]);
  let member = (mm.data && (mm.data as Member).id ? (mm.data as Member) : null) as Member | null;
  let isAdmin = adm.error ? false : Boolean(adm.data);
  let realAdmin = real.error ? false : Boolean(real.data);
  if (mm.error) {
    // Compatibilidad si aún no existen las funciones nuevas en la base de datos
    const { data } = await supabase.from("members").select("*").eq("profile_id", user.id).maybeSingle<Member>();
    member = data;
    isAdmin = profile?.role === "admin" || member?.rol === "Coordinador general";
    realAdmin = isAdmin;
  }
  const allUnits = units ?? [];
  const led = member ? allUnits.filter((u) => u.leader_id === member!.id).flatMap((u) => subtree(allUnits, u.id)) : [];
  const isManager = isAdmin || (!!member && MANAGER_ROLES.includes(member.rol)) || led.length > 0;
  const manageable = new Set(
    isAdmin
      ? allUnits.map((u) => u.id)
      : [...(member && MANAGER_ROLES.includes(member.rol) ? subtree(allUnits, member.unit_id) : []), ...led],
  );
  const preview = !!member?.es_prueba;
  return { supabase, user, profile, member, units: allUnits, isAdmin, isManager, manageable, realAdmin, preview };
});

export async function requireMe() {
  const me = await getMe();
  if (!me) throw new Error("Sin sesión");
  return me;
}

export const PREVIEW_READONLY = "Estás en la vista previa: aquí solo puedes mirar. Sal de la vista previa para hacer cambios.";

/** Como requireMe, pero para acciones que guardan cambios: en la vista previa no se permite nada. */
export async function requireWriter() {
  const me = await requireMe();
  if (me.preview) await failBack(PREVIEW_READONLY);
  return me;
}
