import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { signInSchema } from "@shared/schemas";
import { signIn } from "@web/auth";
import { mergeCartAfterSignIn } from "@web/cart/useCart";
import { useServerErrors } from "@web/hooks/useServerErrors";
import { useTitle } from "@web/hooks/useTitle";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";

type Values = z.input<typeof signInSchema>;

export function safeReturn(path: string | null) {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

/** Inicio de sesión con mensaje genérico y aviso de bloqueo (HU-08). */
export default function Login() {
  useTitle("Ingresar");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeReturn(params.get("volver"));
  const form = useForm<Values>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });
  const server = useServerErrors(form.setError);

  async function onSubmit(v: Values) {
    server.setMessage(null);
    try {
      await signIn(v.email, v.password);
      await mergeCartAfterSignIn();
      navigate(back, { replace: true });
    } catch (e) {
      server.handle(e);
    }
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-[28px] font-semibold tracking-tight">Ingresar</h1>
      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {server.message && (
            <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">
              {server.message}
            </p>
          )}
          <Field label="Correo" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
          </Field>
          <Field label="Contraseña" error={errors.password?.message}>
            {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register("password")} />}
          </Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-muted">
        ¿No tienes cuenta?{" "}
        <Link to={`/registro?volver=${encodeURIComponent(back)}`} className="text-accent hover:underline">
          Regístrate
        </Link>
      </p>
    </div>
  );
}
