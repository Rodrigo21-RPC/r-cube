import { useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { changePasswordSchema, profileSchema } from "@shared/schemas";
import type { Me } from "@shared/types";
import { apiFetch, queryClient } from "@web/api";
import { signOut, useSession } from "@web/auth";
import { clearLocalCartAfterSignOut } from "@web/cart/useCart";
import { useServerErrors } from "@web/hooks/useServerErrors";
import { useTitle } from "@web/hooks/useTitle";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Field, Input } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";

type Profile = z.input<typeof profileSchema>;
type Pwd = z.input<typeof changePasswordSchema>;

function ProfileForm({ me }: { me: Me }) {
  const form = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: me.name, phone: me.phone, address: me.address },
  });
  const server = useServerErrors(form.setError);
  useEffect(() => form.reset({ name: me.name, phone: me.phone, address: me.address }), [me, form]);

  async function onSubmit(v: Profile) {
    try {
      const updated = await apiFetch<Me>("/account/me", { method: "PATCH", json: v });
      queryClient.setQueryData(["me"], updated);
      toast.success("Tus datos se guardaron.");
    } catch (e) {
      server.handle(e);
    }
  }
  const { errors, isSubmitting } = form.formState;
  return (
    <Card>
      <h2 className="mb-4 text-[17px] font-semibold">Mis datos</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4 md:grid-cols-2">
        {server.message && <p role="alert" className="text-sm text-danger md:col-span-2">{server.message}</p>}
        <Field label="Correo" hint="El correo no se puede cambiar">
          {(p) => <Input {...p} value={me.email} readOnly aria-readonly className="opacity-80" />}
        </Field>
        <Field label="Nombre completo" error={errors.name?.message}>
          {(p) => <Input {...p} autoComplete="name" {...form.register("name")} />}
        </Field>
        <Field label="Celular" error={errors.phone?.message}>
          {(p) => <Input {...p} type="tel" inputMode="numeric" autoComplete="tel-national" {...form.register("phone")} />}
        </Field>
        <Field label="Dirección de entrega" error={errors.address?.line?.message}>
          {(p) => <Input {...p} autoComplete="street-address" {...form.register("address.line")} />}
        </Field>
        <Field label="Distrito" error={errors.address?.district?.message}>
          {(p) => <Input {...p} {...form.register("address.district")} />}
        </Field>
        <Field label="Referencia" error={errors.address?.reference?.message}>
          {(p) => <Input {...p} {...form.register("address.reference")} />}
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : "Guardar cambios"}</Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const form = useForm<Pwd>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const server = useServerErrors(form.setError);
  async function onSubmit(v: Pwd) {
    try {
      await apiFetch("/auth/change-password", { method: "POST", json: { ...v, revokeOtherSessions: true } });
      form.reset();
      toast.success("Tu contraseña cambió. Cerramos tus otras sesiones.");
    } catch (e) {
      server.handle(e);
    }
  }
  const { errors, isSubmitting } = form.formState;
  return (
    <Card>
      <h2 className="mb-4 text-[17px] font-semibold">Cambiar contraseña</h2>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4 md:grid-cols-2">
        {server.message && <p role="alert" className="text-sm text-danger md:col-span-2">{server.message}</p>}
        <Field label="Contraseña actual" error={errors.currentPassword?.message}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register("currentPassword")} />}
        </Field>
        <Field label="Nueva contraseña" hint="Mínimo 8 caracteres" error={errors.newPassword?.message}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register("newPassword")} />}
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" variant="secondary" disabled={isSubmitting}>Cambiar contraseña</Button>
        </div>
      </form>
    </Card>
  );
}

/** Mi cuenta: perfil, contraseña y cierre de sesión (HU-08 a HU-10). */
export default function Account() {
  useTitle("Mi cuenta");
  const navigate = useNavigate();
  const session = useSession();
  if (session.isPending) return <LoadingBlock />;
  if (session.isError) return <ErrorState onRetry={() => session.refetch()} />;
  if (!session.data) return <Navigate to="/ingresar?volver=/cuenta" replace />;

  async function logout() {
    await signOut();
    clearLocalCartAfterSignOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-semibold tracking-tight">Hola, {session.data.name.split(" ")[0]}</h1>
        <div className="flex gap-2">
          <Button asChild variant="secondary"><Link to="/pedidos">Mis pedidos</Link></Button>
          <Button variant="ghost" onClick={logout}>Cerrar sesión</Button>
        </div>
      </div>
      <ProfileForm me={session.data} />
      <PasswordForm />
    </div>
  );
}
