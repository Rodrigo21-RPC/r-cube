import { formatPEN } from "@shared/money";
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
  // Cada monto en una sola línea: si no cabe, el corte cae en « a » y nunca entre «S/» y el número.
  const amount = (cents: number) => <span className="whitespace-nowrap">{formatPEN(cents)}</span>;
  return (
    <span className={cn("tabular font-semibold text-text", sizes[size], className)}>
      {amount(minCents)}
      {maxCents !== null && maxCents > minCents && <> a {amount(maxCents)}</>}
    </span>
  );
}
