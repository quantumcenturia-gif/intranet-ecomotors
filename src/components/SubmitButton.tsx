"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Botón de envío que muestra «Guardando…» y se bloquea mientras el formulario se procesa,
 * para que nadie lo pulse dos veces ni piense que no pasó nada.
 */
export default function SubmitButton({ children, disabled, pendingText, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  const iconOnly = !!rest["aria-label"] && typeof children !== "string";
  return (
    <button {...rest} disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending ? (
        iconOnly ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            {pendingText ?? "Guardando…"}
          </>
        )
      ) : (
        children
      )}
    </button>
  );
}
