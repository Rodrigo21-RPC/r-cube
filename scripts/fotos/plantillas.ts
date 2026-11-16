/**
 * Plantillas HTML de las tres tarjetas gráficas de cada producto (feature 004, research R9): características,
 * destacados y compra segura. Estilo de R Cube: fondo oscuro con brillo turquesa del logo, tipografía de sistema con
 * jerarquía clara e iconos de lucide. Solo muestran datos del producto y de la tienda (sin precios ni garantías
 * inventados). Son imágenes fijas: no cambian con el tema.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
const icons = Lucide as unknown as Record<string, IconComponent>;

const LOGO = `data:image/png;base64,${readFileSync(join(process.cwd(), "public", "img", "logo.png")).toString("base64")}`;

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function icon(name: string, size = 40): string {
  const Icon = icons[name] ?? icons.CircleCheck!;
  return renderToStaticMarkup(createElement(Icon, { size, strokeWidth: 2.2, color: "currentColor" }));
}

/** Icono según la etiqueta de la especificación («Pantalla» → monitor). */
const SPEC_ICONS: [RegExp, string][] = [
  [/pantalla/i, "Monitor"],
  [/almacenamiento|ssd/i, "HardDrive"],
  [/c[aá]mara/i, "Camera"],
  [/bater[ií]a/i, "BatteryFull"],
  [/\bram\b/i, "MemoryStick"],
  [/gpu|procesador|chip/i, "Cpu"],
  [/resistencia/i, "Droplets"],
  [/garant/i, "ShieldCheck"],
  [/velocidad|conductividad|capacidad/i, "Gauge"],
  [/voltaje/i, "Zap"],
  [/celdas/i, "Battery"],
  [/material/i, "Layers"],
  [/conector|interfaz/i, "Plug"],
  [/compatib/i, "Puzzle"],
  [/piezas/i, "Wrench"],
  [/estuche/i, "Briefcase"],
  [/peso/i, "Scale"],
];
const specIcon = (label: string) => SPEC_ICONS.find(([re]) => re.test(label))?.[1] ?? "CircleCheck";

