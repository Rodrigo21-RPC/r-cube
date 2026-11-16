import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { AdminProduct, TaxonomyItem } from "@shared/admin-types";
import { HIGHLIGHT_MAX, HIGHLIGHTS_MAX, TAGLINE_MAX } from "@shared/highlights";
import { apiFetch, queryClient } from "@web/api";
import { useServerErrors } from "@web/hooks/useServerErrors";
import { useTitle } from "@web/hooks/useTitle";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { Button } from "@web/components/ui/button";
import { Field, Input, Select } from "@web/components/ui/form";
import { Card } from "@web/components/ui/misc";
import { ProductImages } from "./ProductImages";
import { ProductStock } from "./ProductStock";
import { ProductVariants } from "./ProductVariants";

interface FormValues {
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  specs: { label: string; value: string }[];
  tagline: string;
  highlights: { text: string }[];
  price: string;
  compareAt: string;
  stock: string;
  active: boolean;
}

const toCents = (s: string) => Math.round(Number(s.replace(",", ".")) * 100);
const fromCents = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2));

function ProductEditor({ product, categories, brands }: { product: AdminProduct | null; categories: TaxonomyItem[]; brands: TaxonomyItem[] }) {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    defaultValues: product
      ? { name: product.name, brandId: product.brandId, categoryId: product.categoryId, description: product.description, specs: product.specs,
          tagline: product.tagline, highlights: product.highlights.map((text) => ({ text })),
          price: fromCents(product.priceCents), compareAt: fromCents(product.compareAtCents), stock: String(product.stock), active: product.active }
      : { name: "", brandId: brands[0]?.id ?? "", categoryId: categories[0]?.id ?? "", description: "", specs: [], tagline: "", highlights: [], price: "", compareAt: "", stock: "0", active: true },
  });
  const specs = useFieldArray({ control: form.control, name: "specs" });
  const highlights = useFieldArray({ control: form.control, name: "highlights" });
  const [limitMessage, setLimitMessage] = useState<string | null>(null);
  const taglineLength = useWatch({ control: form.control, name: "tagline" })?.length ?? 0;
  const highlightValues = useWatch({ control: form.control, name: "highlights" });
  const server = useServerErrors(form.setError);
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(v: FormValues) {
    server.setMessage(null);
    const body = {
      name: v.name, brandId: v.brandId, categoryId: v.categoryId, description: v.description,
      specs: v.specs.filter((s) => s.label.trim() && s.value.trim()),
      priceCents: toCents(v.price), compareAtCents: v.compareAt.trim() ? toCents(v.compareAt) : null,
      stock: Number(v.stock || 0), active: v.active,
      // La frase y los destacados se envían siempre: quitarlos desde aquí los vacía (HU-57).
      tagline: v.tagline, highlights: v.highlights.map((h) => h.text),
    };
    try {
      const saved = await apiFetch<AdminProduct>(product ? `/admin/products/${product.id}` : "/admin/products", {
        method: product ? "PATCH" : "POST",
        json: body,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success(product ? "Producto guardado." : "Producto creado. Ahora puedes subir sus fotos.");
      if (!product) navigate(`/admin/productos/${saved.id}`, { replace: true });
    } catch (e) {
      server.handle(e);
      // Los errores del servidor usan los nombres de la API; se muestran junto al campo equivalente.
      const map: Record<string, keyof FormValues> = { priceCents: "price", compareAtCents: "compareAt" };
      for (const [api, field] of Object.entries(map)) {
        const msg = (e as { fields?: Record<string, string> }).fields?.[api];
        if (msg) form.setError(field, { message: msg });
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {server.message && <p role="alert" className="rounded-2xl bg-danger/10 p-3 text-sm text-danger">{server.message}</p>}
      <Card className="grid gap-4 md:grid-cols-2">
        <Field label="Nombre" error={errors.name?.message}>{(p) => <Input {...p} {...form.register("name", { required: "Escribe el nombre." })} />}</Field>
        <Field label="Marca" error={errors.brandId?.message}>
          {(p) => <Select {...p} {...form.register("brandId")}>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}{b.active ? "" : " (inactiva)"}</option>)}</Select>}
        </Field>
        <Field label="Categoría" error={errors.categoryId?.message}>
          {(p) => <Select {...p} {...form.register("categoryId")}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (inactiva)"}</option>)}</Select>}
        </Field>
        <Field label="Precio (S/, con IGV)" hint={product?.hasVariants ? "Con variantes, se calcula con el precio «desde» de las activas" : undefined} error={errors.price?.message}>
          {(p) => <Input {...p} inputMode="decimal" readOnly={product?.hasVariants} aria-readonly={product?.hasVariants} className={product?.hasVariants ? "cursor-not-allowed border-dashed" : undefined} {...form.register("price", { required: "Escribe el precio." })} />}
        </Field>
        <Field label="Precio anterior (opcional)" hint={product?.hasVariants ? "No aplica a productos con variantes" : "Si es mayor que el precio, el producto sale en Ofertas"} error={errors.compareAt?.message}>
          {(p) => <Input {...p} inputMode="decimal" readOnly={product?.hasVariants} aria-readonly={product?.hasVariants} className={product?.hasVariants ? "cursor-not-allowed border-dashed" : undefined} {...form.register("compareAt")} />}
        </Field>
        {!product && (
          <Field label="Stock inicial" error={errors.stock?.message}>{(p) => <Input {...p} inputMode="numeric" {...form.register("stock")} />}</Field>
        )}
        <div className="md:col-span-2">
          <Field label="Descripción" error={errors.description?.message}>
            {(p) => <textarea {...p} rows={4} className="w-full rounded-2xl border border-input bg-surface p-4 text-[15px]" {...form.register("description")} />}
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[15px]">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" {...form.register("active")} /> Producto activo (visible en la tienda)
        </label>
      </Card>
      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="text-[17px] font-semibold">Frase y destacados</h2>
          <p className="text-sm text-muted">Se muestran bajo el nombre del producto en la tienda. Texto breve y sin formato.</p>
        </div>
        <Field label="Frase destacada" hint={`${taglineLength} de ${TAGLINE_MAX} caracteres`} error={errors.tagline?.message}>
          {(p) => (
            <Input
              {...p}
              {...form.register("tagline", { maxLength: { value: TAGLINE_MAX, message: `La frase no puede pasar de ${TAGLINE_MAX} caracteres` } })}
            />
          )}
        </Field>
        {highlights.fields.map((f, i) => (
          <div key={f.id} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field
                label={`Destacado ${i + 1}`}
                hint={`${highlightValues?.[i]?.text?.length ?? 0} de ${HIGHLIGHT_MAX} caracteres`}
                error={errors.highlights?.[i]?.text?.message ?? errors.highlights?.[i]?.message}
              >
                {(p) => (
                  <Input
                    {...p}
                    {...form.register(`highlights.${i}.text`, { maxLength: { value: HIGHLIGHT_MAX, message: `Cada destacado admite hasta ${HIGHLIGHT_MAX} caracteres` } })}
                  />
                )}
              </Field>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Quitar destacado ${i + 1}`}
              onClick={() => {
                highlights.remove(i);
                setLimitMessage(null);
              }}
            >
              <Trash2 aria-hidden className="size-5" />
            </Button>
          </div>
        ))}
        {(limitMessage || errors.highlights?.message) && (
          <p role="alert" className="text-sm text-danger">
            {limitMessage ?? errors.highlights?.message}
          </p>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit"
          onClick={() => {
            if (highlights.fields.length >= HIGHLIGHTS_MAX) return setLimitMessage(`Máximo ${HIGHLIGHTS_MAX} destacados`);
            setLimitMessage(null);
            highlights.append({ text: "" });
          }}
        >
          <Plus aria-hidden className="size-4" /> Agregar destacado
        </Button>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-[17px] font-semibold">Especificaciones</h2>
        {specs.fields.map((f, i) => (
          <div key={f.id} className="flex items-end gap-2">
            <Field label={`Nombre ${i + 1}`}>{(p) => <Input {...p} {...form.register(`specs.${i}.label`)} />}</Field>
            <Field label={`Valor ${i + 1}`}>{(p) => <Input {...p} {...form.register(`specs.${i}.value`)} />}</Field>
            <Button type="button" variant="ghost" size="icon" aria-label={`Quitar especificación ${i + 1}`} onClick={() => specs.remove(i)}><Trash2 aria-hidden className="size-5" /></Button>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => specs.append({ label: "", value: "" })}>
          <Plus aria-hidden className="size-4" /> Agregar especificación
        </Button>
      </Card>
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}</Button>
        <Button asChild variant="ghost"><Link to="/admin/productos">Cancelar</Link></Button>
      </div>
    </form>
  );
}

/** Crear y editar productos, con fotos y stock al editar (HU-28, HU-31, HU-33). */
export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id;
  const [adjustVariant, setAdjustVariant] = useState("");
  useTitle(isNew ? "Panel: nuevo producto" : "Panel: editar producto");
  const product = useQuery({ queryKey: ["admin", "product", id], queryFn: () => apiFetch<AdminProduct>(`/admin/products/${id}`), enabled: !isNew });
  const categories = useQuery({ queryKey: ["admin", "categories"], queryFn: () => apiFetch<TaxonomyItem[]>("/admin/categories") });
  const brands = useQuery({ queryKey: ["admin", "brands"], queryFn: () => apiFetch<TaxonomyItem[]>("/admin/brands") });

  if ((!isNew && product.isPending) || categories.isPending || brands.isPending) return <LoadingBlock />;
  const failed = (!isNew && product.isError && product) || (categories.isError && categories) || (brands.isError && brands);
  if (failed) return <ErrorState message={failed.error?.message} onRetry={() => failed.refetch()} />;

  return (
    <div className="flex flex-col gap-5">
      <Link to="/admin/productos" className="inline-flex w-fit items-center gap-1 text-sm text-accent hover:underline"><ArrowLeft aria-hidden className="size-4" /> Productos</Link>
      <h1 className="text-[28px] font-semibold tracking-tight">{isNew ? "Nuevo producto" : product.data!.name}</h1>
      <ProductEditor key={product.data?.id ?? "nuevo"} product={isNew ? null : product.data!} categories={categories.data!} brands={brands.data!} />
      {!isNew && product.data && (
        <>
          <ProductImages product={product.data} />
          <ProductVariants product={product.data} onAdjust={(vid) => { setAdjustVariant(vid); document.getElementById("stock-del-producto")?.scrollIntoView({ block: "center" }); }} />
          <div id="stock-del-producto"><ProductStock product={product.data} variantId={adjustVariant} onVariantChange={setAdjustVariant} /></div>
        </>
      )}
    </div>
  );
}
