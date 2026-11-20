import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Marca el aviso como leído y lleva a su destino. */
export async function GET(request: NextRequest, { params }: RouteContext<"/aviso/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", Number(id))
    .select("link")
    .maybeSingle();
  const link = data?.link?.startsWith("/") ? data.link : "/avisos";
  return NextResponse.redirect(new URL(link, request.url));
}
