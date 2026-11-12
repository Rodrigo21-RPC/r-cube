---
description: "Lista de tareas de la feature 001 Tienda y compra"
---

# Tasks: Tienda y compra (R Cube)

**Input**: Documentos de diseño en `specs/001-tienda-compra/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Obligatorias por la constitución (principio VI, pruebas primero). En cada historia, las
tareas de prueba van antes de las de implementación y deben fallar antes de implementar. Cada título
de prueba empieza con su HU (por ejemplo, `HU-16: rechaza la tarjeta 4000…`).

**Organization**: Por historia de la spec (US1 a US7). Cada tarea nombra la HU, RN o RNF que cubre.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de la spec (US1 a US7)

## Path Conventions

Un solo paquete en la raíz: `src/shared`, `src/db`, `src/worker`, `src/web`, `tests/unit`, `tests/api`,
`e2e`, `drizzle`, `public` (ver plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inicializar el proyecto y la cadena de calidad

- [X] T001 Crear `package.json` (nombre `r-cube`, `"type": "module"`, `engines.node >=24`) e instalar
  las versiones fijadas en research.md R1: hono, better-auth, drizzle-orm, pg, zod, @hono/zod-validator,
  react, react-dom, react-router, @tanstack/react-query, react-hook-form, @hookform/resolvers, zustand;
  dev: typescript@~6.0, vite@8, @vitejs/plugin-react, @cloudflare/vite-plugin, wrangler,
  @cloudflare/workers-types, drizzle-kit, tsx, vitest@~4.1, @cloudflare/vitest-pool-workers,
  @playwright/test, tailwindcss@4, @tailwindcss/vite, eslint, typescript-eslint, prettier, @types/pg,
  @types/react, @types/react-dom (RNF-08)
- [X] T002 Crear `tsconfig.json` estricto (`strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`)
  con alias `@shared/*`, `@db/*`, `@worker/*`, `@web/*`, y `.nvmrc` con `24` (RNF-08)
- [X] T003 [P] Configurar `eslint.config.js` (typescript-eslint, reglas de React hooks) y
  `.prettierrc.json`, y el script `lint` (RNF-08)
- [X] T004 [P] Crear `docker-compose.yml` con `postgres:16` en el puerto `54329`, base `rcube`, usuario
  y contraseña locales de desarrollo, y volumen nombrado (RNF-08)
- [X] T005 [P] Crear `.env.example` con `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PUBLIC_URL`,
  `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD` sin valores, y documentar que `.dev.vars` usa los
  mismos nombres (RNF-05, RNF-10)
- [X] T006 Crear `wrangler.jsonc`: `name: "r-cube"`, `main: "src/worker/index.ts"`,
  `compatibility_flags: ["nodejs_compat"]`, `assets` con `not_found_handling:
  "single-page-application"` y `run_worker_first: ["/api/*"]`, binding `HYPERDRIVE` con
  `localConnectionString` hacia `postgres://…@localhost:54329/rcube`, binding R2 `FOTOS`
  (`bucket_name: "r-cube-fotos"`), `triggers.crons: ["0 * * * *"]`, `vars.PUBLIC_URL` (RNF-10)
- [X] T007 Crear `vite.config.ts` con `@vitejs/plugin-react`, `@tailwindcss/vite` y
  `cloudflare()` de `@cloudflare/vite-plugin`, más los alias de T002 (RNF-08, RNF-10)
- [X] T008 Crear `vitest.config.ts` con dos proyectos: `unit` (entorno Node, `tests/unit/**`) y `api`
  (`defineWorkersProject` de `@cloudflare/vitest-pool-workers`, `tests/api/**`, wrangler.jsonc,
  ejecución en serie, `BETTER_AUTH_SECRET` de prueba como binding) (R10, RNF-08)
- [X] T009 Crear `playwright.config.ts`: `webServer` con `npm run build && npm run preview` en el
  puerto 4173, `baseURL`, proyectos `claro` (`colorScheme: 'light'`) y `oscuro` (`colorScheme:
  'dark'`) con viewport móvil y de escritorio, reintentos 1 en CI (RNF-08, HU-25)
- [X] T010 Definir scripts en `package.json`: `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`),
  `lint`, `test` (vitest run), `test:api`, `test:e2e`, `check` (typecheck + lint + test),
  `db:generate`, `db:migrate`, `db:seed`, `deploy` (`npm run build && wrangler deploy`) (RNF-08, RNF-10)
- [X] T011 [P] Crear `.github/workflows/ci.yml`: Node 24, servicio `postgres:16` en 54329, `npm ci`,
  `npm run db:migrate`, `npm run check`, instalación de navegadores de Playwright, `npm run db:seed` y
  `npm run test:e2e` (RNF-08)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: reglas puras, esquema, conexión, autenticación base, API y shell de la web

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase

### Reglas puras (prueba primero)

- [X] T012 [P] Escribir `tests/unit/money.test.ts` (RN-14, RNF-01): `taxableBase(528800) === 448136`,
  `igv = total - base`, suma de líneas + envío − descuento (RN-04) y formato `formatPEN(528800) ===
  "S/ 5,288.00"`; debe fallar
- [X] T013 [P] Escribir `tests/unit/order-status.test.ts` (REQUISITOS §5, RN-11): todas las
  transiciones válidas e inválidas de data-model.md, incluido `preparing → delivered` solo con `pickup`,
  y `delivered`/`cancelled` finales; debe fallar
- [X] T014 Implementar `src/shared/money.ts` (céntimos, `taxableBase`, `igvOf`, `orderTotals`,
  `formatPEN` con `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })`) hasta pasar T012 (RN-04, RN-14)
- [X] T015 Implementar `src/shared/order-status.ts` (`OrderStatus`, etiquetas en español,
  `canTransition(from, to, deliveryMethod)`, `CANCELLABLE_BY_CUSTOMER`) hasta pasar T013 (RN-11, HU-24)
- [X] T016 [P] Escribir `tests/unit/search.test.ts` (HU-02): `normalizeSearch("Teléfono ÁPPLE") ===
  "telefono apple"` y `buildSearchText` une nombre, marca y descripción normalizados; debe fallar
- [X] T017 Implementar `src/shared/search.ts` (`normalizeSearch`, `buildSearchText`) hasta pasar T016
  (HU-02); lo usan el seed y el catálogo

### Datos

- [X] T018 Definir el esquema Drizzle en `src/db/schema.ts` según data-model.md: tablas de Better Auth
  con los campos extra de `user` (`role` `cliente|administrador` default `cliente`, `phone`,
  `address_line`, `district`, `address_reference`, `failed_login_count` default 0, `locked_until`,
  `blocked` default false), `category`, `brand`, `product` (`price_cents > 0`, `stock >= 0` con CHECK,
  `compare_at_cents` null, `specs` jsonb, `search_text`), `product_image`, `cart_item` (único
  `(user_id, product_id)`), `orders`, `order_item`, `payment`, `order_event`, `delivery_zone`,
  `store_settings`, la secuencia `order_number_seq` y los índices listados (RNF-07)
- [X] T019 Crear `drizzle.config.ts` (lee `DATABASE_URL`) y generar la primera migración en
  `drizzle/` con `npm run db:generate`; comprobar que `npm run db:migrate` la aplica sobre la base vacía
  de Docker (RNF-07, RNF-10)
- [X] T020 Implementar `src/db/client.ts`: `createDb(env)` que abre un `pg.Client` con
  `env.HYPERDRIVE.connectionString`, devuelve la instancia Drizzle y una función `close` para
  `ctx.waitUntil` (RNF-10, research R2)
- [X] T021 Crear `tests/api/helpers.ts`: reinicio de tablas (TRUNCATE … RESTART IDENTITY CASCADE),
  seed mínimo de prueba (2 categorías, 2 marcas, productos con stock 0, 3 y 10, 1 inactivo, 1 zona,
  configuración con los 4 métodos) y creación de clientes con sesión para las pruebas (RNF-08, research R10)

### API base

- [X] T022 Implementar `src/worker/middleware.ts`: manejador de errores con la forma
  `{ error: { code, message, fields? } }` de contracts/api.md, `secureHeaders()`, middleware de
  conexión por petición (T020) y `requireCustomer` (401 sin sesión, 403 si el rol no es `cliente`)
  (RNF-05)
- [X] T023 Implementar `src/worker/auth.ts`: Better Auth con adaptador Drizzle, `emailAndPassword`
  (mínimo 8 caracteres), sesión de 7 días, cookies HttpOnly/Secure/SameSite=Lax, campos extra `role`
  y `phone`, `rateLimit` con `storage: "database"`, y hash de contraseña PBKDF2-SHA256 con WebCrypto y
  sal aleatoria (R3, RNF-05)
- [X] T024 [P] Escribir `tests/api/smoke.test.ts` (RNF-10): `GET /api/health` responde 200
  `{ ok: true }` dentro de workerd tras `select 1` en la base de Docker (valida R2 y R10 antes de
  seguir); debe fallar
- [X] T025 Crear `src/worker/index.ts`: app Hono con `GET /api/health`, `/api/auth/*` montado sobre
  Better Auth, rutas vacías de catálogo, cuenta, carrito, checkout y pedidos, `export type AppType`,
  `export default { fetch, scheduled }`, hasta pasar T024 (RNF-10)

### Web base

- [X] T026 Crear `index.html` con el script en línea de tema (lee `localStorage.tema` o
  `prefers-color-scheme` y pone la clase `dark` en `<html>` antes de pintar) y la raíz de React (HU-25)
- [X] T027 Crear `src/web/styles.css` con Tailwind 4, `@custom-variant dark`, tokens de color como
  variables CSS en `:root` (colores de `docs/diseno/kallpa-DESIGN-comprador.md`: canvas #FFFFFF,
  surface #F5F5F7, texto #1D1D1F y #6E6E73, acento #0071E3) y en `.dark` (fondo #0B0B0F, tarjetas
  #17171C, bordes #2A2A31, texto #F5F5F7 y #A1A1AA, mismo acento), fuente Inter y radios del diseño
  (principio X, RNF-02)
- [X] T028 Inicializar shadcn/ui (button, input, label, select, checkbox, radio-group, dialog, sheet,
  badge, skeleton, toast/sonner, pagination) en `src/web/components/ui/` usando los tokens de T027
  (RNF-02, RNF-03)
- [X] T029 Crear `src/web/main.tsx`, `src/web/router.tsx` (rutas `/`, `/catalogo`, `/producto/:slug`,
  `/carrito`, `/checkout`, `/pedido/:number/confirmacion`, `/ingresar`, `/registro`, `/cuenta`,
  `/pedidos`, `/pedidos/:number`, `*`) con carga diferida por ruta, y `src/web/api.ts` con
  `hc<AppType>` y `QueryClient` (RNF-02, RNF-04)
- [X] T030 [P] Crear `src/web/components/States.tsx` (carga con esqueletos, vacío con acción, error
  con «Reintentar») y `src/web/components/Price.tsx` (usa `formatPEN`, precio anterior tachado)
  (RNF-02, principio IX)
- [X] T031 Crear `src/web/components/Layout.tsx` y `Header.tsx` con el logo R Cube
  (`public/img/logo.png` copiado de `docs/fotos/r-cube-logo-oficial.png`), buscador, enlace a cuenta,
  icono de carrito con lugar para el contador y lugar para el interruptor de tema; navegación usable
  con teclado y foco visible (RNF-03)

### Datos de demostración

- [X] T032 Copiar las fotos de `docs/fotos/` a `public/img/productos/` y crear `public/img/generico.svg`
  (imagen genérica para tablets y productos sin foto) (REQUISITOS §6)
- [X] T033 Implementar `src/db/seed.ts` (repetible: borra y vuelve a crear): 4 categorías (Celulares,
  Laptops, Tablets, Accesorios y repuestos), 6 marcas o más, al menos 24 productos activos con sus
  fotos, specs y `search_text`, al menos 1 inactivo, algunos con `compare_at_cents` mayor que el
  precio, stock 0 y de 1 a 5 en algunos, 1 administrador y 5 clientes (contraseñas desde
  `SEED_ADMIN_PASSWORD` y `SEED_CUSTOMER_PASSWORD`), 8 pedidos en distintos estados con líneas, pagos
  y eventos coherentes, 3 zonas de delivery, configuración de la tienda con los 4 métodos activos;
  ajusta `order_number_seq` al último número (FR-035, FR-036)
- [X] T034 Escribir `tests/api/seed.test.ts` (FR-035, FR-036): tras correr el seed hay ≥ 24 productos
  activos, ≥ 1 inactivo, 4 categorías con esos nombres, ≥ 6 marcas, 1 administrador, 5 clientes, 8
  pedidos en al menos 4 estados distintos, 3 zonas, configuración con los 4 métodos, productos con
  stock 0, de 1 a 5 y con precio anterior; y correrlo dos veces da el mismo resultado

**Checkpoint**: base lista; las historias pueden empezar

---

## Phase 3: User Story 1 - Descubrir productos en el catálogo (Priority: P1) 🎯 MVP

**Goal**: catálogo paginado con búsqueda, filtros, orden y detalle (HU-01 a HU-05)

**Independent Test**: con el seed, buscar «iphone», filtrar Celulares y un rango, ordenar por precio,
recargar y abrir un detalle con «Quedan N» o «Agotado»

### Tests for User Story 1 ⚠️

- [X] T035 [P] [US1] Escribir `tests/api/catalog.test.ts` (HU-01 a HU-05): 12 por página; inactivos
  ocultos; búsqueda sin mayúsculas ni tildes en nombre, marca y descripción; filtros combinados;
  los 4 órdenes estables al paginar; página fuera de rango → última válida; detalle con
  `availability` `low` (stock 3), `out` (stock 0) y 404 para inactivo; deben fallar

### Implementation for User Story 1

- [X] T036 [US1] Implementar `src/worker/routes/catalog.ts`: `GET /products` (ILIKE sobre
  `search_text`, filtros, orden `relevance|price_asc|price_desc|newest` con `CASE` de relevancia y
  desempate por `created_at desc, id`), `GET /products/:slug`, `GET /facets`, validados con Zod, hasta
  pasar T035 (HU-01 a HU-05)
- [X] T037 [P] [US1] Crear `src/web/components/ProductCard.tsx` (foto con `loading="lazy"`, ancho y
  alto, alt; nombre; `Price`; disponibilidad) (HU-01, RNF-04)
- [X] T038 [US1] Crear `src/web/pages/Catalog.tsx` con búsqueda, `Filters.tsx` (categoría, marca,
  rango, solo disponibles), etiquetas removibles, «Limpiar filtros», orden y paginación sincronizados
  con `useSearchParams`, texto «N resultados para "…"» y estados de carga, vacío y error (HU-01 a
  HU-04)
- [X] T039 [US1] Crear `src/web/pages/Product.tsx` con galería accesible, marca, precio con IGV,
  descripción, tabla de specs, «Quedan N»/«Agotado» y botón «Agregar al carrito» deshabilitado si
  está agotado (el botón se conecta en US2) (HU-05)
- [X] T040 [P] [US1] Escribir `e2e/catalogo.spec.ts` (HU-01 a HU-05): buscar, filtrar, ordenar,
  recargar y ver detalle con «Agotado»

**Checkpoint**: US1 funciona sola

---

## Phase 4: User Story 7 - Tema claro y oscuro (Priority: P1)

**Goal**: interruptor de dos estados en todas las pantallas, sin parpadeo (HU-25)

**Independent Test**: sistema en oscuro → tienda oscura; cambiar a claro y recargar → clara sin destello

### Tests for User Story 7 ⚠️

- [X] T041 [P] [US7] Escribir `e2e/tema.spec.ts` (HU-25): `colorScheme: 'dark'` abre en oscuro; el
  interruptor cambia a claro; tras recargar sigue en claro y la clase `dark` no aparece en ningún
  momento de la carga; debe fallar

### Implementation for User Story 7

- [X] T042 [US7] Crear `src/web/theme/ThemeToggle.tsx` (botón con `aria-pressed` y etiqueta «Tema
  oscuro»/«Tema claro», guarda `localStorage.tema`, cambia la clase de `<html>`) y colocarlo en
  `Header.tsx` hasta pasar T041 (HU-25)
- [X] T043 [US7] Revisar contraste AA de los tokens de T027 en ambos temas (texto, bordes de campos,
  foco, acento sobre fondo oscuro) y ajustar las variables si algún par no llega a 4.5:1 (HU-25,
  RNF-03)

**Checkpoint**: tema operativo en todo lo construido

---

## Phase 5: User Story 3 - Cuenta del cliente (Priority: P1)

**Goal**: registro, inicio y cierre de sesión con bloqueo, perfil y cambio de contraseña (HU-07 a
HU-10)

**Independent Test**: registrar, editar perfil, cambiar contraseña, cerrar y volver a entrar

### Tests for User Story 3 ⚠️

- [X] T044 [P] [US3] Escribir `tests/api/auth.test.ts` (HU-07, HU-08, HU-10): registro con correo
  único y contraseña ≥ 8; correo repetido → error de campo; credenciales inválidas → mensaje genérico;
  5 fallos → 423 `LOCKED` 15 minutos aunque la contraseña sea correcta; acceso correcto reinicia el
  contador; usuario `blocked` no inicia sesión (RN-08); cambio de contraseña con la actual cierra las
  demás sesiones; la contraseña nunca se guarda en texto plano; la sesión vence a los 7 días y la
  cookie es HttpOnly, Secure y SameSite=Lax (FR-011); deben fallar
- [X] T045 [P] [US3] Escribir `tests/api/account.test.ts` (HU-09): `GET/PATCH /api/account/me` edita
  nombre, teléfono y dirección; ignora o rechaza `email`; 401 sin sesión; deben fallar

### Implementation for User Story 3

- [X] T046 [US3] Agregar a `src/worker/auth.ts` los hooks de bloqueo (`failed_login_count`,
  `locked_until` = ahora + 15 min al quinto fallo, reinicio al acertar, rechazo de `blocked`) y la
  respuesta 423 con mensaje en español hasta pasar T044 (HU-08, RN-08)
- [X] T047 [US3] Implementar `src/worker/routes/account.ts` (`GET`/`PATCH /me` con Zod: nombre 2 a 80,
  teléfono de 9 dígitos que empieza con 9, dirección, distrito y referencia) hasta pasar T045 (HU-09)
- [X] T048 [P] [US3] Crear `src/web/pages/Register.tsx` y `Login.tsx` con React Hook Form + Zod,
  errores por campo, mensaje genérico y mensaje de bloqueo, y redirección a la página de origen
  (`?volver=`) (HU-07, HU-08)
- [X] T049 [US3] Crear `src/web/pages/Account.tsx` con perfil (correo solo lectura, confirmación al
  guardar), cambio de contraseña y «Cerrar sesión»; hook `useSession` en `src/web/auth.ts` (HU-08 a
  HU-10)

**Checkpoint**: cuentas funcionando

---

## Phase 6: User Story 2 - Armar el carrito (Priority: P1)

**Goal**: carrito persistente, fusión al iniciar sesión y avisos de cambios (HU-11 a HU-13)

**Independent Test**: agregar dos productos, recargar, iniciar sesión y ver la fusión

### Tests for User Story 2 ⚠️

- [X] T050 [P] [US2] Escribir `tests/api/cart.test.ts` (HU-11 a HU-13, RN-01): `quote` limita la
  cantidad al stock, recalcula precios del servidor e ignora precios enviados, devuelve avisos
  `price_changed`, `stock_reduced`, `unavailable` y totales con base e IGV; `merge` suma cantidades
  (A×1 + A×2 = A×3) limitando al stock; `PUT`/`DELETE` del carrito de cuenta; deben fallar

### Implementation for User Story 2

- [X] T051 [US2] Implementar `src/worker/services/pricing.ts` (`quoteCart(db, items)` con precios y
  stock vigentes, avisos y `orderTotals`) hasta pasar la parte de `quote` de T050 (HU-11, HU-13)
- [X] T052 [US2] Implementar `src/worker/routes/cart.ts` (`POST /quote`, `GET /`, `PUT`/`DELETE
  /items/:productId`, `POST /merge`) sobre `cart_item` hasta pasar T050 (HU-11, HU-12)
- [X] T053 [US2] Crear `src/web/stores/cart.ts` (Zustand `persist` con solo `productId` y `quantity`)
  y `src/web/cart/useCart.ts` que usa la tienda local para visitantes y la API para clientes, fusiona al
  iniciar sesión y al terminar el registro, y vacía el carrito local al cerrar sesión (HU-12)
- [X] T054 [US2] Conectar «Agregar al carrito» en `Product.tsx` y el contador del `Header.tsx` (HU-11)
- [X] T055 [US2] Crear `src/web/pages/Cart.tsx`: líneas con cantidad limitada al stock, quitar, subtotal
  por línea, desglose (subtotal, base imponible, IGV, total), avisos de cambios, líneas no disponibles
  marcadas y estado vacío con enlace al catálogo (HU-11, HU-13, RNF-02)

**Checkpoint**: carrito completo

---

## Phase 7: User Story 4 - Checkout y pago (Priority: P1)

**Goal**: entrega, 4 métodos simulados, pedido en una transacción, confirmación y vencimiento a las
24 h (HU-14 a HU-18, HU-20, HU-21, RN-01 a RN-07, RN-11 a RN-14)

**Independent Test**: comprar con 4111… (Pagado) y con Yape (Pendiente de pago), y ver el stock
descontado

### Tests for User Story 4 ⚠️

- [X] T056 [P] [US4] Escribir `tests/unit/luhn.test.ts` (HU-16): 4111 1111 1111 1111 y 4000 0000 0000
  0002 válidos por Luhn, 4111 1111 1111 1112 inválido, espacios ignorados; debe fallar
- [ ] T057 [P] [US4] Escribir `tests/unit/payments.test.ts` (HU-16): simulador `approved` para 4111…,
  `rejected` para 4000…0002, `unrecognized` para otro número válido, vencimiento pasado y CVV distinto
  de 3 dígitos inválidos; el resultado solo expone `last4`; debe fallar
- [ ] T058 [P] [US4] Escribir `tests/unit/whatsapp.test.ts` (HU-20): el mensaje incluye N.º, productos,
  cantidades, total en S/, método y entrega, y el enlace es `https://wa.me/<número>?text=<codificado>`;
  debe fallar
- [ ] T059 [P] [US4] Escribir `tests/api/checkout.test.ts` (HU-14 a HU-21, RN-01 a RN-07): sin sesión
  401 y administrador 403; recojo con envío 0; delivery suma la zona y exige nombre, teléfono, dirección
  y distrito; tarjeta 4111 → 201 `paid` con `card_last4 = "1111"` y sin número completo ni CVV en la
  base; tarjeta 4000…0002 → 402 sin pedido ni cambio de stock; Yape sin código o con código fuera de 6 a
  12 dígitos → 400; Yape, transferencia y WhatsApp → `pending_payment`; WhatsApp devuelve
  `whatsappUrl`; método desactivado → 400; zona de delivery desactivada → 400 con aviso de elegir otra;
  número `RC-000001` correlativo; totales y desglose RN-14;
  `expectedTotalCents` distinto → 409 `PRICE_CHANGED`; precio del navegador ignorado; carrito vacío
  tras crear; dos compras simultáneas de la última unidad → una 201 y otra 409 `STOCK` (RN-02); deben
  fallar
- [ ] T060 [P] [US4] Escribir `tests/api/expire.test.ts` (RN-12): un pedido `pending_payment` de hace
  25 h pasa a `cancelled` con motivo «Pago no recibido en 24 h» y actor `sistema`, el stock vuelve; uno
  de hace 23 h no cambia; ejecutar dos veces no devuelve el stock dos veces; debe fallar

### Implementation for User Story 4

- [ ] T061 [US4] Implementar `src/shared/luhn.ts` hasta pasar T056 (HU-16)
- [ ] T062 [US4] Implementar `src/worker/services/payments.ts` (simulador de tarjeta sin guardar ni
  registrar número ni CVV) hasta pasar T057 (HU-16, RNF-06)
- [ ] T063 [US4] Implementar `src/shared/whatsapp.ts` hasta pasar T058 (HU-20)
- [ ] T064 [US4] Implementar `src/worker/services/orders.ts`: `createOrder` (pago con tarjeta decidido
  antes de la transacción; en la transacción, UPDATE condicional de stock por línea, `nextval` para el
  número, pedido, líneas con nombre y precio congelados, pago, primer evento, vaciado de `cart_item`)
  y `cancelOrder(db, order, actor, reason)` que devuelve el stock con
  `UPDATE … WHERE status IN (...)` (RN-02, RN-03, RN-07, RN-10)
- [ ] T065 [US4] Implementar `src/worker/routes/checkout.ts` (`GET /options`, `POST /orders` con el
  esquema Zod de contracts/api.md) hasta pasar T059 (HU-14 a HU-21)
- [ ] T066 [US4] Implementar `src/worker/cron.ts` (`expirePendingOrders`, usa `cancelOrder` con actor
  `sistema`) y conectarlo al `scheduled` de `src/worker/index.ts` hasta pasar T060 (RN-12)
- [ ] T067 [US4] Crear `src/web/pages/Checkout.tsx`: paso de entrega (recojo con dirección de tienda o
  delivery con zonas y dirección precargada del perfil), paso de pago con los métodos activos (tarjeta
  con validación Luhn, vencimiento y CVV en el cliente; Yape o Plin con QR, número y código;
  transferencia con datos de cuenta y monto; WhatsApp), aviso «Pago simulado, no se cobra dinero real»,
  resumen con desglose, manejo de 402, 409 `STOCK` y 409 `PRICE_CHANGED`, y redirección a inicio de
  sesión si no hay sesión; mensaje para administradores (HU-14 a HU-18, HU-20)
- [ ] T068 [US4] Crear `src/web/pages/Confirmation.tsx`: N.º, productos, subtotal, IGV, envío, total,
  método, entrega, siguientes pasos, aviso de 24 h si está pendiente y botón «Abrir WhatsApp» que
  abre `whatsappUrl` (HU-20, HU-21)
- [ ] T069 [P] [US4] Escribir `e2e/compra.spec.ts` (HU-11 a HU-21): visitante agrega productos,
  se registra, paga con 4111 con delivery y llega a la confirmación con `RC-…` en Pagado; luego un
  rechazo con 4000…0002 sin pedido; luego una compra con Yape en Pendiente de pago; al cerrar sesión
  el carrito del navegador queda vacío y al volver a entrar reaparece el de la cuenta (HU-12)

**Checkpoint**: compra completa de extremo a extremo

---

## Phase 8: User Story 5 - Mis pedidos (Priority: P2)

**Goal**: lista, detalle con línea de tiempo y cancelación (HU-22 a HU-24)

**Independent Test**: con un cliente del seed, ver la lista, abrir un pedido y cancelar uno Pagado

### Tests for User Story 5 ⚠️

- [ ] T070 [P] [US5] Escribir `tests/api/orders.test.ts` (HU-22 a HU-24, RN-08, RN-10): lista solo
  propia y del más nuevo al más antiguo; pedido ajeno → 404; detalle con precio congelado aunque el
  producto cambie de precio o se desactive (RN-06, RN-07), `cardLast4` y eventos; cancelar en
  `pending_payment`, `paid` o `preparing` con motivo devuelve stock y agrega evento; cancelar
  `shipped`, `delivered` o `cancelled` → 409 `INVALID_TRANSITION`; motivo `otro` exige detalle; deben
  fallar

### Implementation for User Story 5

- [ ] T071 [US5] Implementar `src/worker/routes/orders.ts` (`GET /`, `GET /:number`,
  `POST /:number/cancel` con `cancelOrder` y actor `cliente`) hasta pasar T070 (HU-22 a HU-24)
- [ ] T072 [P] [US5] Crear `src/web/pages/Orders.tsx` (lista con N.º, fecha, total y estado con
  insignia; estado vacío; paginación) (HU-22)
- [ ] T073 [US5] Crear `src/web/pages/OrderDetail.tsx` (productos, desglose, pago con últimos 4
  dígitos, entrega, línea de tiempo con fecha, hora, autor y motivo, y diálogo «Cancelar pedido» con la
  lista de motivos y confirmación, visible solo en estados cancelables) (HU-23, HU-24)

**Checkpoint**: seguimiento de pedidos completo

---

## Phase 9: User Story 6 - Página de inicio (Priority: P2)

**Goal**: portada con categorías, ofertas, más vendidos y novedades (HU-06)

**Independent Test**: abrir `/` con el seed y ver las 4 secciones con enlaces correctos

### Tests for User Story 6 ⚠️

- [ ] T074 [P] [US6] Escribir `tests/api/home.test.ts` (HU-06): `GET /api/catalog/home` devuelve
  categorías activas, ofertas solo con `compare_at_cents > price_cents`, más vendidos por unidades en
  pedidos no cancelados (desempate por novedad) y novedades por `created_at`, sin inactivos; debe
  fallar

### Implementation for User Story 6

- [ ] T075 [US6] Implementar `GET /home` en `src/worker/routes/catalog.ts` hasta pasar T074 (HU-06)
- [ ] T076 [US6] Crear `src/web/pages/Home.tsx` con las 4 secciones (carriles desplazables en móvil,
  rejilla en escritorio), tarjetas al detalle y categorías al catálogo filtrado (HU-06)

**Checkpoint**: todas las historias de la 001 funcionan

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T077 [P] Crear `public/_headers` con CSP (`default-src 'self'`, `img-src 'self' data:`, hash del
  script de tema en `script-src`, `frame-ancestors 'none'`), `X-Content-Type-Options`,
  `Referrer-Policy` y `Permissions-Policy` (RNF-05)
- [ ] T078 [P] Crear `src/web/pages/NotFound.tsx` y revisar que todas las páginas tengan estados de
  carga, vacío y error y `<title>` propio (RNF-02)
- [ ] T079 Revisar accesibilidad: etiquetas de formularios, foco visible, orden de tabulación, textos
  alternativos, `aria-live` para avisos del carrito y del checkout; agregar `@axe-core/playwright` en
  `e2e/accesibilidad.spec.ts` sobre portada, catálogo, detalle, carrito y checkout en ambos temas
  (RNF-03, SC-006)
- [ ] T080 Revisar rendimiento del catálogo: imágenes con tamaño y `loading="lazy"`, división de código
  por ruta y tiempo de carga con la red móvil simulada de Playwright; con un script
  `scripts/seed-volumen.ts` que genera 1 000 productos en la base de Docker, medir que la consulta del
  catálogo con búsqueda y filtros responde en menos de 300 ms (RNF-04, SC-003, SC-008)
- [ ] T081 Escribir `DESPLIEGUE.md`: variables y secretos (`BETTER_AUTH_SECRET`, `PUBLIC_URL`,
  `DATABASE_URL` solo para migrar y sembrar), crear Hyperdrive **con caché desactivada**, crear el bucket
  R2 `r-cube-fotos`, actualizar los IDs en `wrangler.jsonc`, `npm run db:migrate` y `npm run db:seed`
  contra Supabase, `npm run deploy`, comprobaciones (tienda, compra con 4111, cron) y la nota del límite
  de CPU del plan gratuito (RNF-10)
- [ ] T082 Crear `README.md` del proyecto (qué es, cómo arrancar, cómo probar, enlace a DESPLIEGUE.md),
  sin menciones de herramientas de IA (RNF-10)
- [ ] T083 Actualizar `specs/README.md` con el estado de la 001 (RNF-09)
- [ ] T084 Ejecutar `npm run check` y `npm run test:e2e` y recorrer quickstart.md en tema claro y
  oscuro; corregir contra la spec lo que falle (SC-005)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → historias → **Polish (10)**.
- T024 (smoke de API en workerd con Postgres) valida los riesgos R2 y R10; si falla, se aplica el
  respaldo de research.md antes de seguir.

### User Story Dependencies

- **US1 Catálogo**: solo Foundational.
- **US7 Tema**: solo Foundational (usa el Header de T031).
- **US3 Cuenta**: solo Foundational.
- **US2 Carrito**: US1 (botón en el detalle) y US3 (fusión al iniciar sesión).
- **US4 Checkout**: US2 y US3.
- **US5 Mis pedidos**: US4 (`cancelOrder`) o los pedidos del seed.
- **US6 Inicio**: US1 (`ProductCard`).

### Within Each User Story

Pruebas (deben fallar) → reglas puras → servicios → rutas → páginas → e2e.

### Parallel Opportunities

- Setup: T003, T004, T005, T011.
- Foundational: T012 y T013; T024 y T030.
- Tras Foundational: US1, US7 y US3 en paralelo.
- Dentro de US4: T056 a T060 en paralelo.

---

## Parallel Example: User Story 4

```text
Task: "Escribir tests/unit/luhn.test.ts (HU-16)"
Task: "Escribir tests/unit/payments.test.ts (HU-16)"
Task: "Escribir tests/unit/whatsapp.test.ts (HU-20)"
Task: "Escribir tests/api/checkout.test.ts (HU-14 a HU-21)"
Task: "Escribir tests/api/expire.test.ts (RN-12)"
```

---

## Implementation Strategy

### MVP First

Setup → Foundational → US1 (catálogo navegable con datos de demostración) → validar.

### Incremental Delivery

US1 → US7 → US3 → US2 → US4 (compra completa) → US5 → US6 → Polish. Commit al cerrar cada fase.

---

## Notes

- 84 tareas. Cada prueba falla antes de implementar (principio VI).
- Nada de Express, SQLite ni módulos nativos (principio VIII).
- Ningún secreto en el repositorio; `.env` y `.dev.vars` están en `.gitignore`.
