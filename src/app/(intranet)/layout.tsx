import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ActionError from "@/components/ActionError";
import { getMe } from "@/lib/me";
import { stopPreview } from "./vista-previa/actions";

export default function IntranetLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Loading />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) redirect("/login");
  const { supabase, user, profile, member, isAdmin, isManager, realAdmin, preview, units, manageable } = me;
  if (profile?.must_change_password && !preview) redirect("/nueva-contrasena?primera=1");
  const { count: unread } = member
    ? await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("member_id", member.id).is("read_at", null)
    : { count: 0 };

  return (
    <>
    {preview && (
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-3 bg-brand-600 px-4 py-2 text-sm text-white print:hidden">
        <span>👁 Vista previa: estás viendo la intranet como <b>{member?.rol}</b> de <b>{units.find((u) => u.id === member?.unit_id)?.name}</b></span>
        <form action={stopPreview}><button className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-brand-700">Salir de la vista previa</button></form>
        <a href="/vista-previa" className="text-xs underline">Cambiar</a>
      </div>
    )}
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        name={member?.full_name || profile?.full_name || user.email || ""}
        role={member?.rol ?? (isAdmin ? "Coordinación" : "Sin ficha vinculada")}
        isAdmin={isAdmin}
        isManager={isManager}
        realAdmin={realAdmin && !preview}
        unread={unread ?? 0}
        pilots={member?.unit_id === "pilotos" || manageable.has("pilotos")}
      />
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={null}><ActionError /></Suspense>
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      </main>
    </div>
    </>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-neutral-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
