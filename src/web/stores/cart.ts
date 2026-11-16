import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Carrito del visitante en el navegador (HU-12). Guarda ids, cantidades y el último precio mostrado
 * solo para avisar cambios (HU-13); el total siempre lo calcula el servidor (RNF-07).
 * Desde la versión 2 una línea puede ser de una variante (HU-44).
 */
export interface LocalItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  seenPriceCents?: number | null;
}

/** Clave de una línea: el producto o el producto con su variante. */
export const lineKey = (productId: string, variantId?: string | null) => (variantId ? `${productId}:${variantId}` : productId);
const same = (i: LocalItem, productId: string, variantId?: string | null) => i.productId === productId && (i.variantId ?? null) === (variantId ?? null);

interface CartState {
  items: LocalItem[];
  set: (productId: string, variantId: string | null | undefined, quantity: number) => void;
  add: (productId: string, variantId: string | null | undefined, quantity: number, max: number) => void;
  remove: (productId: string, variantId?: string | null) => void;
  replace: (items: LocalItem[]) => void;
  clear: () => void;
}

export const useLocalCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      set: (productId, variantId, quantity) =>
        set((s) => ({ items: s.items.map((i) => (same(i, productId, variantId) ? { ...i, quantity } : i)) })),
      add: (productId, variantId, quantity, max) =>
        set((s) => {
          if (s.items.some((i) => same(i, productId, variantId)))
            return { items: s.items.map((i) => (same(i, productId, variantId) ? { ...i, quantity: Math.min(max, i.quantity + quantity) } : i)) };
          return { items: [...s.items, { productId, variantId: variantId ?? null, quantity: Math.min(max, quantity) }] };
        }),
      remove: (productId, variantId) => set((s) => ({ items: s.items.filter((i) => !same(i, productId, variantId)) })),
      replace: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "rcube-carrito",
      version: 2,
      // v1 no tenía variantes: las líneas guardadas siguen valiendo con variantId ausente.
      migrate: (persisted) => persisted as CartState,
    },
  ),
);
