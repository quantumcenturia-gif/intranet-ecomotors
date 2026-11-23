import { GraduationCap, Pencil, Save } from "lucide-react";
import Avatar from "@/components/Avatar";
import MemberDashboard from "@/components/member/MemberDashboard";
import { Badge, Label, btnPrimary, card, inputCls } from "@/components/ui";
import { ROLE_STYLES } from "@/data/eco-motors";
import { requireMe } from "@/lib/me";
import { unitPath } from "@/lib/units";
import { updateProfile } from "./actions";

export default async function PerfilPage() {
  const { supabase, user, profile, member, units } = await requireMe();
  const name = member?.full_name ?? profile?.full_name ?? "";
  const firstName = member?.es_prueba ? member.rol : name.split(" ")[0];

  return (
    <>
      <section className={`${card} mb-6 overflow-hidden`}>
        <div className="racing-stripes h-24 bg-black" />
        <div className="flex flex-col items-center gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-12 shrink-0 animate-pop-in rounded-full ring-4 ring-white">
            <Avatar name={name} src={member?.avatar_url} size={104} />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs uppercase tracking-widest text-brand-600">Mi espacio</p>
            <h1 className="animate-rise text-2xl font-bold">¡Hola, {firstName}!</h1>
            {member ? (
              <>
                <p className="text-sm text-neutral-500">{unitPath(units, member.unit_id).map((u) => u.name).join(" › ")}</p>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Badge className={ROLE_STYLES[member.rol]}>{member.rol}</Badge>
                  {member.especialidad && (
                    <span className="flex items-center gap-1 text-xs text-neutral-600"><GraduationCap className="h-4 w-4" /> {member.especialidad}{member.ciclo ? ` · ${member.ciclo}.º ciclo` : ""}</span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-500">{user.email}</p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {member?.drive_url && (
              <a href={member.drive_url} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800">
                <span className="inline-block group-hover:animate-wiggle">📁</span> Mi carpeta de Drive
              </a>
            )}
            <a href="#editar" className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50">
              <Pencil className="h-4 w-4" /> Editar mis datos
            </a>
          </div>
        </div>
      </section>

      {member ? (
        <MemberDashboard supabase={supabase} m={member} units={units} isSelf />
      ) : (
        <p className="mb-4 max-w-lg rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Tu cuenta aún no está vinculada a tu ficha de integrante. Pide a coordinación que añada tu correo (<b>{user.email}</b>) a tu ficha en Administración.
        </p>
      )}

      <details id="editar" className={`${card} mt-6 max-w-2xl scroll-mt-6 p-5 open:pb-6`}>
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <Pencil className="h-4 w-4 text-brand-600" /> Editar mis datos
          <span className="text-xs font-normal text-neutral-500">(foto, teléfono, cumpleaños…)</span>
        </summary>
        <form action={updateProfile} className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={name} src={member?.avatar_url} size={72} />
            {member && (
              <Label label="Foto de perfil" className="flex-1">
                <input name="avatar" type="file" accept="image/*" className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2" />
              </Label>
            )}
          </div>
          <Label label="Nombre completo"><input name="full_name" defaultValue={name} className={inputCls} /></Label>
          {member && (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
                <Label label="Especialidad"><input name="especialidad" defaultValue={member.especialidad ?? ""} placeholder="Ing. Mecánica" className={inputCls} /></Label>
                <Label label="Ciclo"><input name="ciclo" type="number" min={1} max={12} defaultValue={member.ciclo ?? ""} className={inputCls} /></Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label label="Teléfono"><input name="phone" type="tel" defaultValue={member.phone ?? ""} className={inputCls} /></Label>
                <Label label="Cumpleaños"><input name="birthday" type="date" defaultValue={member.birthday ?? ""} className={inputCls} /></Label>
              </div>
              <Label label="Sobre mí"><textarea name="bio" rows={3} defaultValue={member.bio ?? ""} className={inputCls} placeholder="Qué haces en el equipo, habilidades…" /></Label>
            </>
          )}
          <button className={btnPrimary}><Save className="h-4 w-4" /> Guardar</button>
        </form>
      </details>
    </>
  );
}
