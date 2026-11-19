import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/supabase/server";

export default function IntranetLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Loading />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  const { user, profile } = current;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar name={profile?.full_name || user.email || ""} role={profile?.role ?? "empleado"} />
      <main className="min-w-0 flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
