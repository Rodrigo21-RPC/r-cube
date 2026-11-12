# R Cube

Tienda en línea de dispositivos electrónicos (un solo vendedor, tipo Amazon) con módulo de
tienda, módulo de administración y pagos simulados (tarjeta, Yape o Plin, transferencia y
WhatsApp). Español de Perú, soles con IGV incluido.

## Stack
- TypeScript estricto. Web: React + Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query,
  React Hook Form + Zod, Zustand (carrito del visitante). Tema claro y oscuro con variables CSS.
- API: Hono sobre Cloudflare Workers; cliente web tipado con los tipos de `src/shared/types.ts`. Un solo Worker sirve la web
  (static assets) y la API; `@cloudflare/vite-plugin` en desarrollo.
- Datos: PostgreSQL en Supabase, driver postgres.js, Drizzle ORM + drizzle-kit (migraciones), Hyperdrive.
- Auth: Better Auth con roles `cliente` y `administrador`. Fotos subidas: Cloudflare R2.
- Pruebas: Vitest (`@cloudflare/vitest-plugin` para la API) y Playwright, contra Postgres
  en Docker. Calidad: ESLint, Prettier, CI en GitHub Actions (Node 24 LTS).

## Comandos
- `npm install` · `docker compose up -d` (Postgres de pruebas) · `npm run dev`
- `npm run check` (tipos, lint y pruebas) · `npm run test:e2e`
- `npm run db:migrate` · `npm run db:seed` · despliegue: `npx wrangler deploy` (ver DESPLIEGUE.md)

## Convenciones
- Dinero siempre en céntimos enteros; se formatea a S/ solo al mostrar.
- El servidor calcula precios y totales; pedido, pago y stock en una sola transacción.
- Cada prueba y cada tarea nombra su HU-xx. Prueba primero, luego código.
- Código en inglés (nombres), textos de la interfaz en español.
- Secretos solo en `.env` (en .gitignore) y secretos de Wrangler; `.env.example` sin valores.
- Ramas por feature `NNN-nombre`; merge a `main` con `--no-ff`.
- Nunca agregar firmas ni menciones de IA (Co-Authored-By, "Generated with Claude Code") en
  commits, README ni descripciones del repositorio.

Las reglas de producto viven en .specify/memory/constitution.md, los requisitos y las historias de usuario en docs/requisitos/ y el estado del producto en specs/README.md
