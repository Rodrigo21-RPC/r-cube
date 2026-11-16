import { sql } from "drizzle-orm";
import type { Tx } from "./stock";

/**
 * Bloquea la fila del producto hasta el fin de la transacción. Todo cambio de stock o de variantes de un
 * producto empieza aquí, para que las compras simultáneas de variantes del mismo producto se serialicen y el
 * resumen derivado (`syncProductFromVariants`) lea siempre lo ya confirmado (research R1).
 */
export async function lockProduct(tx: Tx, productId: string): Promise<void> {
  await tx.execute(sql`select id from product where id = ${productId} for update`);
}

/**
 * Recalcula el resumen del producto a partir de sus variantes (invariante 1 de data-model.md):
 * precio «desde» (menor de las activas, o de todas si ninguna está activa), precio máximo de las activas,
 * stock total de las activas y `has_variants`. Un producto que nunca tuvo variantes no se toca; uno que se
 * quedó sin ninguna vuelve a ser simple con stock 0 y su último precio.
 */
export async function syncProductFromVariants(tx: Tx, productId: string): Promise<void> {
  await tx.execute(sql`
    update product p set
      has_variants = v.n > 0,
      price_cents = case when v.n > 0 then coalesce(v.min_active, v.min_all) else p.price_cents end,
      max_price_cents = case when v.n > 0 then v.max_active else null end,
      stock = case when v.n > 0 then v.stock_active else 0 end
    from (
      select count(*)::int as n,
             min(price_cents) filter (where active) as min_active,
             min(price_cents) as min_all,
             max(price_cents) filter (where active) as max_active,
             coalesce(sum(stock) filter (where active), 0)::int as stock_active
      from product_variant where product_id = ${productId}
    ) v
    where p.id = ${productId} and (v.n > 0 or p.has_variants)`);
}
