# Implementation Plan: Tienda y compra (R Cube)

**Branch**: `001-tienda-compra` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-tienda-compra/spec.md`

## Summary

Tienda en línea completa para el cliente: catálogo con búsqueda, filtros y orden; detalle; portada;
cuenta; carrito persistente con recálculo en servidor; checkout con 4 métodos de pago simulados y
pedido creado en una sola transacción; Mis pedidos con línea de tiempo y cancelación; vencimiento
automático a las 24 h; tema claro y oscuro. Se construye como una SPA de React servida por un único
Cloudflare Worker que también expone la API Hono, con PostgreSQL (Supabase) vía Hyperdrive y Drizzle.
Ver [research.md](research.md) para cada decisión.

## Technical Context

**Language/Version**: TypeScript 6.0 (estricto), Node 24 LTS para herramientas y CI

**Primary Dependencies**: Hono 4.13, Better Auth 1.7, Drizzle ORM 0.45 + drizzle-kit 0.31, `postgres` (postgres.js) 4,
React 19, React Router 8 (SPA), TanStack Query 5, React Hook Form 7, Zod 4, Zustand 5, Tailwind CSS 4,
shadcn/ui, Vite 8 con `@cloudflare/vite-plugin` 1.69, Wrangler 4.161

**Storage**: PostgreSQL 16 (Supabase en producción, Docker en local y CI) mediante Hyperdrive (caché
desactivada); Cloudflare R2 configurado para la 002; fotos de demostración estáticas

**Testing**: Vitest 4.1 (unitarias en Node; API con `@cloudflare/vitest-plugin` 1.8),
Playwright 1.65 (e2e)

**Target Platform**: Cloudflare Workers (workerd) con static assets y Cron Trigger; navegadores
móviles y de escritorio actuales

**Project Type**: Aplicación web (SPA + API en el mismo Worker)

**Performance Goals**: catálogo visible en < 2,5 s en móvil (SC-003); 1 000 productos y 200 personas
simultáneas (SC-008)

**Constraints**: sin módulos nativos ni sistema de archivos; CPU por petición del plan gratuito de
Workers (10 ms), por eso hash PBKDF2 de WebCrypto; WCAG 2.2 AA en ambos temas; montos en céntimos

**Scale/Scope**: 24 historias activas (HU-01 a HU-25 sin HU-19), unas 14 pantallas, 7 tablas de
dominio más las de Better Auth

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple el plan | Estado |
|---|---|---|
| I. Simplicidad | Un solo paquete y un solo Worker; sin monorepo, sin colas, sin caché propia; búsqueda con ILIKE | Cumple |
| II. Idioma y mercado | Interfaz en español de Perú; `Intl` es-PE con PEN; IGV incluido (R5) | Cumple |
| III. Cero alcance fantasma | Cada ruta y tabla se rastrea a una HU o RN; R2 solo se declara (lo usa la 002) | Cumple |
| IV. Verificable sin código | quickstart.md recorre cada HU desde la app | Cumple |
| V. Datos y pagos con respeto | Hash PBKDF2; solo últimos 4 dígitos; aviso de simulación; secretos en `.env` y Wrangler; `.env.example` | Cumple |
| VI. Pruebas primero | Reglas puras con prueba unitaria previa; API en workerd; e2e de compra completa; `npm run check` | Cumple |
| VII. Integridad de datos | Transacción con UPDATE condicional de stock (R4); totales en servidor; migraciones drizzle-kit | Cumple |
| VIII. Publicable en Cloudflare | Worker + Hyperdrive + postgres.js con `nodejs_compat`; nada de Express, SQLite ni nativos | Cumple |
| IX. Experiencia cuidada | Componentes de carga, vacío y error comunes; formularios con errores por campo | Cumple |
| X. Tema claro y oscuro | Variables CSS, script en línea sin parpadeo, interruptor de dos estados (R9) | Cumple |
| XI. Trazabilidad | Títulos de prueba y tareas con HU-xx | Cumple |

Re-check tras la Fase 1: sin violaciones; Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/001-tienda-compra/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/api.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
index.html                   # script de tema en línea + raíz de React
public/
├── _headers                 # CSP y cabeceras de seguridad de las páginas
└── img/                     # productos/ (fotos de demostración), generico.svg, logo
src/
├── shared/                  # código puro compartido web/API (sin dependencias de runtime)
│   ├── money.ts             # céntimos, IGV (RN-14), formato S/
│   ├── luhn.ts              # validación de tarjeta (HU-16)
│   ├── order-status.ts      # estados y canTransition (REQUISITOS §5)
│   ├── search.ts            # normalización sin tildes (HU-02)
│   ├── whatsapp.ts          # mensaje y enlace wa.me (HU-20)
│   ├── schemas.ts           # esquemas Zod de entrada (formularios y API)
│   └── types.ts             # tipos de respuesta de la API (research R2b)
├── db/
│   ├── schema.ts            # tablas Drizzle (data-model.md)
│   ├── client.ts            # conexión por petición con postgres.js (Hyperdrive)
│   ├── seed-data.ts         # datos de demostración (runSeed, también usado en pruebas)
│   └── seed.ts              # entrada de npm run db:seed
├── worker/
│   ├── index.ts             # Hono app + export fetch/scheduled
│   ├── auth.ts              # Better Auth (roles, sesión de 7 días)
│   ├── password.ts          # hash PBKDF2 con WebCrypto (research R3)
│   ├── middleware.ts        # sesión, roles, errores, validación, secureHeaders
│   ├── routes/              # auth.ts (bloqueo y mensajes), catalog.ts, account.ts, cart.ts,
│   │                        # checkout.ts, orders.ts
│   ├── services/            # pricing.ts, orders.ts (transacción y cancelación), payments.ts (simulador)
│   └── cron.ts              # vencimiento 24 h (RN-12)
└── web/
    ├── main.tsx, router.tsx, api.ts (apiFetch tipado con @shared/types), auth.ts (sesión)
    ├── theme/               # conmutador de tema (HU-25)
    ├── components/ui/       # shadcn/ui
    ├── components/          # Header, ProductCard, Price, Filters, States, TotalsBox, StatusBadge
    ├── cart/                # useCart (visitante y cuenta), AddToCart (HU-11 a HU-13)
    ├── stores/cart.ts       # Zustand persist (HU-12)
    └── pages/               # Home, Catalog, Product, Cart, Checkout, Confirmation, Login,
                             # Register, Account, Orders, OrderDetail, NotFound
drizzle/                     # migraciones SQL generadas
tests/
├── unit/                    # Vitest Node (reglas puras)
└── api/                     # Vitest con @cloudflare/vitest-plugin (rutas Hono + Postgres de Docker)
e2e/                         # Playwright
scripts/contrast.ts          # verificación de contraste AA de los tokens de tema (HU-25)
docker-compose.yml, wrangler.jsonc, drizzle.config.ts, vite.config.ts, vitest.config.ts,
playwright.config.ts, .env.example, DESPLIEGUE.md, .github/workflows/ci.yml
```

