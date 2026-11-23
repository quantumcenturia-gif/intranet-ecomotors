import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Vuelve a la página desde la que se envió el formulario y muestra el mensaje arriba.
 * (En producción, Next.js oculta el texto de los errores lanzados en las acciones,
 * así que los mensajes para el usuario viajan en la dirección: ?error=…)
 */
export async function failBack(message: string): Promise<never> {
  const h = await headers();
  let path = "/";
  try {
    const ref = new URL(h.get("referer") ?? "");
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host || ref.host === host) path = ref.pathname + ref.search;
  } catch {
    // sin página de origen: se vuelve al inicio
  }
  const url = new URL(path, "http://x");
  url.searchParams.set("error", message.slice(0, 400));
  url.searchParams.delete("ok");
  redirect(url.pathname + url.search);
}
