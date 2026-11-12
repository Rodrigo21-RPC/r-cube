# Research: Tienda y compra (001)

Fecha: 2026-11-12. Versiones consultadas en npm ese día.

## R1. Versiones y compatibilidad

- **Decision**: TypeScript 6.0.x; Vitest 4.1.x; `@cloudflare/vitest-pool-workers` 0.23; Vite 8;
  `@cloudflare/vite-plugin` 1.69; Wrangler 4.161; Hono 4.13; Better Auth 1.7; Drizzle ORM 0.45 y
  drizzle-kit 0.31; `pg` 8.23; React 19; React Router 8 (modo librería, SPA); TanStack Query 5;
  Tailwind CSS 4; Zustand 5; Zod 4; React Hook Form 7; Playwright 1.65; ESLint 10.
- **Rationale**: `vitest-pool-workers` pide `vitest ^4.1` (no la 5) y `typescript-eslint` pide
  `typescript <6.1` (no la 7). El plugin de Vite acepta Vite 8 con Wrangler ≥4.160.
- **Alternatives considered**: TypeScript 7 y Vitest 5 (más nuevos, pero rompen esas dos piezas).

## R2. Conexión a PostgreSQL desde el Worker

- **Decision** (revisada en implement, 2026-11-12): driver `postgres` (postgres.js) con
  `drizzle-orm/postgres-js`, flag `nodejs_compat`, una conexión nueva por petición usando
  `env.HYPERDRIVE.connectionString`, cerrada con `ctx.waitUntil(sql.end())`.
- **Rationale**: es uno de los dos drivers que Cloudflare documenta para Hyperdrive; es ESM puro y
  tiene una entrada `workerd`, así que funciona igual en producción y en las pruebas con
  `@cloudflare/vitest-plugin`. La primera elección, `pg`, falló en las pruebas: su `require` interno
  de `pg-cloudflare` resolvía a un módulo vacío dentro del runner («CloudflareSocket is not a
  constructor»). Drizzle soporta transacciones interactivas con postgres.js.
- **Nota**: `@cloudflare/vitest-pool-workers` (R1) se renombró a `@cloudflare/vitest-plugin`; se usa
  el nuevo nombre.
- **Riesgo y mitigación**: Hyperdrive guarda en caché las consultas de lectura por defecto. Eso puede
  mostrar stock o precios viejos, así que la configuración de Hyperdrive **debe crearse con la caché
  desactivada** (queda en DESPLIEGUE.md). Respaldo si Hyperdrive falla: conectar con el pooler de
  Supabase en modo transacción (puerto 6543) usando la misma variable.
- **Alternatives considered**: `postgres` (postgres.js), igual de válido pero con menos ejemplos en
  Better Auth; Supabase JS/PostgREST (sin transacciones interactivas, incumple RN-02).

## R2b. Cliente tipado de la web (revisado en implement)

- **Decision**: los tipos de cada respuesta viven en `src/shared/types.ts` y los usan tanto las rutas
  Hono como el cliente `apiFetch<T>` de la web.
- **Rationale**: `hc<AppType>` obliga a compilar el código del Worker (tipos del runtime de Workers)
  junto con la web (tipos del DOM), que chocan en una misma compilación. Los tipos compartidos dan el
  mismo control en compilación con menos piezas (principio I).

## R3. Autenticación con Better Auth en Workers

- **Decision**: Better Auth con adaptador Drizzle, `emailAndPassword`, sesión de 7 días, cookie
  HttpOnly, Secure y SameSite=Lax, campos extra `role` (`cliente` o `administrador`) y `phone`, rate
  limit con almacenamiento `database`, y `revokeOtherSessions` al cambiar la contraseña. La instancia se
  crea por petición (necesita la conexión de esa petición).
- **Bloqueo tras 5 intentos (HU-08)**: Better Auth no lo trae; se implementa con columnas
  `failed_login_count` y `locked_until` en `user` y un hook `before`/`after` sobre `/sign-in/email`: si
  `locked_until > now()` se responde con el mensaje de bloqueo; cada fallo suma 1 y al quinto fija
  `locked_until = now() + 15 min`; un acceso correcto pone el contador en 0.
- **Hash de contraseñas**: el hash por defecto (scrypt en JavaScript) consume mucha CPU, y el plan
  gratuito de Workers limita la CPU a 10 ms por petición. Se configura un hash propio con PBKDF2-SHA256
  de WebCrypto (nativo) y sal aleatoria, con el número de iteraciones como constante. La prueba de API
  mide el registro y el inicio de sesión; si en producción se supera el límite, la opción es el plan
  Workers Paid (decisión de Rodrigo, anotada en DESPLIEGUE.md).
- **Respaldo**: si Better Auth no funciona en Workers con Hyperdrive, sesión propia con cookie firmada
  (HMAC de WebCrypto) y tabla `session`, con el mismo contrato de API.

## R4. Integridad del pedido (RN-02, RNF-07)

