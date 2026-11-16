import { useEffect, useRef } from "react";
import { cn } from "@web/lib/cn";
import { GENERIC_PHOTO, PhotoCarousel, type CarouselPhoto } from "./PhotoCarousel";

interface Props {
  name: string;
  photos: CarouselPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
}

const STAGE = "aspect-square rounded-[18px] bg-surface";

/**
 * Galería del detalle de producto (HU-54): foto grande con flechas, contador y miniaturas. Con una sola foto muestra
 * solo la foto y sin ninguna, la imagen genérica (FR-005).
 */
export function ProductGallery({ name, photos, index, onIndexChange }: Props) {
  const strip = useRef<HTMLDivElement>(null);

  // La miniatura activa se mantiene a la vista dentro de su franja, sin mover la página.
  useEffect(() => {
    const el = strip.current;
    const active = el?.children[index] as HTMLElement | undefined;
    if (!el || !active) return;
    el.scrollTo({ left: active.offsetLeft - (el.clientWidth - active.clientWidth) / 2, behavior: "auto" });
  }, [index]);

  if (photos.length < 2) {
    const photo = photos[0] ?? { url: GENERIC_PHOTO, alt: name };
    return (
      <div className={cn(STAGE, "flex items-center justify-center overflow-hidden p-4")}>
        <img
          src={photo.url}
          alt={photo.alt}
          width={600}
          height={600}
          fetchPriority="high"
          className="h-full w-full object-contain"
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(GENERIC_PHOTO)) e.currentTarget.src = GENERIC_PHOTO;
          }}
        />
      </div>
    );
  }

  return (
    <PhotoCarousel photos={photos} index={index} onIndexChange={onIndexChange} stageClassName={STAGE} photoClassName="p-4">
      <div ref={strip} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {photos.map((p, i) => (
          <button
            key={`${p.url}-${i}`}
            type="button"
            aria-label={`Ver foto ${i + 1} de ${photos.length}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => onIndexChange(i)}
            className={cn("size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-surface", i === index ? "border-accent" : "border-transparent hover:border-border")}
          >
            <img src={p.url} alt="" width={64} height={64} loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain" />
          </button>
        ))}
      </div>
    </PhotoCarousel>
  );
}
