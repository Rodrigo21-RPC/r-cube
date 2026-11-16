import type { RefObject } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { PhotoCarousel, type CarouselPhoto } from "./PhotoCarousel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  photos: CarouselPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Control al que vuelve el foco al cerrar (Radix solo lo hace solo cuando hay un `Dialog.Trigger`). */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

/**
 * Vista ampliada de las fotos a pantalla completa (HU-55, research R2). El `Dialog` de radix-ui aporta el foco atrapado,
 * Escape, el retorno del foco al control que la abrió, el bloqueo de la página de fondo y `aria-modal`. No tiene zoom
 * propio ni `touch-action: none`: el pellizco del navegador sigue funcionando.
 */
export function PhotoViewer({ open, onOpenChange, name, photos, index, onIndexChange, returnFocusTo }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/95" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col outline-none"
          onCloseAutoFocus={(e) => {
            if (!returnFocusTo?.current) return;
            e.preventDefault();
            returnFocusTo.current.focus();
          }}
        >
          <Dialog.Title className="sr-only">Fotos de {name}</Dialog.Title>
          <PhotoCarousel
            label="Fotos ampliadas"
            photos={photos}
            index={index}
            onIndexChange={onIndexChange}
            className="h-full gap-0"
            stageClassName="min-h-0 flex-1"
            photoClassName="p-2 md:p-10"
            overlay={
              <Dialog.Close
                aria-label="Cerrar"
                className="absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-black/60 text-white shadow-md backdrop-blur transition hover:bg-black/80"
              >
                <X aria-hidden className="size-6" />
              </Dialog.Close>
            }
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
