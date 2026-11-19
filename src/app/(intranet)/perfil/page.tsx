import { Save, User } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

const fields = [
  { name: "full_name", label: "Nombre completo", type: "text" },
  { name: "position", label: "Cargo", type: "text" },
  { name: "department", label: "Departamento", type: "text" },
  { name: "phone", label: "Teléfono", type: "tel" },
  { name: "birthday", label: "Fecha de cumpleaños", type: "date" },
  { name: "avatar_url", label: "URL de tu foto", type: "url" },
] as const;

export default async function PerfilPage() {
  const { user, profile } = (await getCurrentUser())!;

  return (
    <>
      <PageHeader icon={User} title="Mi perfil" subtitle={user.email} />
      <form action={updateProfile} className="max-w-lg space-y-4 rounded-xl border border-neutral-200 bg-white p-6">
        {fields.map((f) => (
          <label key={f.name} className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-700">{f.label}</span>
            <input
              name={f.name}
              type={f.type}
              defaultValue={profile?.[f.name] ?? ""}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>
        ))}
        <button className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          <Save className="h-4 w-4" /> Guardar
        </button>
      </form>
    </>
  );
}
