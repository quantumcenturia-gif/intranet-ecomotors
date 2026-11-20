import { Save, User } from "lucide-react";
import Avatar from "@/components/Avatar";
import PageHeader from "@/components/PageHeader";
import { Badge, Label, btnPrimary, card, inputCls } from "@/components/ui";
import { ROLE_STYLES } from "@/data/eco-motors";
import { requireMe } from "@/lib/me";
import { unitPath } from "@/lib/units";
import { updateProfile } from "./actions";

export default async function PerfilPage() {
  const { user, profile, member, units } = await requireMe();
  const name = member?.full_name ?? profile?.full_name ?? "";

  return (
    <>
      <PageHeader icon={User} title="Mi perfil" subtitle={user.email} />
      {member ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge className={ROLE_STYLES[member.rol]}>{member.rol}</Badge>
          <span className="text-neutral-500">{unitPath(units, member.unit_id).map((u) => u.name).join(" › ")}</span>
        </div>
      ) : (
        <p className="mb-4 max-w-lg rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Tu cuenta aún no está vinculada a tu ficha de integrante. Pide a coordinación que añada tu correo (<b>{user.email}</b>) a tu ficha en Administración.
        </p>
      )}

      <form action={updateProfile} className={`${card} max-w-lg space-y-4 p-6`}>
        <div className="flex items-center gap-4">
          <Avatar name={name} src={member?.avatar_url} size={80} />
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
            <Label label="Teléfono"><input name="phone" type="tel" defaultValue={member.phone ?? ""} className={inputCls} /></Label>
            <Label label="Cumpleaños"><input name="birthday" type="date" defaultValue={member.birthday ?? ""} className={inputCls} /></Label>
            <Label label="Sobre mí"><textarea name="bio" rows={3} defaultValue={member.bio ?? ""} className={inputCls} placeholder="Qué haces en el equipo, habilidades…" /></Label>
          </>
        )}
        <button className={btnPrimary}><Save className="h-4 w-4" /> Guardar</button>
      </form>
    </>
  );
}
