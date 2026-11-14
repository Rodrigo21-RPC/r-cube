import { useEffect } from "react";

/** Título de la pestaña por pantalla (RNF-03). */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | R Cube` : "R Cube";
  }, [title]);
}
