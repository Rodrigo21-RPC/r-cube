import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { REVIEW_COMMENT_MAX } from "@shared/review";
import type { Review, ReviewsPage } from "@shared/types";
import { apiFetch, ApiError, queryClient } from "@web/api";
import { useSession } from "@web/auth";
import { Pagination } from "@web/admin/components/Pagination";
import { ErrorState, LoadingBlock } from "@web/components/States";
import { formatDate } from "@web/components/StatusBadge";
import { StarInput, StarRating } from "@web/components/StarRating";
import { Button } from "@web/components/ui/button";
import { Card } from "@web/components/ui/misc";

function ReviewItem({ r, note }: { r: Review; note?: string }) {
  return (
    <li className="flex flex-col gap-1 border-t border-border py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <StarRating value={r.rating} />
        <span className="font-medium">{r.authorName}</span>
        <span className="text-sm text-muted">{formatDate(r.createdAt)}</span>
      </div>
      {r.comment && <p className="whitespace-pre-line leading-relaxed">{r.comment}</p>}
      {note && <p className="text-sm text-muted">{note}</p>}
    </li>
  );
}

function ReviewForm({ slug }: { slug: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors({});
    if (rating === 0) return setErrors({ rating: "Elige una calificación de 1 a 5." });
    setBusy(true);
    try {
      await apiFetch(`/catalog/products/${slug}/reviews`, { method: "POST", json: { rating, comment } });
      toast.success("¡Gracias por tu reseña!");
      await queryClient.invalidateQueries({ queryKey: ["reviews", slug] });
    } catch (x) {
      if (x instanceof ApiError) setErrors(Object.keys(x.fields).length ? x.fields : { form: x.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <h3 className="text-[17px] font-semibold">Calificar este producto</h3>
      <StarInput value={rating} onChange={setRating} error={errors.rating} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="resena-comentario" className="text-sm font-medium">Comentario (opcional)</label>
        <textarea
          id="resena-comentario"
          rows={4}
          maxLength={REVIEW_COMMENT_MAX}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          aria-invalid={Boolean(errors.comment)}
          className="w-full rounded-2xl border border-input bg-surface p-4 text-[15px]"
        />
        <p className="tabular text-sm text-muted">{comment.length} de {REVIEW_COMMENT_MAX} caracteres</p>
        {errors.comment && <p role="alert" className="text-sm text-danger">{errors.comment}</p>}
      </div>
      {errors.form && <p role="alert" className="text-sm text-danger">{errors.form}</p>}
      <Button type="submit" disabled={busy} className="w-fit">{busy ? "Publicando…" : "Publicar reseña"}</Button>
    </form>
  );
}

/** Promedio, lista paginada y formulario de reseñas de un producto (HU-46). */
export function Reviews({ slug }: { slug: string }) {
  const session = useSession();
  const [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ["reviews", slug, page, session.data?.id ?? "anon"],
    queryFn: () => apiFetch<ReviewsPage>(`/catalog/products/${slug}/reviews?page=${page}`),
    placeholderData: keepPreviousData,
    enabled: !session.isPending,
  });

  return (
    <section aria-labelledby="resenas-titulo" className="flex flex-col gap-4">
      <h2 id="resenas-titulo" className="text-[22px] font-semibold tracking-tight">Reseñas</h2>
      {q.isPending ? (
        <LoadingBlock label="Cargando reseñas…" />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : (
        <>
          {q.data.count > 0 ? (
            <p className="flex flex-wrap items-center gap-2">
              <StarRating value={q.data.average ?? 0} />
              <span className="tabular font-semibold">{q.data.average?.toLocaleString("es-PE", { minimumFractionDigits: 1 })} de 5</span>
              <span className="text-muted">({q.data.count} {q.data.count === 1 ? "reseña" : "reseñas"})</span>
            </p>
          ) : (
            <p className="text-muted">Aún no hay reseñas.</p>
          )}

          {q.data.canReview && (
            <Card>
              <ReviewForm slug={slug} />
            </Card>
          )}
          {q.data.mine && (
            <Card>
              <h3 className="mb-1 text-[17px] font-semibold">Tu reseña</h3>
              <ul>
                <ReviewItem r={q.data.mine} note={q.data.mine.hidden ? "Esta reseña fue ocultada por moderación." : undefined} />
              </ul>
            </Card>
          )}
          {session.data && !q.data.canReview && !q.data.mine && q.data.reviewBlockedReason && <p className="text-sm text-muted">{q.data.reviewBlockedReason}</p>}
          {!session.data && (
            <p className="text-sm text-muted">
              <Link to={`/ingresar?volver=${encodeURIComponent(`/producto/${slug}`)}`} className="text-accent underline underline-offset-2">Inicia sesión</Link> para reseñar un producto que ya recibiste.
            </p>
          )}

          {q.data.items.length > 0 && (
            <>
              <ul>{q.data.items.map((r) => <ReviewItem key={r.id} r={r} />)}</ul>
              <Pagination page={page} total={q.data.total} pageSize={q.data.pageSize} onPage={setPage} />
            </>
          )}
        </>
      )}
    </section>
  );
}
