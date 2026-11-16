import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@web/components/ui/button";
import { useCart } from "./useCart";

/**
 * Selector de cantidad limitado al stock y botón «Agregar al carrito» (HU-11, RN-01).
 * Con variantes (HU-44) exige haber elegido una: `needsVariant` y `variantId`.
 */
export function AddToCart({
  productId,
  stock,
  name,
  variantId,
  needsVariant = false,
  onMissingVariant,
}: {
  productId: string;
  stock: number;
  name: string;
  variantId?: string | null;
  needsVariant?: boolean;
  onMissingVariant?: () => void;
}) {
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const inCart = cart.quantityOf(productId, variantId);
  const room = Math.max(0, stock - inCart);

  async function add() {
    if (needsVariant && !variantId) {
      onMissingVariant?.();
      return;
    }
    if (room === 0) {
      toast.error(`Ya tienes en tu carrito todas las unidades disponibles de ${name}.`);
      return;
    }
    const n = Math.min(qty, room);
    await cart.add(productId, variantId, n, stock);
    toast.success(n < qty ? `Agregamos ${n}: es todo el stock disponible.` : `${name} se agregó al carrito.`);
    setQty(1);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="cantidad" className="sr-only">Cantidad</label>
      <select id="cantidad" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="h-12 rounded-full border border-input bg-surface px-4 text-[15px]">
        {Array.from({ length: Math.min(Math.max(stock, 1), 10) }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <Button size="lg" onClick={add} disabled={cart.busy} className="flex-1 md:flex-none">
        <ShoppingCart aria-hidden className="size-5" /> Agregar al carrito
      </Button>
    </div>
  );
}