/** Tamaño de letra según el largo del texto. */
const fit = (text: string, steps: [number, number][], fallback: number) => steps.find(([max]) => text.length <= max)?.[1] ?? fallback;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1000px;height:1000px}
body{position:relative;overflow:hidden;color:#f4f7f8;background:#04070a;font-family:"Segoe UI","Inter",system-ui,-apple-system,Roboto,sans-serif}
.bg{position:absolute;inset:0;background:
  radial-gradient(720px 540px at 90% 6%,rgba(46,230,197,.30),transparent 62%),
  radial-gradient(660px 540px at 4% 98%,rgba(42,168,255,.22),transparent 60%),
  linear-gradient(165deg,#0b141a 0%,#05090c 55%,#04070a 100%)}
.grid{position:absolute;inset:0;opacity:.9;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:50px 50px;-webkit-mask-image:radial-gradient(circle at 72% 26%,#000 0,transparent 68%);mask-image:radial-gradient(circle at 72% 26%,#000 0,transparent 68%)}
.wrap{position:relative;height:100%;padding:60px 68px 56px;display:flex;flex-direction:column}
.top{display:flex;align-items:center;justify-content:space-between;gap:24px}
.logo{display:flex;align-items:center;gap:16px}
.logo img{width:60px;height:60px;border-radius:16px;box-shadow:0 0 28px rgba(46,230,197,.35)}
.logo span{font-size:32px;font-weight:700;letter-spacing:.02em}
.chip{max-width:470px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:12px 26px;border-radius:999px;font-size:24px;font-weight:600;color:#d9e6ea;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14)}
.eyebrow{margin-top:54px;font-size:23px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#2ee6c5}
h1{margin-top:16px;padding-bottom:.14em;font-weight:800;line-height:1.1;letter-spacing:-.01em;background:linear-gradient(100deg,#ffffff 20%,#bff7ee 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.ico{flex:none;display:grid;place-items:center;color:#04100f;background:linear-gradient(135deg,#2ee6c5,#2aa8ff)}
.muted{color:#aebfc7}
.foot{margin-top:auto;font-size:22px;color:#8ea3ad}
.main{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:18px}
.main .eyebrow{margin-top:0}
`;

const frame = (inner: string) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="bg"></div><div class="grid"></div><div class="wrap">${inner}</div></body></html>`;

const top = (chip: string) =>
  `<div class="top"><div class="logo"><img src="${LOGO}" alt=""><span>R Cube</span></div><div class="chip">${esc(chip)}</div></div>`;

export interface CardData {
  name: string;
  brand: string;
  desc: string;
  specs: [string, string][];
  tagline: string;
  highlights: string[];
}

/** Tarjeta 1: características (marca, nombre y hasta 4 especificaciones). */
export function fichaCaracteristicas(d: CardData): string {
  const specs = d.specs.slice(0, 4);
  const tiles = specs
    .map((s, i) => {
      const wide = specs.length % 2 === 1 && i === specs.length - 1 ? " wide" : "";
      return `<div class="tile${wide}"><div class="ico" style="width:78px;height:78px;border-radius:24px">${icon(specIcon(s[0]), 40)}</div><div><div class="k">${esc(s[0])}</div><div class="v">${esc(s[1])}</div></div></div>`;
    })
    .join("");
  return frame(`
<style>
.tiles{margin-top:42px;display:grid;grid-template-columns:1fr 1fr;gap:22px}
.tile{display:flex;align-items:center;gap:22px;padding:26px 28px;border-radius:30px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.12)}
.tile.wide{grid-column:span 2}
.tile .k{font-size:22px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#9fb3bd}
.tile .v{margin-top:6px;font-size:36px;font-weight:700;line-height:1.12}
.desc{margin-top:38px;font-size:28px;line-height:1.42;color:#b7c7cf;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
</style>
${top(d.brand)}
<div class="main">
<div class="eyebrow">Características</div>
<h1 style="font-size:${fit(d.name, [[22, 78], [34, 66]], 56)}px">${esc(d.name)}</h1>
<div class="tiles">${tiles}</div>
<p class="desc">${esc(d.desc)}</p>
</div>`);
}

/** Tarjeta 2: destacados (la frase y las viñetas del producto). */
export function fichaDestacados(d: CardData): string {
  const rows = d.highlights
    .map(
      (h) =>
        `<div class="hl"><div class="ico" style="width:54px;height:54px;border-radius:18px">${icon("Check", 32)}</div><span>${esc(h)}</span></div>`,
    )
    .join("");
  return frame(`
<style>
h1{margin-top:18px}
.hls{margin-top:36px;display:flex;flex-direction:column;gap:14px}
.hl{display:flex;align-items:center;gap:22px;padding:18px 26px;border-radius:26px;background:rgba(255,255,255,.065);border:1px solid rgba(255,255,255,.11);font-size:33px;font-weight:600;line-height:1.15}
</style>
${top(d.name)}
<div class="main">
<div class="eyebrow">Por qué te va a encantar</div>
<h1 style="font-size:${fit(d.tagline, [[48, 60], [68, 52]], 46)}px">${esc(d.tagline)}</h1>
<div class="hls">${rows}</div>
</div>`);
}

/** Tarjeta 3: compra segura (formas de pago, entrega, IGV y atención por WhatsApp de la tienda). */
export function fichaCompra(d: CardData): string {
  const pay: [string, string][] = [
    ["CreditCard", "Tarjeta"],
    ["Smartphone", "Yape o Plin"],
    ["Landmark", "Transferencia"],
    ["MessageCircle", "WhatsApp"],
  ];
  const chips = pay
    .map(([i, t]) => `<div class="pay"><div class="ico" style="width:62px;height:62px;border-radius:20px">${icon(i, 34)}</div><span>${t}</span></div>`)
    .join("");
  const rows: [string, string][] = [
    ["Truck", "Delivery por zona o recojo en tienda"],
    ["Receipt", "Precios en soles con IGV incluido"],
    ["MessageCircle", "Atención por WhatsApp"],
  ];
  const lines = rows
    .map(([i, t]) => `<div class="row"><div class="ring">${icon(i, 28)}</div><span>${t}</span></div>`)
    .join("");
  return frame(`
<style>
h1{font-size:68px}
.sub{margin-top:14px;font-size:30px;color:#b7c7cf}
.pays{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
.pay{display:flex;align-items:center;gap:20px;padding:24px 26px;border-radius:28px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.12);font-size:33px;font-weight:700}
.rows{margin-top:34px;display:flex;flex-direction:column;gap:22px}
.row{display:flex;align-items:center;gap:22px;font-size:31px;color:#dbe6ea;font-weight:500}
.ring{flex:none;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;color:#2ee6c5;border:2px solid rgba(46,230,197,.55);background:rgba(46,230,197,.08)}
</style>
${top(d.name)}
<div class="eyebrow">Compra fácil y segura</div>
<h1>Paga como prefieras</h1>
<p class="sub">Elige el medio que te quede mejor en R Cube.</p>
<div class="pays">${chips}</div>
<div class="rows">${lines}</div>
<p class="foot">Pagos en modo de prueba: no se cobra dinero real.</p>`);
}
