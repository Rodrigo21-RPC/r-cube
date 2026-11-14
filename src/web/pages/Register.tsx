import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { signUpSchema } from "@shared/schemas";
import { signUp } from "@web/auth";
import { mergeCartAfterSignIn } from "@web/cart/useCart";
import { useServerErrors } from "@web/hooks/useServerErrors";
import { useTitle } from "@web/hooks/useTitle";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";
import { safeReturn } from "./Login";

type Values = z.input<typeof signUpSchema>;

/** Registro con errores por campo; al terminar queda con sesión iniciada (HU-07). */
export default function Register() {
  useTitle("Crear cuenta");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const back = safeReturn(params.get("volver"));
  const form = useForm<Values>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" },
  });
  const server = useServerErrors(form.setError);

  async function onSubmit(v: Values) {
    server.setMessage(null);
    try {
      await signUp({ name: v.name, email: v.email, phone: v.phone, password: v.password });
      await mergeCartAfterSignIn();
      navigate(back, { replace: true });
    } catch (e) {
      server.handle(e);
    }
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-[28px] font-semibold tracking-tight">Crear cuenta</h1>
      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {server.message && (
            <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">
              {server.message}
            </p>
          )}
          <Field label="Nombre completo" error={errors.name?.message}>
            {(p) => <Input {...p} autoComplete="name" {...form.register("name")} />}
          </Field>
          <Field label="Correo" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" autoComplete="email" {...form.register("email")} />}
          </Field>
          <Field label="Celular" hint="9 dígitos, empieza con 9" error={errors.phone?.message}>
            {(p) => <Input {...p} type="tel" inputMode="numeric" autoComplete="tel-national" {...form.register("phone")} />}
          </Field>
          <Field label="Contraseña" hint="Mínimo 8 caracteres" error={errors.password?.message}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("password")} />}
          </Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
          </Button>
        </form>
      </Card>
      <p className="text-center text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link to={`/ingresar?volver=${encodeURIComponent(back)}`} className="text-accent underline underline-offset-2">
          Ingresa
        </Link>
      </p>
    </div>
  );
}
