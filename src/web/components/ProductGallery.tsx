import { useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@web/lib/cn";
import { GENERIC_PHOTO, PhotoCarousel, type CarouselPhoto } from "./PhotoCarousel";
import { PhotoViewer } from "./PhotoViewer";

interface Props {
  name: string;
  photos: CarouselPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
}

const STAGE = "aspect-square rounded-[18px] bg-surface";

/**
 * Galería del detalle de producto (HU-54, HU-55): foto grande con flechas, contador, miniaturas y vista ampliada. Sin
 * ninguna foto (o solo la imagen genérica) muestra solo esa imagen, sin controles (FR-005).
 */
export function ProductGallery({ name, photos, index, onIndexChange }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const [viewing, setViewing] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);

  // La miniatura activa se mantiene a la vista dentro de su franja, sin mover la página.
  useEffect(() => {
    const el = strip.current;
    const active = el?.children[index] as HTMLElement | undefined;
    if (!el || !active) return;
    el.scrollTo({ left: active.offsetLeft - (el.clientWidth - active.clientWidth) / 2, behavior: "auto" });
  }, [index]);

  const generic = photos.length === 0 || (photos.length === 1 && photos[0]!.url === GENERIC_PHOTO);
  if (generic) {
    const photo = photos[0] ?? { url: GENERIC_PHOTO, alt: name };
    return (
      <div className={cn(STAGE, "flex items-center justify-center overflow-hidden p-4")}>
        <img src={photo.url} alt={photo.alt} width={600} height={600} fetchPriority="high" className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <>
      <PhotoCarousel
        photos={photos}
        index={index}
        onIndexChange={onIndexChange}
        stageClassName={STAGE}
        photoClassName="p-4"
        onActivate={() => setViewing(true)}
        overlay={
          <button
            ref={opener}
            type="button"
            aria-label="Ampliar foto"
            onClick={() => setViewing(true)}
            className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/60 text-white shadow-md backdrop-blur transition hover:bg-black/75"
          >
            <Maximize2 aria-hidden className="size-5" />
          </button>
        }
      >
        {photos.length > 1 && (
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
        )}
      </PhotoCarousel>
      <PhotoViewer open={viewing} onOpenChange={setViewing} name={name} photos={photos} index={index} onIndexChange={onIndexChange} returnFocusTo={opener} />
    </>
  );
}
