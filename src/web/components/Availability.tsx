import type { Availability as A } from "@shared/types";

/** «Disponible», «Quedan N» (stock ≤ 5) o «Agotado» (HU-05). */
export function Availability({ availability, stock }: { availability: A; stock: number }) {
  if (availability === "out") return <p className="text-sm font-medium text-danger">Agotado</p>;
  if (availability === "low") return <p className="text-sm font-medium text-warning">Quedan {stock}</p>;
  return <p className="text-sm text-success">Disponible</p>;
}
