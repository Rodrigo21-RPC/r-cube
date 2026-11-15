# Research: Administración (002)

Fecha: 2026-11-15. El stack y las decisiones base son los de `specs/001-tienda-compra/research.md`
(Vite 7, React, Hono en un Worker, PostgreSQL con postgres.js, Drizzle y Hyperdrive, Better Auth,
Vitest con `@cloudflare/vitest-plugin`, Playwright). Aquí solo lo nuevo.

## A1. Protección del panel

- **Decision**: middleware `requireAdmin` en `/api/admin/*` (401 sin sesión, 403 si el rol no es
  `administrador`), montado una sola vez sobre el sub-router `adminRoutes`. En la web, `/admin/*` usa un
  layout propio que consulta `/api/account/me` y muestra la pantalla de ingreso o «sin permiso».
- **Rationale**: un único punto de control en el servidor (FR-002); la web solo mejora la experiencia.
- **Alternatives considered**: comprobar el rol en cada ruta (fácil de olvidar en una ruta nueva).

## A2. Fotos en R2 (HU-31)

- **Decision**: `POST /api/admin/products/:id/images` con `multipart/form-data`. El Worker verifica el
  tamaño (≤ 2 MB) y el tipo real por los primeros bytes (JPG `FF D8 FF`, PNG `89 50 4E 47`, WebP
  `RIFF....WEBP`), no por la extensión ni el `Content-Type`. Clave `productos/<productId>/<uuid>.<ext>`
  en el binding `FOTOS`. Se sirven por `GET /api/media/<clave>` (público, `Cache-Control` de 1 año e
  `immutable`, porque la clave nunca se reutiliza). `product_image.url` guarda `/api/media/<clave>` y
  `r2_key` la clave; las fotos de demostración tienen `r2_key = null`.
- **Rationale**: un solo Worker sirve todo, sin dominio público de R2 ni CORS; validar los bytes evita
  archivos disfrazados (edge case de la spec). Borrar una foto subida también borra el objeto de R2.
- **Pruebas**: el plugin de Vitest emula R2 en local a partir de `wrangler.jsonc`.
- **Alternatives considered**: URL prefirmada de subida directa a R2 (más piezas y credenciales S3);
  dominio público de R2 (configuración extra en Cloudflare).

## A3. Historial de stock (HU-33, FR-011 a FR-013)

- **Decision**: tabla `stock_movement`. Todo cambio de stock pasa por un servicio
  `applyStockChange(tx, …)` que hace el `UPDATE` condicional (`stock + delta >= 0`) y luego inserta el
  movimiento con stock anterior y nuevo, en la misma transacción. `createOrder` y `cancelOrder` de la 001
  se modifican para registrar sus movimientos (origen `venta` y `cancelacion`, con el N.º de pedido).
- **Rationale**: el historial y el stock no se pueden desincronizar (RNF-07).
- **Alternatives considered**: un trigger de Postgres (no conoce el autor ni el motivo).

## A4. Auditoría (HU-42, FR-025)

- **Decision**: tabla `audit_log` con `actor_user_id`, `action` (enum de tipos), `entity_type`,
  `entity_id`, `entity_label`, `detail` (texto legible en español) y `data` (jsonb con antes y después).
  Un helper `audit(tx, actor, …)` se llama dentro de la misma transacción de cada acción del panel. No hay
  rutas para editarla ni borrarla.
- **Rationale**: si la acción se revierte, su auditoría también (sin registros fantasma).

## A5. Cambios de estado concurrentes (FR-017)

- **Decision**: el cliente envía `expectedStatus`; el servidor hace
  `UPDATE orders SET status = :to WHERE id = :id AND status = :expected` dentro de la transacción y
  responde 409 `STATE_CHANGED` si no actualiza ninguna fila. Las cancelaciones reutilizan `cancelOrder` de
  la 001 (ya bloquea la fila con `FOR UPDATE`). `canTransition` valida el destino.
- **Rationale**: evita que dos administradores (o el vencimiento automático) pisen el mismo pedido.

## A6. Resumen y gráfico (HU-27)

- **Decision**: una sola ruta `GET /api/admin/summary` con consultas agregadas en SQL. Los días se agrupan
  con `(created_at AT TIME ZONE 'America/Lima')::date` y se completan los días sin ventas con
  `generate_series`. El gráfico de barras se dibuja con SVG propio (30 barras, sin librería), siguiendo la
  guía de visualización de datos del proyecto (ejes claros, valores accesibles en una tabla oculta para
  lectores de pantalla).
- **Rationale**: 30 puntos no justifican una librería de gráficos (principio I).
- **Alternatives considered**: Recharts o Chart.js (≈ 100 kB más en el panel).

## A7. Exportación CSV (HU-37)

- **Decision**: `GET /api/admin/orders/export.csv` con los mismos parámetros de filtro que la lista;
  máximo 10 000 filas (si hay más, 422 `TOO_MANY_ROWS` y la web pide acotar). UTF-8 con BOM, separador
  coma, comillas dobles para campos con coma, comillas o saltos de línea. La función de formato vive en
  `src/shared/csv.ts` con prueba unitaria.

## A8. Bloqueo de clientes (HU-40)

- **Decision**: `blocked = true` y borrado de las filas de `session` del cliente en la misma transacción;
  el inicio de sesión ya rechaza a los bloqueados desde la 001 (403 `BLOCKED`). No se permite bloquear a
  un administrador.

## A9. Validaciones de configuración (HU-41)

- **Decision**: WhatsApp `^51\d{9}$`; Yape y Plin `^9\d{8}$`; CCI `^\d{20}$`; cuenta de 10 a 20 dígitos y
  guiones; costo de zona entero en céntimos ≥ 0; `enabled_methods` con al menos un método.
