import { useState } from "react";
import { formatPEN } from "@shared/money";

const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

/**
 * Ventas diarias de 30 días (HU-27): una sola serie de magnitud → barras finas de un tono, sin leyenda,
 * cuadrícula discreta, tooltip al pasar el mouse y tabla equivalente para lectores de pantalla.
 */
export function SalesChart({ data }: { data: { date: string; totalCents: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { top: 12, right: 8, bottom: 28, left: 64 };
  const max = Math.max(1, ...data.map((d) => d.totalCents));
  const niceMax = Math.ceil(max / 100000) * 100000 || 100000;
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const step = plotW / data.length;
  const barW = Math.max(4, step - 2);
  const y = (v: number) => pad.top + plotH - (v / niceMax) * plotH;
  const ticks = [0, 0.5, 1].map((f) => Math.round(niceMax * f));
  const total = data.reduce((s, d) => s + d.totalCents, 0);
  const hovered = hover !== null ? data[hover] : null;

  return (
    <figure className="relative flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[17px] font-semibold">Ventas de los últimos 30 días</span>
        <span className="tabular text-sm text-muted">Total: {formatPEN(total)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" aria-hidden onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
              {formatPEN(t).replace(".00", "")}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.left + i * step + (step - barW) / 2;
          const h = Math.max(0, pad.top + plotH - y(d.totalCents));
          const r = Math.min(4, h, barW / 2);
          const yTop = pad.top + plotH - h;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              {/* área de toque mayor que la barra */}
              <rect x={pad.left + i * step} y={pad.top} width={step} height={plotH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x},${pad.top + plotH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${pad.top + plotH} Z`}
                  fill="var(--accent)"
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
            </g>
          );
        })}
        <line x1={pad.left} x2={W - pad.right} y1={pad.top + plotH} y2={pad.top + plotH} stroke="var(--input-border)" strokeWidth={1} />
        {data.map((d, i) =>
          i % 7 === 0 || i === data.length - 1 ? (
            <text key={d.date} x={pad.left + i * step + step / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
              {fmtDay(d.date)}
            </text>
          ) : null,
        )}
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute right-2 top-10 rounded-xl border border-border bg-canvas px-3 py-2 text-sm shadow-lg" aria-hidden>
          <p className="text-muted">{fmtDay(hovered.date)}</p>
          <p className="tabular font-semibold">{formatPEN(hovered.totalCents)}</p>
        </div>
      )}
      <table className="sr-only">
        <caption>Ventas por día, últimos 30 días</caption>
        <thead>
          <tr><th scope="col">Día</th><th scope="col">Ventas</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}><td>{fmtDay(d.date)}</td><td>{formatPEN(d.totalCents)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Ventas por categoría como barras horizontales con el nombre escrito (identidad nunca solo por color). */
export function CategoryBars({ data }: { data: { name: string; totalCents: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.totalCents));
  if (!data.length) return <p className="text-muted">Sin ventas en los últimos 30 días.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.name} className="flex flex-col gap-1">
          <div className="flex justify-between gap-2 text-sm">
            <span>{d.name}</span>
            <span className="tabular text-muted">{formatPEN(d.totalCents)}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-2" aria-hidden>
            <div className="h-2 rounded-full bg-accent" style={{ width: `${(d.totalCents / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
