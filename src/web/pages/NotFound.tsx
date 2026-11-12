import { Link } from "react-router";
import { useTitle } from "@web/hooks/useTitle";
import { EmptyState } from "@web/components/States";
import { Button } from "@web/components/ui/button";

/** Página no encontrada (RNF-02). */
export default function NotFound() {
  useTitle("Página no encontrada");
  return (
    <EmptyState
      title="No encontramos esta página"
      description="Puede que el enlace esté mal escrito o que la página ya no exista."
      action={<Button asChild><Link to="/">Ir al inicio</Link></Button>}
    />
  );
}
