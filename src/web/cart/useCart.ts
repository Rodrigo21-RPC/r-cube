import { useLocalCart } from "@web/stores/cart";

/** Unidades del carrito para el contador del encabezado (HU-11). */
export function useCartCount(): number {
  return useLocalCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
}

/** Operaciones del carrito (HU-11). La sincronización con la cuenta llega en US2. */
export function useCart() {
  const items = useLocalCart((s) => s.items);
  const local = useLocalCart();
  return {
    busy: false,
    quantityOf: (productId: string) => items.find((i) => i.productId === productId)?.quantity ?? 0,
    add: async (productId: string, quantity: number, max: number) => local.add(productId, quantity, max),
  };
}
