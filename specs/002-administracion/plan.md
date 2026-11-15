# Implementation Plan: Administración (R Cube)

**Branch**: `002-administracion` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-administracion/spec.md`

## Summary

Panel de administración en `/admin` protegido por rol: resumen con indicadores y gráfico de 30 días,
productos con fotos en R2, categorías y marcas, stock con historial, pedidos con transiciones válidas y
exportación CSV, confirmación y rechazo de pagos, clientes con bloqueo, configuración de la tienda y
auditoría. Se construye sobre el mismo Worker, la misma base y la misma web de la 001: un sub-router
`/api/admin/*` con `requireAdmin` y un layout `/admin` en la SPA. Ver [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6.0 estricto; Node 24 LTS en CI

**Primary Dependencies**: las de la 001 (Hono 4.13, Better Auth 1.7, Drizzle 0.45 + postgres.js, React 19,
React Router 8, TanStack Query 5, React Hook Form 7, Zod 4, Tailwind 4, shadcn/ui, Vite 7.3). Sin
dependencias nuevas: el gráfico es SVG propio y el CSV se arma con una función propia.

**Storage**: PostgreSQL (2 tablas nuevas y 1 columna nueva) y Cloudflare R2 (binding `FOTOS`)

**Testing**: Vitest (unitarias y API en workerd con R2 emulado) y Playwright (recorrido del panel)

**Target Platform**: Cloudflare Workers; panel pensado para escritorio y tableta, usable en celular

**Project Type**: Aplicación web (misma SPA y mismo Worker)

**Performance Goals**: resumen en < 2 s con los datos de demostración (SC-004); listas paginadas en el
servidor

**Constraints**: fotos ≤ 2 MB validadas por contenido; transacciones para stock, estado y auditoría;
WCAG 2.2 AA en ambos temas

**Scale/Scope**: 17 historias (HU-26 a HU-42), unas 12 pantallas de panel, unas 30 rutas de API

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple el plan | Estado |
|---|---|---|
| I. Simplicidad | Mismo Worker y SPA; sin librerías nuevas (gráfico SVG, CSV propio) | Cumple |
| II. Idioma y mercado | Panel en español de Perú; montos con `formatPEN`; días en hora de Lima | Cumple |
| III. Cero alcance fantasma | Cada ruta se rastrea a HU-26 a HU-42; dirección de recojo y QR no se editan (HU-41 no lo pide) | Cumple |
| IV. Verificable sin código | quickstart.md recorre las 17 historias | Cumple |
| V. Datos y pagos con respeto | Solo administradores; fotos validadas por contenido; ningún secreto nuevo | Cumple |
| VI. Pruebas primero | Pruebas de API por historia antes de cada ruta; unitarias para CSV, imágenes y stock | Cumple |
| VII. Integridad de datos | Stock + movimiento + auditoría en una transacción; estados con UPDATE condicional; migración versionada | Cumple |
| VIII. Publicable en Cloudflare | R2 por binding, sin dominio público ni módulos nativos | Cumple |
| IX. Experiencia cuidada | Estados de carga, vacío y error; formularios con errores por campo | Cumple |
| X. Tema claro y oscuro | Mismos tokens; el layout del panel incluye el interruptor | Cumple |
| XI. Trazabilidad | Pruebas y tareas con HU-xx | Cumple |

Re-check tras la Fase 1: sin violaciones.

## Project Structure

### Documentation (this feature)

```text
specs/002-administracion/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/admin-api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── shared/
│   ├── csv.ts                    # CSV con BOM y escape (HU-37)
│   ├── image-type.ts             # tipo real por bytes iniciales (HU-31)
│   └── admin-types.ts            # tipos de respuesta del panel
├── db/
│   ├── schema.ts                 # + stock_movement, audit_log, product_image.r2_key
│   └── seed-data.ts              # + movimientos iniciales y de los pedidos
├── worker/
│   ├── middleware.ts             # + requireAdmin
│   ├── services/
│   │   ├── stock.ts              # applyStockChange (HU-33)
│   │   ├── audit.ts              # audit() (HU-42)
│   │   ├── orders.ts             # createOrder/cancelOrder registran movimientos
│   │   └── images.ts             # subida, orden y borrado en R2 (HU-31)
│   └── routes/
│       ├── media.ts              # GET /api/media/* desde R2
│       └── admin/                # index.ts (requireAdmin), summary, products, taxonomy, stock,
│                                 # orders, payments, customers, settings, audit
└── web/
    ├── admin/
    │   ├── AdminLayout.tsx       # menú lateral, ingreso y «sin permiso», tema
    │   ├── components/           # SalesChart (SVG), DataTable, Pagination, ConfirmDialog
    │   └── pages/                # Summary, Products, ProductForm, Taxonomy, Orders, OrderDetail,
    │                             # Payments, Customers, CustomerDetail, Settings, Audit, Login
    └── components/Header.tsx     # + enlace «Panel» para administradores
tests/
├── unit/                         # csv, image-type
└── api/admin/                    # una prueba por historia
e2e/admin.spec.ts
drizzle/0002_*.sql
```

**Structure Decision**: el panel vive dentro de la misma SPA (`src/web/admin`) y del mismo Worker
(`src/worker/routes/admin`), con un único `requireAdmin` en el sub-router. Los servicios de la 001 se
reutilizan y se extienden solo donde la 002 lo exige (movimientos de stock).

## Complexity Tracking

Sin violaciones de la constitución.
