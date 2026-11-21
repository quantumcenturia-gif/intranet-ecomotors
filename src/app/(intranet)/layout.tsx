import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getMe } from "@/lib/me";

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
  const { supabase, user, profile, member, isAdmin, isManager } = me;
  if (profile?.must_change_password) redirect("/nueva-contrasena?primera=1");
  const { count: unread } = member
    ? await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("member_id", member.id).is("read_at", null)
    : { count: 0 };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        name={member?.full_name || profile?.full_name || user.email || ""}
        role={member?.rol ?? (isAdmin ? "Coordinación" : "Sin ficha vinculada")}
        isAdmin={isAdmin}
        isManager={isManager}
        unread={unread ?? 0}
      />
      <main className="min-w-0 flex-1 p-4 md:p-8 print:p-0">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-neutral-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
