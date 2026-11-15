import { priceRangeText } from "@shared/variant";
import { cn } from "@web/lib/cn";

/** Rango de precios de un producto con variantes: «S/ a a S/ b» (HU-43, FR-003). */
export function PriceRange({
  minCents,
  maxCents,
  size = "md",
  className,
}: {
  minCents: number;
  maxCents: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "text-[15px]", md: "text-[17px]", lg: "text-[28px]" };
  return <span className={cn("tabular font-semibold text-text", sizes[size], className)}>{priceRangeText(minCents, maxCents)}</span>;
}
