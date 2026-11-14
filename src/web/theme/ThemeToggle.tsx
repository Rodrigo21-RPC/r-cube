import { useState } from "react";
import { Moon, Sun } from "lucide-react";

const isDark = () => document.documentElement.classList.contains("dark");

/** Interruptor de dos estados; la elección se guarda en el navegador (HU-25). */
export function ThemeToggle() {
  const [dark, setDark] = useState(isDark);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("tema", next ? "oscuro" : "claro");
    } catch {
      // Sin almacenamiento disponible: el tema cambia solo en esta visita.
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Tema oscuro"
      title={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface"
    >
      {dark ? <Moon aria-hidden className="size-5" /> : <Sun aria-hidden className="size-5" />}
    </button>
  );
}