**Structure Decision**: un solo paquete npm con carpetas por capa (`shared`, `db`, `worker`, `web`).
`src/shared` no importa nada de `worker` ni de `web`, lo que permite probar las reglas de negocio en
Node y reutilizarlas en el navegador. Un solo Worker sirve la SPA (static assets con
`not_found_handling: single-page-application`) y la API bajo `/api/*` (`run_worker_first` para
`/api/*`).

## Despliegue (lo ejecuta la sesión de escritorio, aquí solo se deja listo)

- `wrangler.jsonc`: `main: src/worker/index.ts`, `compatibility_flags: ["nodejs_compat"]`, `assets`
  (SPA), binding `HYPERDRIVE` (con `localConnectionString` hacia Docker), binding `FOTOS` (R2),
  `triggers.crons: ["0 * * * *"]`, variable `PUBLIC_URL`.
- Secretos: `BETTER_AUTH_SECRET`; `DATABASE_URL` solo para migraciones y seed desde la PC.
- Scripts: `dev`, `build`, `preview`, `check`, `test`, `test:api`, `test:e2e`, `db:generate`,
  `db:migrate`, `db:seed`, `deploy`.
- DESPLIEGUE.md: crear Hyperdrive **con caché desactivada**, crear el bucket R2, cargar secretos,
  migrar y sembrar Supabase, `npm run deploy` y comprobaciones; nota sobre el límite de CPU del plan
  gratuito.

## Complexity Tracking

Sin violaciones de la constitución.
