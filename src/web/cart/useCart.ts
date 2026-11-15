import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CartQuote } from "@shared/types";
import { apiFetch, queryClient } from "@web/api";
import { useSession } from "@web/auth";
import { lineKey, useLocalCart } from "@web/stores/cart";

const ACCOUNT_KEY = ["cart", "account"] as const;

/** Fusiona el carrito del navegador con el de la cuenta tras iniciar sesión o registrarse (HU-12). */
export async function mergeCartAfterSignIn() {
  const items = useLocalCart.getState().items;
  if (items.length) {
    const quote = await apiFetch<CartQuote>("/cart/merge", {
      method: "POST",
      json: { items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId: variantId ?? undefined, quantity })) },
    });
    queryClient.setQueryData(ACCOUNT_KEY, quote);
  }
  useLocalCart.getState().clear();
  await queryClient.invalidateQueries({ queryKey: ["cart"] });
}

/** Al cerrar sesión el carrito queda vacío en este navegador; sigue guardado en la cuenta (HU-12). */
export function clearLocalCartAfterSignOut() {
  useLocalCart.getState().clear();
  queryClient.removeQueries({ queryKey: ["cart"] });
}

const variantQuery = (variantId?: string | null) => (variantId ? `?variantId=${encodeURIComponent(variantId)}` : "");

/** Carrito unificado: navegador para visitantes y cuenta para clientes (HU-11 a HU-13, HU-44). */
export function useCart() {
  const session = useSession();
  const signedIn = Boolean(session.data);
  const local = useLocalCart();
  const [busy, setBusy] = useState(false);

  const localKey = local.items.map((i) => `${lineKey(i.productId, i.variantId)}:${i.quantity}`).join(",");
  const quote = useQuery({
    queryKey: signedIn ? ACCOUNT_KEY : ["cart", "local", localKey],
    queryFn: () =>
      signedIn
        ? apiFetch<CartQuote>("/cart")
        : apiFetch<CartQuote>("/cart/quote", { method: "POST", json: { items: local.items.map((i) => ({ ...i, variantId: i.variantId ?? undefined })) } }),
    enabled: !session.isPending,
  });

  // Visitante: ajusta cantidades al stock y recuerda el precio ya mostrado (HU-13).
  useEffect(() => {
    if (signedIn || !quote.data) return;
    const next = local.items.map((i) => {
      const line = quote.data.lines.find((l) => l.productId === i.productId && (l.variantId ?? null) === (i.variantId ?? null));
      return line?.available ? { ...i, quantity: line.quantity, seenPriceCents: line.unitPriceCents } : i;
    });
    if (JSON.stringify(next) !== JSON.stringify(local.items)) local.replace(next);
  }, [quote.data, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn: () => Promise<CartQuote | void>) {
    setBusy(true);
    try {
      const data = await fn();
      if (data) queryClient.setQueryData(ACCOUNT_KEY, data);
    } finally {
      setBusy(false);
    }
  }

  const lines = quote.data?.lines ?? [];
  return {
    quote,
    busy,
    signedIn,
    count: signedIn
      ? lines.filter((l) => l.available).reduce((s, l) => s + l.quantity, 0)
      : local.items.reduce((s, i) => s + i.quantity, 0),
    quantityOf: (productId: string, variantId?: string | null) =>
      signedIn
        ? (lines.find((l) => l.productId === productId && (l.variantId ?? null) === (variantId ?? null))?.quantity ?? 0)
        : (local.items.find((i) => i.productId === productId && (i.variantId ?? null) === (variantId ?? null))?.quantity ?? 0),
    add: (productId: string, variantId: string | null | undefined, quantity: number, max: number) =>
      signedIn
        ? run(() =>
            apiFetch<CartQuote>("/cart/merge", { method: "POST", json: { items: [{ productId, variantId: variantId ?? undefined, quantity }] } }),
          )
        : Promise.resolve(local.add(productId, variantId, quantity, max)),
    setQuantity: (productId: string, variantId: string | null | undefined, quantity: number) =>
      signedIn
        ? run(() => apiFetch<CartQuote>(`/cart/items/${productId}`, { method: "PUT", json: { quantity, variantId: variantId ?? undefined } }))
        : Promise.resolve(local.set(productId, variantId, quantity)),
    remove: (productId: string, variantId?: string | null) =>
      signedIn
        ? run(() => apiFetch<CartQuote>(`/cart/items/${productId}${variantQuery(variantId)}`, { method: "DELETE" }))
        : Promise.resolve(local.remove(productId, variantId)),
  };
}

/** Unidades del carrito para el contador del encabezado (HU-11). */
export function useCartCount(): number {
  return useCart().count;
}
