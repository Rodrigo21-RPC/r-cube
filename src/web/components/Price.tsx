import { formatPEN } from "@shared/money";
import { cn } from "@web/lib/cn";

/** Precio con IGV incluido; precio anterior tachado si es mayor (HU-05, HU-06). */
export function Price({
  cents,
  compareAtCents,
  size = "md",
  className,
}: {
  cents: number;
  compareAtCents?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = { sm: "text-[15px]", md: "text-[17px]", lg: "text-[28px]" };
  const onSale = compareAtCents != null && compareAtCents > cents;
  return (
    <span className={cn("tabular inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-semibold text-text", sizes[size])}>{formatPEN(cents)}</span>
      {onSale && (
        <s className="text-sm text-muted">
          <span className="sr-only">Antes </span>
          {formatPEN(compareAtCents)}
        </s>
      )}
    </span>
  );
}