- **Decision**: una transacción de Drizzle que, por cada línea, ejecuta
  `UPDATE product SET stock = stock - :q WHERE id = :id AND active AND stock >= :q RETURNING price`;
  si alguna no devuelve fila, se revierte todo y se responde 409 con las líneas sin stock. Luego inserta
  pedido (con `nextval('order_number_seq')`), líneas, pago y primer evento.
- **Rationale**: el UPDATE condicional bloquea la fila y resuelve la carrera por la última unidad sin
  `SELECT ... FOR UPDATE` aparte. El pago con tarjeta rechazado se decide **antes** de abrir la
  transacción, así que no crea nada.
- **Alternatives considered**: reserva de stock aparte (más complejo, sin historia que lo pida).

## R5. Dinero e IGV (RN-04, RN-14)

- **Decision**: enteros en céntimos (`integer`). `base = Math.round(total / 1.18)` e
  `igv = total - base`, calculados una vez sobre el total del pedido. Formato con
  `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })`, que da «S/ 5,288.00».
- **Rationale**: evita errores de coma flotante y deja el desglose cuadrado al céntimo.

## R6. Búsqueda sin tildes ni mayúsculas (HU-02)

- **Decision**: columna `search_text` en `product`, que la aplicación llena con nombre, marca y
  descripción en minúsculas y sin diacríticos (`normalize('NFD')`); la consulta normaliza el término
  igual y usa `ILIKE '%término%'`. La relevancia se ordena con un `CASE` (coincide en nombre, luego
  marca, luego descripción) y después por fecha de alta.
- **Rationale**: con hasta 1 000 productos (SC-008) basta, sin extensiones de Postgres. Si se
  necesitara, un índice `pg_trgm` se agrega con una migración.
- **Alternatives considered**: extensión `unaccent` (no es inmutable para columnas generadas y
  complica las pruebas); búsqueda de texto completo (excesiva para el alcance).

## R7. Carrito (HU-11 a HU-13)

- **Decision**: el visitante guarda `[{productId, quantity}]` con Zustand `persist` en localStorage;
  nunca guarda precios. `POST /api/cart/quote` devuelve precios vigentes, stock, avisos y totales. Con
  sesión, el carrito vive en `cart_item`; al iniciar sesión, `POST /api/cart/merge` suma cantidades y
  las limita al stock; al cerrar sesión se vacía el carrito local.
- **Variantes futuras (003)**: `cart_item` y `order_item` tienen ya clave propia (`id`), así que la 003
  agrega `variant_id` opcional con una migración sin rehacer tablas.

## R8. Vencimiento a las 24 h (RN-12)

- **Decision**: Cron Trigger `0 * * * *` en el mismo Worker (`scheduled`), que cancela en una
  transacción los pedidos `pending_payment` con `created_at < now() - interval '24 hours'`, devuelve
  stock y escribe el evento con autor «Sistema». La cancelación usa
  `UPDATE ... WHERE status = 'pending_payment'`, así una carrera con una cancelación del cliente solo
  gana una vez.

## R9. Tema claro y oscuro sin parpadeo (HU-25)

- **Decision**: script en línea en `index.html`, antes del CSS, que lee `localStorage['tema']` (o
  `prefers-color-scheme` si no hay) y pone la clase `dark` en `<html>`; tokens de color como variables
  CSS en `:root` y `.dark`; Tailwind 4 con `@custom-variant dark`. Los colores del tema claro salen de
  `kallpa-DESIGN-comprador.md` y los del oscuro de la guía.

## R10. Pruebas

- **Decision**:
  - `tests/unit`: Vitest en Node para reglas puras (dinero, IGV, Luhn, transiciones, mensaje de
    WhatsApp, normalización de búsqueda).
  - `tests/api`: Vitest con `@cloudflare/vitest-pool-workers` y la app Hono real dentro de workerd;
    Hyperdrive con `localConnectionString` hacia Postgres 16 en Docker (puerto 54329). Cada archivo
    reinicia los datos con un seed mínimo y se ejecuta en serie.
  - `e2e`: Playwright contra `vite build` y `vite preview` (que ejecuta el Worker en workerd), con la
    base de Docker sembrada con los datos de demostración.
  - CI: GitHub Actions con Node 24 y servicio `postgres:16`.
- **Rationale**: prueba en el mismo runtime que producción, sin tocar Supabase.

## R11. Cabeceras y seguridad (RNF-05)

- **Decision**: `secureHeaders()` de Hono en `/api/*` y un archivo `public/_headers` para las páginas
  estáticas (CSP `default-src 'self'`, `img-src 'self' data:`, el hash del script de tema en
  `script-src`, `frame-ancestors 'none'`). Validación con Zod en cada ruta (`@hono/zod-validator`).
  Las rutas de cuenta y pedidos exigen sesión de cliente.

## R12. Fotos de demostración

- **Decision**: las fotos de `docs/fotos` se copian a `public/img/productos/` y se sirven como estáticas;
  `public/img/generico.svg` sirve para tablets y productos sin foto. R2 queda configurado en
  `wrangler.jsonc` (binding `FOTOS`) para la 002, sin uso en esta feature.
