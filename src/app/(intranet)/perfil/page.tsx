import { Save, User } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getCurrentUser } from "@/lib/supabase/server";
import { updateProfile } from "./actions";

const fields = [
  { name: "full_name", label: "Nombre completo" },
  { name: "position", label: "Cargo" },
  { name: "department", label: "Departamento" },
  { name: "phone", label: "Teléfono" },
] as const;

export default async function PerfilPage() {
  const { user, profile } = (await getCurrentUser())!;

  return (
    <>
      <PageHeader icon={User} title="Mi perfil" subtitle={user.email} />
      <form action={updateProfile} className="max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {fields.map((f) => (
          <label key={f.name} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{f.label}</span>
            <input
              name={f.name}
              defaultValue={profile?.[f.name] ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </label>
        ))}
        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Save className="h-4 w-4" /> Guardar
        </button>
      </form>
    </>
  );
}
