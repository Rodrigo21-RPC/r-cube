import { useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@web/api";

/** Lleva los errores por campo del servidor al formulario y guarda el mensaje general. */
export function useServerErrors<T extends FieldValues>(setError: UseFormSetError<T>) {
  const [message, setMessage] = useState<string | null>(null);
  function handle(e: unknown) {
    if (e instanceof ApiError) {
      const entries = Object.entries(e.fields);
      for (const [field, msg] of entries) setError(field as Path<T>, { type: "server", message: msg });
      setMessage(entries.length ? null : e.message);
    } else {
      setMessage("Ocurrió un error inesperado. Intenta de nuevo.");
    }
  }
  return { message, setMessage, handle };
}
