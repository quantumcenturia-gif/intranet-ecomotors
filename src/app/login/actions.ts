"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | undefined;

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: "Email o contraseña incorrectos." };
  redirect("/");
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
    options: {
      data: { full_name: String(formData.get("full_name") ?? "") },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Revisa tu correo para confirmar la cuenta." };
  redirect("/");
}

/** Dirección pública de la web (Vercel o local), para los enlaces de los correos. */
export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Escribe tu correo." };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/nueva-contrasena`,
  });
  if (error && !/rate|seconds/i.test(error.message)) return { error: error.message };
  if (error) return { error: "Has pedido demasiados correos. Espera un minuto e inténtalo de nuevo." };
  // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
  return { message: "Si ese correo tiene cuenta, te hemos enviado un enlace para crear una contraseña nueva." };
}

export async function setNewPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "Las contraseñas no coinciden." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message.includes("different") ? "La nueva contraseña debe ser distinta de la anterior." : error.message };
  redirect("/?pw=ok");
}
