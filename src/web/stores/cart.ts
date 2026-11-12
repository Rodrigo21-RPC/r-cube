import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Carrito del visitante en el navegador: solo ids y cantidades, nunca precios (HU-12, RNF-07). */
export interface LocalItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: LocalItem[];
  set: (productId: string, quantity: number) => void;
  add: (productId: string, quantity: number, max: number) => void;
  remove: (productId: string) => void;
  replace: (items: LocalItem[]) => void;
  clear: () => void;
}

export const useLocalCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      set: (productId, quantity) =>
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        })),
      add: (productId, quantity, max) =>
        set((s) => {
          const found = s.items.find((i) => i.productId === productId);
          if (found) {
            return {
              items: s.items.map((i) =>
                i.productId === productId ? { ...i, quantity: Math.min(max, i.quantity + quantity) } : i,
              ),
            };
          }
          return { items: [...s.items, { productId, quantity: Math.min(max, quantity) }] };
        }),
      remove: (productId) => set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      replace: (items) => set({ items }),
      clear: () => set({ items: [] }),
    }),
    { name: "rcube-carrito", version: 1 },
  ),
);
