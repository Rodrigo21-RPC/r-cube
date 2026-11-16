import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@web/lib/cn";

export const GENERIC_PHOTO = "/img/generico.svg";

export interface CarouselPhoto {
  url: string;
  alt: string;
}

interface Props {
  photos: CarouselPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Nombre accesible de la región (por defecto «Galería de fotos»). */
  label?: string;
  /** Clases del contenedor del escenario (proporción, fondo y bordes). */
  stageClassName?: string;
  /** Clases de cada foto (ajuste y márgenes). */
  photoClassName?: string;
  /** Se llama al tocar una foto (abrir la vista ampliada). */
  onActivate?: () => void;
  /** Controles superpuestos al escenario (por ejemplo «Ampliar foto» o «Cerrar»). */
  overlay?: ReactNode;
  /** Contenido de la región debajo del escenario (por ejemplo, las miniaturas). */
  children?: ReactNode;
  className?: string;
}

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Carrusel de fotos con `scroll-snap` de CSS (HU-54, research R1 y R3): el deslizar con el dedo lo hace el navegador;
 * los botones, el teclado y las miniaturas cambian de foto con `scrollTo`. Es circular, anuncia «Foto N de M» y
 * no bloquea el desplazamiento vertical ni el pellizco (sin `touch-action: none`).
 */
export function PhotoCarousel({ photos, index, onIndexChange, label = "Galería de fotos", stageClassName, photoClassName, onActivate, overlay, children, className }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const lock = useRef<number | null>(null);
  const count = photos.length;

  const page = () => {
    const el = track.current;
    return el && el.clientWidth > 0 ? Math.round(el.scrollLeft / el.clientWidth) : 0;
  };

  // El índice llega del padre (botones, miniaturas, variante): se desplaza la pista hasta esa foto.
  useEffect(() => {
    const el = track.current;
    if (!el || page() === index) return;
    if (lock.current) window.clearTimeout(lock.current);
    // Mientras dura el desplazamiento programado se ignoran los eventos de scroll intermedios.
    lock.current = window.setTimeout(() => {
      lock.current = null;
    }, prefersReducedMotion() ? 50 : 700);
    el.scrollTo({ left: index * el.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [index]);

  // Un giro de pantalla o un cambio de ancho vuelve a alinear la foto activa.
  useEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => el.scrollTo({ left: index * el.clientWidth, behavior: "auto" }));
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  useEffect(() => () => void (lock.current && window.clearTimeout(lock.current)), []);

  function onScroll() {
    if (lock.current) return;
    const current = page();
    if (current !== index && current >= 0 && current < count) onIndexChange(current);
  }

  const go = (to: number) => onIndexChange((to + count) % count);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (count < 2 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(index - 1);
    }
  }

  const arrow = "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white shadow-md backdrop-blur transition hover:bg-black/75 focus-visible:outline-offset-2";

  return (
    <div role="region" aria-roledescription="carrusel" aria-label={label} onKeyDown={onKeyDown} className={cn("flex flex-col gap-3", className)}>
      <div className={cn("relative overflow-hidden", stageClassName)}>
        <div
          ref={track}
          data-testid="carousel-track"
          // Región desplazable que se enfoca con el teclado (WCAG 2.1.1): las flechas del teclado cambian de foto.
          tabIndex={0}
          onScroll={onScroll}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-offset-[-3px] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((p, i) => (
            <div
              key={`${p.url}-${i}`}
              role="group"
              aria-roledescription="foto"
              aria-label={`Foto ${i + 1} de ${count}`}
              inert={i !== index}
              onClick={onActivate}
              className={cn("flex h-full w-full shrink-0 snap-center snap-always items-center justify-center", onActivate && "cursor-zoom-in")}
            >
              <img
                src={p.url}
                alt={p.alt}
                width={600}
                height={600}
                decoding="async"
                fetchPriority={i === 0 ? "high" : "auto"}
                loading={i === 0 ? "eager" : "lazy"}
                draggable={false}
                className={cn("h-full w-full object-contain", photoClassName)}
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith(GENERIC_PHOTO)) e.currentTarget.src = GENERIC_PHOTO;
                }}
              />
            </div>
          ))}
        </div>
        {count > 1 && (
          <>
            <button type="button" aria-label="Foto anterior" onClick={() => go(index - 1)} className={cn(arrow, "left-3")}>
              <ChevronLeft aria-hidden className="size-6" />
            </button>
            <button type="button" aria-label="Foto siguiente" onClick={() => go(index + 1)} className={cn(arrow, "right-3")}>
              <ChevronRight aria-hidden className="size-6" />
            </button>
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-sm font-medium text-white">
              {index + 1} de {count}
            </span>
          </>
        )}
        {overlay}
      </div>
      {count > 1 && (
        <p aria-live="polite" className="sr-only">
          Foto {index + 1} de {count}
        </p>
      )}
      {children}
    </div>
  );
}
