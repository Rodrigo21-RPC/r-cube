import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { FavoriteItem } from "@shared/types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useSession } from "@web/auth";
import { useCart } from "@web/cart/useCart";
import { useTitle } from "@web/hooks/useTitle";
import { Availability } from "@web/components/Availability";
import { Price } from "@web/components/Price";
import { PriceRange } from "@web/components/PriceRange";
import { EmptyState, ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Badge, Card } from "@web/components/ui/misc";

function FavoriteCard({ item }: { item: FavoriteItem }) {
  const cart = useCart();
  const p = item.product;

  async function remove() {
    try {
      await apiFetch(`/favorites/${p.id}`, { method: "DELETE" });
      await queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(`${p.name} salió de tus favoritos.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo quitar el favorito.");
    }
  }

  async function addToCart() {
    await cart.add(p.id, null, 1, p.stock);
    toast.success(`${p.name} se agregó al carrito.`);
  }

  return (
    <Card className="flex gap-4">
      <img src={p.imageUrl} alt="" width={96} height={96} loading="lazy" className="size-24 shrink-0 rounded-xl bg-canvas object-contain" onError={(e) => { e.currentTarget.src = "/img/generico.svg"; }} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Link to={`/producto/${p.slug}`} className="font-semibold [overflow-wrap:anywhere] hover:underline">{p.name}</Link>
        {p.hasVariants && p.maxPriceCents ? <PriceRange minCents={p.priceCents} maxCents={p.maxPriceCents} /> : <Price cents={p.priceCents} compareAtCents={p.hasVariants ? null : p.compareAtCents} />}
        {item.available ? <Availability availability={p.availability} stock={p.stock} /> : <Badge tone="danger" className="w-fit">{p.availability === "out" ? "Agotado" : "No disponible"}</Badge>}
        <div className="mt-auto flex flex-wrap gap-2">
          {item.available &&
            (p.hasVariants ? (
              <Button asChild size="sm"><Link to={`/producto/${p.slug}`}>Elegir variante</Link></Button>
            ) : (
              <Button size="sm" onClick={addToCart} disabled={cart.busy}><ShoppingCart aria-hidden className="size-4" /> Agregar al carrito</Button>
            ))}
          <Button size="sm" variant="secondary" onClick={remove} aria-label={`Quitar ${p.name} de favoritos`}>Quitar</Button>
        </div>
      </div>
    </Card>
  );
}

/** Lista de favoritos del cliente: pasar al carrito, ir a elegir variante o quitar (HU-45). */
export default function Favorites() {
  useTitle("Mis favoritos");
  const { data: me, isPending } = useSession();
  const q = useQuery({
    queryKey: ["favorites", "list"],
    queryFn: () => apiFetch<{ items: FavoriteItem[] }>("/favorites"),
    enabled: me?.role === "cliente",
  });

  if (isPending) return <LoadingBlock label="Cargando tus favoritos…" />;
  if (!me)
    return (
      <EmptyState
        title="Inicia sesión para ver tus favoritos"
        description="Tu lista de favoritos queda guardada en tu cuenta."
        action={<Button asChild><Link to="/ingresar?volver=/favoritos">Ingresar</Link></Button>}
      />
    );
  if (q.isPending) return <LoadingBlock label="Cargando tus favoritos…" />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-[28px] font-semibold tracking-tight">Mis favoritos</h1>
      {q.data.items.length === 0 ? (
        <EmptyState
          title="Aún no tienes favoritos"
          description="Toca el corazón de un producto para guardarlo aquí."
          action={<Button asChild><Link to="/catalogo">Ver catálogo</Link></Button>}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {q.data.items.map((item) => (
            <li key={item.product.id}><FavoriteCard item={item} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
