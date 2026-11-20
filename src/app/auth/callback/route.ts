import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Destino de los enlaces de los correos de Supabase (confirmar cuenta y recuperar contraseña). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createClient();
  let error: unknown = null;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as "email" | "recovery" | "signup" }));
  } else {
    error = new Error("Enlace incompleto");
  }

  if (error) {
    return NextResponse.redirect(new URL("/login?error=enlace", request.url));
  }
  return NextResponse.redirect(new URL(type === "recovery" ? "/nueva-contrasena" : safeNext, request.url));
}
