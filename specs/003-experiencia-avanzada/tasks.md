---
description: "Lista de tareas de la feature 003 Experiencia avanzada"
---

# Tasks: Experiencia avanzada (R Cube)

**Input**: Documentos de diseño en `specs/003-experiencia-avanzada/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Obligatorias por la constitución (principio VI). En cada historia la prueba va primero y
debe fallar antes de implementar. Cada título de prueba empieza con su HU.

**Organization**: Por historia de la spec (US1 a US11). Cada tarea nombra la HU, RN, RNF o FR que cubre.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mismo paquete que las features 001 y 002: `src/shared`, `src/db`, `src/worker`, `src/web`, `tests/unit`,
`tests/api`, `e2e`, `drizzle`.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Agregar a `src/db/schema.ts` las tablas `product_variant`, `favorite`, `review`, `address`,
  `coupon` y `notification` y las columnas nuevas de `product`, `cart_item`, `order_item`, `orders` y
  `stock_movement`, exactamente como en data-model.md: `product_variant.sku` único de 3 a 40 caracteres
  en mayúsculas, `color`/`storage`/`ram` texto no nulo con `''` por defecto y máx. 40, `price_cents > 0`,
  `stock >= 0`, `CHECK product_variant_has_attribute`, índice único `(product_id, color, storage, ram)`;
  `review.rating` 1 a 5, `comment` ≤ 1000, índice único `(product_id, user_id)`; `address` con índice
  único parcial `(user_id) WHERE is_default`; `coupon.code` único, `kind` `percent|fixed`, `value` 1 a 90
  si `percent` y `>= 100` si `fixed`, `ends_on >= starts_on`, `max_uses >= 1`, `used_count >= 0`;
  `notification` con índice `(user_id, read_at, created_at desc)`; `product.has_variants` boolean false y
  `max_price_cents` null; `cart_item.variant_id` con índice único `(user_id, product_id,
  coalesce(variant_id, ''))` en lugar del actual; `order_item.variant_id`, `variant_label`, `sku`;
  `orders.coupon_id`, `coupon_code`; `stock_movement.variant_id`. Agregar `variante`, `cupon`,
  `resena_oculta` y `resena_visible` a `AUDIT_ACTIONS` (HU-43 a HU-53, RN-07, RN-14)
- [X] T002 Generar la migración con `npm run db:generate`, renombrarla `drizzle/0003_experiencia_avanzada.sql`
  (y su entrada en `drizzle/meta/_journal.json`), agregar al final el `INSERT INTO address` que copia la
  dirección única de cada `"user"` con `address_line IS NOT NULL` como primera dirección predeterminada
  (`label = 'Principal'`, destinatario = nombre del usuario, `phone` = teléfono del usuario o `''`,
  `is_default = true`) y aplicarla con `npm run db:migrate`; en la misma tarea, adaptar el `upsert` de `src/worker/routes/cart.ts` al nuevo índice
  único de expresión (`INSERT … ON CONFLICT (user_id, product_id, (coalesce(variant_id,''))) DO UPDATE` con
  SQL de Drizzle) sin cambiar su comportamiento, para que las pruebas de la 001 sigan en verde en este
  commit (RNF-07, RNF-10, FR-019, FR-037, HU-48)
- [X] T003 [P] Ampliar `src/shared/types.ts` según contracts/api.md: `ProductCard.hasVariants` y
  `maxPriceCents`; `ProductDetail.variants`; `CartLine.variantId/variantLabel/sku`; `CartWarning.type`
  con `"choose_variant"` y `"coupon"`; `CartQuote.coupon` y `couponError`; `OrderDetail.couponCode` y
  líneas con `variantLabel` y `sku`; tipos `Review`, `ReviewsPage`, `Address`, `Notification`,
  `NotificationsSummary`, `Receipt` y `CheckoutOptions.addresses` (HU-43 a HU-53)
- [X] T004 [P] Ampliar `src/shared/admin-types.ts` con `AdminVariant`, `AdminCoupon`, `AdminReview`, los
  campos `hasVariants`, `maxPriceCents` y `variants` de `AdminProductRow`/`AdminProduct`,
  `couponCode` y `discountCents` de `AdminOrderDetail`, y las etiquetas de `AUDIT_LABEL` para
  `variante`, `cupon`, `resena_oculta` y `resena_visible` (HU-43, HU-47, HU-50)
- [X] T005 [P] Ampliar `tests/api/helpers.ts`: agregar `product_variant, favorite, review, address, coupon,
  notification` al `TRUNCATE` de `resetDb`; helpers `makeVariants(productId, defs)` (inserta variantes y
  ejecuta `syncProductFromVariants`), `placeOrder(cookie, items, opts)` (carrito + `POST
  /checkout/orders` con transferencia o tarjeta `4111 1111 1111 1111`), `deliverOrder(number)`
  (pone el pedido en `delivered` por SQL) y `ids.variants` con una variante de prueba por producto
  (HU-43 a HU-53)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase

- [X] T006 [P] Escribir `tests/unit/coupon.test.ts` (HU-49, RN-04, RN-14): `couponDiscount` de porcentaje
  redondea al céntimo (10 % de S/ 2,999.00 = 29990 céntimos, 15 % de 33333 = 5000), de monto fijo
  descuenta el valor, el descuento se limita a `subtotal − 100` (nunca deja menos de S/ 1.00), nunca es
  negativo ni mayor que el subtotal y no toca el envío; `couponStatus` devuelve `inactive`, `exhausted`,
  `expired` y `active` en ese orden de prioridad con fechas de Lima; mensajes de `COUPON_*` exactos;
  debe fallar
- [X] T007 [P] Escribir `tests/unit/variant.test.ts` (HU-43, HU-44): `variantLabel` ordena almacenamiento,
  color y RAM («256 GB · Azul · 8 GB RAM») y omite los vacíos; `priceRangeText` devuelve «S/ a a S/ b» o un
  solo precio si coinciden; debe fallar
- [X] T008 Implementar `src/shared/coupon.ts` (`couponDiscount`, `couponStatus`, `COUPON_MESSAGES`) y
  `src/shared/variant.ts` (`variantLabel`, `priceRangeText`) hasta pasar T006 y T007 (HU-43, HU-49)
- [X] T009 [P] Escribir `tests/api/variants-service.test.ts` (HU-43, FR-003, FR-004, invariantes 1 y 2):
  `syncProductFromVariants` deja `product.stock` = suma del stock de las variantes activas,
  `price_cents` = menor precio de las activas (de todas si ninguna está activa), `max_price_cents` = mayor
  precio de las activas y `has_variants` = existe alguna variante; sin variantes no toca el producto;
  `applyStockChange` con `variantId` actualiza la variante con `UPDATE` condicional (`stock + delta >= 0`),
  registra el movimiento con `variant_id` y con stock anterior y nuevo de la variante y sincroniza el
  producto; un descuento que dejaría la variante en negativo responde 409 `NEGATIVE_STOCK` sin cambiar
  nada; dos descuentos simultáneos de variantes del mismo producto dejan `product.stock` correcto; debe
  fallar
- [X] T010 Implementar `src/worker/services/variants.ts` (`syncProductFromVariants(tx, productId)` y
  `lockProduct(tx, productId)` con `SELECT … FOR UPDATE`) y extender `src/worker/services/stock.ts`
  (`StockChange.variantId?`; con variante bloquea el producto, actualiza `product_variant`, llama a
  `syncProductFromVariants` y registra el movimiento con `variant_id`) hasta pasar T009; las pruebas de
  stock de la 002 deben seguir pasando (HU-43, FR-004, RN-01, RN-02)

**Checkpoint**: la base de variantes (esquema, utilidades y stock) está lista.

---

## Phase 3: User Story 1 - Definir variantes de un producto (Priority: P1)

**Goal**: el administrador agrega, edita, desactiva y borra variantes con SKU, precio, stock y foto.

**Independent Test**: agregar 3 variantes a un celular y ver rango de precios y stock total en la lista del panel.

- [X] T011 [US1] Escribir `tests/api/admin/variants.test.ts` (HU-43, FR-001 a FR-004): crear variante → 201
  con movimiento `inicial`; SKU repetido → 409 `DUPLICATE_SKU` con error en el campo `sku`; misma
  combinación de atributos → 409 `DUPLICATE_COMBINATION`; sin ningún atributo, `priceCents <= 0` o
  `stock < 0` → 400 por campo; la variante 21 → 409 `TOO_MANY_VARIANTS`; `imageId` de otro producto →
  400; la primera variante de un producto con stock propio registra antes un movimiento `ajuste` de
  `-stock` y deja el producto en el resumen de sus variantes; `GET /products` y `GET /products/:id`
  devuelven `hasVariants`, `maxPriceCents` y `variants`; editar (`PATCH /variants/:id`) cambia precio,
  stock no; crear, editar, desactivar y borrar una variante escriben auditoría `variante` con antes y
  después (FR-034); desactivar saca la variante del stock total;
  `DELETE` de una variante nunca vendida → 204 y de una vendida → 409 `VARIANT_SOLD`;
  `POST /products/:id/stock-adjustments` con `variantId` registra el movimiento con su variante y sin
  `variantId` en un producto con variantes → 400 `VARIANT_REQUIRED`; `GET /products/:id/stock-movements`
  incluye `variantLabel`; el `lowStock` del resumen cuenta cada variante activa con 5 unidades o menos
  (clarificación 3); debe fallar
- [X] T012 [US1] Crear `src/worker/routes/admin/variants.ts` (`GET /products/:id/variants`, `POST
  /products/:id/variants`, `PATCH /variants/:id`, `DELETE /variants/:id`) con validación Zod (SKU en
  mayúsculas), auditoría en la misma transacción y `syncProductFromVariants`, y montarlo en
  `src/worker/routes/admin/index.ts` hasta pasar T011 (HU-43, FR-001, FR-002, FR-034)
- [X] T013 [US1] Ampliar `src/worker/routes/admin/products.ts` (`hasVariants`, `maxPriceCents`, `variants`
  en lista y detalle; el `PATCH /products/:id` no cambia precio ni stock cuando `has_variants`),
  `src/worker/routes/admin/stock.ts` (`variantId`, `VARIANT_REQUIRED`, `variantLabel` en movimientos) y
  `src/worker/routes/admin/summary.ts` (`lowStock` por variante con producto y variante) hasta pasar
  T011 (HU-43, FR-003, FR-004)
- [X] T014 [US1] Crear `src/web/admin/pages/ProductVariants.tsx` (tabla de variantes con SKU, atributos,
  precio, stock y estado; diálogo de alta y edición con campos SKU, color, almacenamiento, RAM, precio,
  stock inicial, foto del producto y activo; desactivar, borrar con confirmación y «Ajustar stock» por
  variante) e integrarlo en `src/web/admin/pages/ProductForm.tsx` (con variantes, los campos de precio y
  stock del producto se muestran deshabilitados con la nota «Se definen en las variantes»);
  `src/web/admin/pages/Products.tsx` muestra el rango de precios y «N variantes» (HU-43, FR-001,
  FR-035)

**Checkpoint**: HU-43 completa y comprobable en el panel.

---

## Phase 4: User Story 2 - Elegir la variante y comprarla (Priority: P1)

**Goal**: el cliente elige variante en el detalle, la guarda en el carrito y la compra con su precio.

**Independent Test**: elegir «256 GB Azul», agregar, pagar con tarjeta y ver la variante y su precio en el pedido.

- [X] T015 [US2] Escribir `tests/api/variants-cart.test.ts` (HU-44, FR-005 a FR-008, RN-01, RN-02, RN-07):
  el detalle devuelve solo las variantes activas con `label`, precio y disponibilidad; `PUT
  /cart/items/:productId` con `variantId` valida pertenencia y stock de la variante (409 `STOCK`) y sin
  `variantId` en un producto con variantes → 400 `VARIANT_REQUIRED`; la misma variante suma cantidades y
  variantes distintas son líneas distintas; `POST /cart/merge` y `POST /cart/quote` aceptan `variantId`;
  una línea heredada sin variante de un producto que ahora tiene variantes sale no disponible con el aviso
  `choose_variant` y el checkout la rechaza sin descontar stock (clarificación 1); aviso de cambio de precio
  y de agotado por variante; el checkout crea `order_item` con `variant_id`, `variant_label`, `sku` y el
  precio de la variante, descuenta el stock de la variante y sincroniza el producto, con movimiento `venta`
  con `variant_id`; cancelar devuelve el stock a la variante (`cancelacion`); el detalle del pedido muestra
  `variantLabel` y `sku` y no cambia si la variante cambia después; un producto sin variantes funciona
  exactamente como antes; el filtro y el orden por precio del catálogo usan el precio «desde» y las
  tarjetas traen `hasVariants` y `maxPriceCents` (clarificación 2); concurrencia: dos checkouts a la vez
  por la última unidad de una variante → uno 201 y el otro 409 `STOCK` y el stock queda en 0, sin
  negativos (SC-004); debe fallar
- [X] T016 [US2] Extender `src/worker/services/pricing.ts`: `RequestedItem.variantId`, clave de fusión
  `productId:variantId`, precio, stock y disponibilidad de la variante activa, `variantLabel`, `sku`,
  aviso `choose_variant` para líneas sin variante de productos con variantes (HU-44, FR-006)
- [X] T017 [US2] Extender `src/worker/routes/cart.ts`: `variantId` en `PUT`, `DELETE` (`?variantId=`) y
  `merge`; alta con `INSERT … ON CONFLICT (user_id, product_id, (coalesce(variant_id,''))) DO UPDATE`
  (SQL de Drizzle); `VARIANT_REQUIRED`, pertenencia y stock de la variante; `seen_price_cents` de la
  variante (HU-44, FR-006, RN-01)
- [X] T018 [US2] Extender `src/worker/services/orders.ts` y `src/worker/routes/checkout.ts`: `NewOrder.lines`
  con `variantId`, `variantLabel` y `sku`; en `createOrder`, las líneas con variante descuentan con
  `UPDATE product_variant … WHERE stock >= n AND active` bajo `lockProduct`, comparan el precio y llaman
  a `syncProductFromVariants`; `cancelOrder` devuelve el stock con `applyStockChange({ variantId })`;
  `loadOrderDetail` y `loadAdminOrder` (`src/worker/routes/admin/orders.ts`) incluyen `variantLabel` y
  `sku` por línea; el checkout rechaza cualquier aviso distinto de
  cambio de precio (incluido `choose_variant`) hasta pasar T015 (HU-44, FR-007, RN-02, RN-07)
- [X] T019 [US2] Extender `src/worker/routes/catalog.ts`: `cardColumns` con `hasVariants` y
  `max_price_cents`, `toCard` con `maxPriceCents` (solo si `hasVariants` y es mayor que el precio) y el
  detalle con `variants` activas ordenadas por precio y SKU, con `imageUrl` (la foto elegida o la principal)
  hasta pasar T015 (HU-44, FR-003, FR-005)
- [X] T020 [US2] Actualizar `src/web/stores/cart.ts` (línea `{ productId, variantId?, quantity,
  seenPriceCents? }`, clave `productId:variantId`, versión 2 del almacén persistido con migración que deja
  las líneas existentes sin variante), `src/web/cart/useCart.ts` (`variantId` en `add`, `setQuantity`,
  `remove`, `quantityOf` y fusión al iniciar sesión) y `src/web/cart/AddToCart.tsx` (recibe la variante y
  su stock) (HU-44, FR-006)
- [X] T021 [US2] Crear `src/web/components/VariantPicker.tsx` (grupo de botones `radio` por atributo con
  `aria-checked`, agotados deshabilitados con el texto «Agotado», operable con teclado) y
  `src/web/components/PriceRange.tsx`; integrarlos en `src/web/pages/Product.tsx` (al elegir cambian
  precio, foto y disponibilidad sin recargar; «Agregar al carrito» exige variante con el mensaje «Elige
  color, almacenamiento o RAM») y en `src/web/components/ProductCard.tsx` (rango de precios) (HU-44,
  FR-005, RNF-03)
- [X] T022 [US2] Mostrar la variante en `src/web/pages/Cart.tsx` (nombre de la variante, línea separada por
  variante y «Elige una variante» con enlace al detalle que bloquea «Pagar»), `src/web/pages/Checkout.tsx`,
  `src/web/pages/OrderDetail.tsx`, `src/web/pages/Confirmation.tsx` y `src/web/admin/pages/OrderDetail.tsx`
  (variante y SKU por línea) (HU-44, FR-007)
- [X] T023 [US2] Ampliar `src/db/seed-data.ts` con variantes en 3 productos (elegir productos que ningún
  e2e existente use: verificar con `grep` en `e2e/`), 3 variantes cada uno con SKU, precios y stock
  distintos, una agotada y una con foto propia, movimientos `inicial` por variante y
  `syncProductFromVariants` al final; `seedStockHistory()` debe seguir sumando el stock actual (FR-036,
  invariante 8)

**Checkpoint**: HU-43 y HU-44 completas: se pueden definir y comprar variantes.

---

## Phase 5: User Story 3 - Calificar y reseñar productos comprados (Priority: P1)

**Goal**: el cliente que recibió un producto lo califica y ve promedio y reseñas.

**Independent Test**: con un pedido Entregado, reseñar con 4 estrellas, ver promedio y cantidad, y no poder repetir.

- [X] T024 [US3] Escribir `tests/api/reviews.test.ts` (HU-46, RN-09, FR-012 a FR-014, SC-003): `POST
  /catalog/products/:slug/reviews` con el producto en un pedido Entregado → 201; en cualquier otro estado
  o sin compra → 403 `NOT_DELIVERED`; segunda reseña del mismo producto → 409 `ALREADY_REVIEWED`
  (también si el producto se compró en dos pedidos o en distintas variantes); dos envíos simultáneos →
  uno 201 y otro 409; `rating` fuera de 1 a 5 o `comment` de más de 1000 caracteres → 400 por campo;
  comentario opcional y recortado; sin sesión → 401; `GET` público devuelve `average` con un decimal y
  `count` solo de reseñas visibles, páginas de 5 de la más nueva a la más antigua, `authorName`
  abreviado («Mateo Q.»), `average: null` sin reseñas, y con sesión `mine` (incluso oculta) y `canReview`
  con motivo; el comentario se devuelve como texto sin interpretar HTML; debe fallar
- [X] T025 [US3] Crear `src/worker/routes/reviews.ts` (`GET` y `POST /products/:slug/reviews`, elegibilidad con
  `EXISTS` sobre `order_item` y `orders.status = 'delivered'`, `INSERT` con índice único) y montarlo en
  `src/worker/index.ts` bajo `/catalog` hasta pasar T024 (HU-46, RN-09, FR-012, FR-013)
- [X] T026 [US3] Crear `src/web/components/StarRating.tsx` (vista de solo lectura y entrada como `radiogroup`
  de 5 `radio` operable con flechas, etiqueta «Calificación: N de 5») y `src/web/components/Reviews.tsx`
  (promedio y cantidad, lista paginada de 5 en 5, formulario «Calificar este producto» con comentario
  opcional y contador, estado vacío «Aún no hay reseñas», mensaje de por qué no puede reseñar) e integrarlo
  en `src/web/pages/Product.tsx` (HU-46, FR-014, RNF-03)
- [X] T027 [US3] Ampliar `src/db/seed-data.ts` con 2 reseñas de clientes con pedidos Entregados (una oculta; solo hay 3 productos entregados en los 8 pedidos fijos de la 001) y
  asegurar un cliente de demostración con un pedido Entregado sin reseña para el e2e (FR-036, HU-46)

**Checkpoint**: HU-46 completa.

---

## Phase 6: User Story 4 - Moderar reseñas desde el panel (Priority: P2)

**Goal**: el administrador oculta y muestra reseñas con auditoría.

**Independent Test**: ocultar una reseña, ver que sale del detalle y del promedio, mostrarla y ver la auditoría.

- [X] T028 [US4] Escribir `tests/api/admin/reviews.test.ts` (HU-47, FR-015): `GET /reviews` con filtro por
  estado (`visible|hidden`), búsqueda por producto y páginas de 20; `POST /reviews/:id/hide` y `/show`
  cambian el estado, escriben auditoría `resena_oculta` y `resena_visible`, son idempotentes (sin segunda
  entrada si no cambia); una reseña oculta sale de la lista pública y del promedio y de la cantidad;
  su autor sigue viendo `mine` y no puede reseñar de nuevo (409); un cliente recibe 403; debe fallar
- [X] T029 [US4] Crear `src/worker/routes/admin/reviews.ts` y montarlo en `src/worker/routes/admin/index.ts`
  hasta pasar T028 (HU-47, FR-015, FR-034)
- [X] T030 [US4] Crear `src/web/admin/pages/Reviews.tsx` (tabla con producto, cliente, estrellas, comentario,
  fecha y estado, filtro, búsqueda, paginación, botón Ocultar/Mostrar con confirmación), agregar la ruta en
  `src/web/admin/routes.tsx` y «Reseñas» al menú de `src/web/admin/AdminLayout.tsx` (HU-47, FR-035)

**Checkpoint**: HU-47 completa.

---

## Phase 7: User Story 5 - Lista de favoritos (Priority: P2)

**Goal**: guardar productos con un corazón y verlos en «Mis favoritos».

**Independent Test**: marcar 3 productos, abrir «Mis favoritos», pasar uno al carrito y recargar.

- [X] T031 [US5] Escribir `tests/api/favorites.test.ts` (HU-45, FR-009, FR-010): `PUT /favorites/:productId`
  idempotente (204 dos veces, una sola fila) y `DELETE` idempotente; `GET /favorites/ids`; `GET
  /favorites` devuelve tarjetas con `available` (inactivo y sin stock → `false`, incluidos); cada cliente
  ve solo los suyos; producto inexistente → 404; sin sesión → 401; la lista persiste entre sesiones; debe fallar
- [X] T032 [US5] Crear `src/worker/routes/favorites.ts` y montarlo en `src/worker/index.ts` bajo `/favorites`
  con `requireCustomer` hasta pasar T031 (HU-45, FR-009)
- [X] T033 [US5] Crear `src/web/components/FavoriteButton.tsx` (botón con `aria-pressed` y nombre «Agregar a
  favoritos» o «Quitar de favoritos», estado optimista con TanStack Query y `GET /favorites/ids`; el visitante
  va a `/ingresar?volver=<ruta>&favorito=<id>`), integrarlo en `src/web/components/ProductCard.tsx` y
  `src/web/pages/Product.tsx`, y hacer que `src/web/pages/Login.tsx` y `src/web/pages/Register.tsx` guarden
  el favorito pendiente tras iniciar sesión antes de volver (HU-45, FR-011, RNF-03)
- [X] T034 [US5] Crear `src/web/pages/Favorites.tsx` (tarjetas con foto, precio y disponibilidad; «Agregar al
  carrito» o «Elegir variante» si `hasVariants`; «Quitar»; «No disponible» o «Agotado» sin botón; estados de
  carga, vacío «Aún no tienes favoritos» y error), la ruta `/favoritos` en `src/web/router.tsx` el
  icono de corazón «Mis favoritos» en `src/web/components/Header.tsx` junto al carrito (solo clientes) y el
  enlace «Mis favoritos» en `src/web/pages/Account.tsx` (HU-45, FR-010)
- [X] T035 [US5] Ampliar `src/db/seed-data.ts` con 2 a 3 favoritos por cliente de demostración, incluido un
  producto agotado o inactivo (FR-036, HU-45)

**Checkpoint**: HU-45 completa.

---

## Phase 8: User Story 6 - Varias direcciones de entrega (Priority: P2)

**Goal**: guardar direcciones, elegir la predeterminada y usarlas en el checkout.

**Independent Test**: crear dos direcciones, predeterminar la segunda y comprar eligiendo la primera.

- [X] T036 [US6] Escribir `tests/api/addresses.test.ts` (HU-48, FR-016 a FR-019, FR-033): `POST /account/addresses`
  valida `label` de 2 a 40, `recipientName` de 2 a 80, `phone` de 9 dígitos que empieza con 9, `line` de 5
  a 160, `district` de 2 a 80 y `reference` ≤ 160 con error por campo; la primera queda predeterminada;
  `POST /account/addresses/:id/default` deja una sola predeterminada; borrar la predeterminada promueve la
  más reciente y borrar la única deja la lista vacía; la dirección 11 → 409 `TOO_MANY_ADDRESSES`; la
  dirección de otro cliente → 404; `GET /account/me` devuelve la dirección predeterminada y `PATCH
  /account/me` la escribe (la crea como «Principal» si no existe) sin cambiar el contrato de la 001;
  `POST /checkout/orders` con `delivery.addressId` congela los datos en el pedido y editar o borrar la
  dirección después no cambia el pedido; `addressId` inexistente o ajeno → 400 con error en
  `delivery.addressId`; sin `addressId` funciona la dirección escrita a mano; `GET /checkout/options`
  devuelve `addresses` con la predeterminada primero; debe fallar
- [X] T037 [US6] Crear `src/worker/services/addresses.ts` (tope de 10, predeterminada única en transacción,
  promoción al borrar) y ampliar `src/worker/routes/account.ts` con `GET/POST /addresses`, `PATCH
  /addresses/:id`, `POST /addresses/:id/default` y `DELETE /addresses/:id`, y con `/me` leyendo y
  escribiendo la dirección predeterminada hasta pasar T036 y `tests/api/account.test.ts` sin cambios
  (HU-48, FR-016, FR-017, FR-019)
- [X] T038 [US6] Extender `src/worker/routes/checkout.ts` con `delivery.addressId` (carga la dirección del
  cliente y congela sus datos) y `addresses` en `GET /options`; actualizar `src/web/pages/Checkout.tsx` con
  la lista de direcciones guardadas (la predeterminada viene elegida), la opción «Otra dirección» sin
  guardar y el mensaje si la dirección ya no existe (HU-48, FR-018)
- [X] T039 [US6] Crear `src/web/pages/Addresses.tsx` (lista con la predeterminada marcada, diálogo de alta y
  edición con errores por campo, «Marcar como predeterminada», borrar con confirmación, estado vacío con
  «Agregar dirección»), la ruta `/cuenta/direcciones` en `src/web/router.tsx` y un enlace «Mis direcciones»
  en `src/web/pages/Account.tsx` (HU-48, FR-016, FR-035)
- [X] T040 [US6] Ampliar `src/db/seed-data.ts` con 2 direcciones (una predeterminada) para 2 clientes de
  demostración y mantener a los demás con una (FR-036, HU-48)

**Checkpoint**: HU-48 completa.

---

## Phase 9: User Story 7 - Administrar cupones (Priority: P2)

**Goal**: el administrador crea, edita, activa, desactiva y borra cupones.

**Independent Test**: crear `BIENVENIDO10`, verlo en la lista, desactivarlo y reactivarlo, y ver la auditoría.

- [X] T041 [US7] Escribir `tests/api/admin/coupons.test.ts` (HU-50, FR-020, FR-025, FR-033): `POST /coupons` valida
  `code` de 3 a 20 caracteres `[A-Z0-9-]` (se guarda en mayúsculas), `kind` y `value` (porcentaje de 1 a 90,
  monto fijo desde 100 céntimos), `startsOn`, `endsOn >= startsOn` y `maxUses >= 1` con error por campo; código
  repetido (sin distinguir mayúsculas) → 409 `DUPLICATE_CODE` en el campo `code`; `GET /coupons` calcula
  `status` `active|inactive|expired|exhausted` con fechas de Lima y páginas de 20; `PATCH` cambia
  valor, vigencia, usos máximos y estado solo para usos futuros (un pedido ya hecho conserva su descuento);
  cambiar el código de un cupón con `usedCount > 0` → 409 `COUPON_USED`; `maxUses < usedCount` → 400 con
  «El cupón ya lleva N usos»; `DELETE` sin usos → 204 y con usos → 409 `COUPON_USED`; cada alta, cambio,
  activación y baja escribe auditoría `cupon`; un cliente recibe 403; debe fallar
- [X] T042 [US7] Crear `src/worker/services/coupons.ts` (`couponStatusSql` con `America/Lima`) y
  `src/worker/routes/admin/coupons.ts` y montarlo en `src/worker/routes/admin/index.ts` hasta pasar T041
  (HU-50, FR-020, FR-025, FR-034)
- [X] T043 [US7] Crear `src/web/admin/pages/Coupons.tsx` (tabla con código, tipo y valor, vigencia, usos
  «usados de máximos» y estado con insignia; diálogo de alta y edición con errores por campo; activar,
  desactivar y borrar con confirmación; estado vacío «Aún no hay cupones»), agregar la ruta en
  `src/web/admin/routes.tsx` y «Cupones» al menú de `src/web/admin/AdminLayout.tsx` (HU-50, FR-035)

**Checkpoint**: HU-50 completa.

---

## Phase 10: User Story 8 - Aplicar un cupón al comprar (Priority: P2)

**Goal**: el cliente aplica un cupón y el descuento aparece en el desglose, el pedido y el comprobante.

**Independent Test**: aplicar `BIENVENIDO10` a un producto de S/ 2,999.00, ver S/ 299.90 de descuento y pagar.

- [X] T044 [US8] Escribir `tests/api/coupons.test.ts` (HU-49, FR-021 a FR-024, SC-002, RN-02, RN-04, RN-14):
  `GET /cart?coupon=` y `POST /cart/quote` con cupón válido devuelven `coupon` y `totals.discountCents`
  con base imponible + IGV = total; porcentaje redondeado al céntimo; monto fijo; el descuento no baja el
  total de productos de S/ 1.00; el envío no se descuenta; `couponError` con `COUPON_NOT_FOUND`,
  `COUPON_INACTIVE`, `COUPON_NOT_STARTED`, `COUPON_EXPIRED` y `COUPON_EXHAUSTED` y su mensaje exacto sin
  cambiar el total; código sin distinguir mayúsculas; el visitante ignora el cupón; `POST /checkout/orders`
  con `couponCode` y `expectedTotalCents` con descuento crea el pedido con `coupon_code`, `discount_cents` y
  `used_count + 1` en la misma transacción (si el pedido falla por stock o precio, `used_count` no cambia);
  un cupón inválido al pagar → 409 con su `code` y no crea pedido; concurrencia: dos checkouts por el
  último uso → uno 201 y otro 409 `COUPON_EXHAUSTED`, `used_count = max_uses` (SC-004); cancelar por el cliente,
  por rechazo de pago, por el administrador y por vencimiento a las 24 h devuelve el uso; un solo cupón por
  pedido; el pedido conserva código y descuento si el cupón cambia después; el detalle de pedido del panel
  muestra `couponCode` y `discountCents` y el CSV de pedidos no cambia; debe fallar
- [X] T045 [US8] Implementar en `src/worker/services/coupons.ts` `validateCoupon`, `redeemCoupon(tx, …)` (`UPDATE
  coupon SET used_count = used_count + 1 WHERE … AND used_count < max_uses AND starts_on <= hoy AND ends_on >=
  hoy`) y `releaseCoupon(tx, orderId)`; extender `src/worker/services/pricing.ts` (`quoteCart(db, items, {
  couponCode })` con `coupon`, `couponError` y descuento vía `couponDiscount`), `src/worker/routes/cart.ts`
  (`?coupon=` y cuerpo `coupon`), `src/worker/services/orders.ts` (`createOrder` canjea y guarda el cupón;
  `cancelOrder` lo devuelve; `loadOrderDetail` con `couponCode`), `loadAdminOrder` de `src/worker/routes/admin/orders.ts` con
  `couponCode` y `discountCents` en el desglose y `src/worker/routes/checkout.ts`
  (`couponCode`, revalidación y `expectedTotalCents` con descuento) hasta pasar T044 (HU-49, FR-021, FR-022,
  FR-023, FR-024, RN-02)
- [X] T046 [US8] Crear `src/web/stores/coupon.ts` (código pendiente persistido, `rcube-cupon`) y
  `src/web/components/CouponBox.tsx` (campo, «Aplicar», «Quitar», mensajes de error por código, aviso al
  visitante «Inicia sesión para aplicar tu cupón»); integrarlos en `src/web/pages/Cart.tsx` y
  `src/web/pages/Checkout.tsx`, pasar el cupón desde `src/web/cart/useCart.ts`, mostrar la línea «Cupón
  CÓDIGO» en negativo en `src/web/components/TotalsBox.tsx`, `src/web/pages/OrderDetail.tsx`,
  `src/web/pages/Confirmation.tsx` y `src/web/admin/pages/OrderDetail.tsx` (HU-49, FR-021, FR-022,
  RN-04)
- [X] T047 [US8] Ampliar `src/db/seed-data.ts` con 3 cupones: `BIENVENIDO10` (10 %, vigente, 50 usos),
  `VERANO5` (S/ 5.00, vencido) y `ULTIMO` (10 %, 1 uso, agotado por un pedido de demostración que lo
  usa: aplicarlo a un pedido existente no cancelado recalculando sus totales con `orderTotals`, sin crear
  pedidos nuevos para no alterar los 8 de la 001; verificar con `grep` que ninguna prueba depende de ese
  total); `used_count` coincide con los pedidos no cancelados con cupón (FR-036, invariante 5)

**Checkpoint**: HU-49 completa; cupones de punta a punta.

---

## Phase 11: User Story 9 - Productos relacionados (Priority: P3)

**Goal**: el detalle muestra hasta 4 productos de la misma categoría.

**Independent Test**: abrir un celular y ver 4 celulares disponibles distintos de él.

- [X] T048 [US9] Escribir `tests/api/related.test.ts` (HU-51, FR-026): `GET /catalog/products/:slug/related`
  devuelve hasta 4 de la misma categoría, activos, con stock, con marca y categoría activas y distintos del
  actual; prioriza la misma marca y luego los más vendidos con orden estable entre llamadas; menos de 4
  cuando hay pocos; `[]` si no hay ninguno; slug inexistente → 404; debe fallar
- [X] T049 [US9] Agregar `GET /products/:slug/related` a `src/worker/routes/catalog.ts` con `cardsQuery` y
  `soldUnits` hasta pasar T048 (HU-51, FR-026)
- [X] T050 [US9] Crear `src/web/components/RelatedProducts.tsx` (rejilla de `ProductCard`, oculta si no hay)
  e integrarlo en `src/web/pages/Product.tsx` (HU-51, FR-026)

**Checkpoint**: HU-51 completa.

---

## Phase 12: User Story 10 - Comprobante imprimible (Priority: P3)

**Goal**: el cliente abre e imprime el comprobante de su pedido.

**Independent Test**: abrir un pedido Pagado, «Ver comprobante» y revisar la vista previa de impresión.

- [ ] T051 [US10] Escribir `tests/api/receipt.test.ts` (HU-52, FR-027, FR-028, RN-07, RN-08): `GET
  /orders/:number/receipt` devuelve el pedido, `store` (nombre fijo «R Cube», WhatsApp y dirección de recojo de la
  configuración) y `customer`; incluye variantes, cupón, envío, total, base imponible e IGV con los montos
  congelados (cambiar el precio del producto después no los altera); el pedido de otro cliente → 404; sin
  sesión → 401; pedido Pendiente de pago o Cancelado devuelve su estado real; debe fallar
- [ ] T052 [US10] Agregar `GET /:number/receipt` a `src/worker/routes/orders.ts` hasta pasar T051 (HU-52,
  FR-027, RN-08)
- [ ] T053 [US10] Crear `src/web/pages/Receipt.tsx` (datos de la tienda y del cliente, entrega, productos con
  variante, cupón, envío, total, base imponible e IGV, estado visible, leyenda «Comprobante de pedido, no es
  factura electrónica. Pago simulado.», botón «Imprimir» con `window.print()`), la ruta
  `/pedidos/:number/comprobante`, el enlace «Ver comprobante» en `src/web/pages/OrderDetail.tsx` y el CSS
  `@media print` en `src/web/styles.css` (oculta encabezado, pie y botones con `print:hidden`, fuerza los
  tokens claros aunque esté `.dark`, A4 con márgenes de 15 mm, 11 pt y `break-inside: avoid` por línea)
  (HU-52, FR-028, SC-007, RNF-03)

**Checkpoint**: HU-52 completa.

---

## Phase 13: User Story 11 - Avisos dentro de la app (Priority: P3)

**Goal**: la campana avisa al cliente cuando cambia el estado de su pedido.

**Independent Test**: pasar el pedido de un cliente a Enviado desde el panel y ver el aviso en la campana.

- [ ] T054 [US11] Escribir `tests/api/notifications.test.ts` (HU-53, FR-029 a FR-031): confirmar el pago, pasar
  a Preparando, Enviado y Entregado desde el panel crea un aviso «Tu pedido RC-… está <Estado>»; cancelar
  por el administrador, rechazar un pago y la cancelación automática a las 24 h (`expirePendingOrders` de `src/worker/cron.ts`) crean «Tu
  pedido RC-… fue cancelado: <motivo>»; cancelar el propio cliente no crea aviso; `GET
  /notifications/summary` devuelve `unread` y los últimos 20; `GET /notifications` pagina de 20 en 20;
  `POST /notifications/:id/read` y `POST /notifications/read-all` marcan leídos; un cliente no ve ni marca
  avisos de otro (404); sin sesión → 401; un cambio de estado fallido (409) no deja aviso; debe fallar
- [ ] T055 [US11] Crear `src/worker/services/notifications.ts` (`notifyOrderStatus(tx, …)`) y llamarlo dentro de
  las transacciones existentes: `cancelOrder` cuando el actor no es el cliente
  (`src/worker/services/orders.ts`), el cambio de estado de `src/worker/routes/admin/orders.ts` y la
  confirmación de pago de `src/worker/routes/admin/payments.ts`; crear `src/worker/routes/notifications.ts`
  y montarlo en `src/worker/index.ts` bajo `/notifications` con `requireCustomer` hasta pasar T054 (HU-53,
  FR-029, FR-030, FR-031, RN-08)
- [ ] T056 [US11] Crear `src/web/components/NotificationBell.tsx` (botón con nombre «Avisos, N sin leer»,
  contador de 1 a 99 o «99+», `Popover` de radix-ui con los últimos 20, hora relativa con
  `Intl.RelativeTimeFormat('es-PE')`, «Marcar como leído» y «Marcar todos como leídos», `refetchInterval:
  60_000` y al enfocar la ventana) en `src/web/components/Header.tsx` solo para clientes, y
  `src/web/pages/Notifications.tsx` (lista paginada de 20 en 20, estados de carga, vacío «No tienes avisos»
  y error) con la ruta `/avisos` en `src/web/router.tsx` (HU-53, FR-030, SC-006, RNF-03)
- [ ] T057 [US11] Ampliar `src/db/seed-data.ts` con un aviso por cada cambio de estado de los pedidos de
  demostración, algunos sin leer (FR-036, HU-53)

**Checkpoint**: HU-53 completa; las 11 historias implementadas.

---

## Phase 14: Polish & Cross-Cutting Concerns

- [ ] T058 Ampliar `tests/api/admin/access.test.ts` con todas las rutas de administración nuevas (variantes,
  cupones, reseñas): sin sesión 401 y con cliente 403 sin datos; y agregar una prueba equivalente para las
  rutas de cliente nuevas (favoritos, direcciones, avisos, comprobante, reseñas `POST`) que exige sesión y
  rechaza a un cliente bloqueado (FR-032, RN-08)
- [ ] T059 Ampliar `tests/api/seed.test.ts` (FR-036, SC-009): variantes en 3 productos, 2 reseñas (una
  oculta), favoritos, direcciones, los 3 cupones en sus estados y avisos; invariantes 1, 5 y 8: `product.stock`
  = suma de variantes activas, `used_count` = pedidos no cancelados con cupón y la suma de movimientos de
  cada producto y variante = su stock actual
- [ ] T060 [P] Escribir `e2e/variantes-compra.spec.ts` (HU-44, HU-49, SC-001): elegir una variante, ver cambiar
  precio y disponibilidad, probar «Elige color, almacenamiento o RAM», agregar, aplicar `BIENVENIDO10`, ver
  el descuento, probar `VERANO5` («El cupón venció») y `NOEXISTE`, pagar con `4111 1111 1111 1111` y ver
  variante y descuento en el pedido; como visitante, escribir un cupón muestra «Inicia sesión para aplicar tu
  cupón» y el código se conserva al ingresar (US8, escenario 9)
- [ ] T061 [P] Escribir `e2e/extras-cliente.spec.ts` (HU-45, HU-46, HU-48, HU-51, HU-52, HU-53): favorito con
  recarga y paso al carrito (y, como visitante, el corazón lleva a ingresar y el favorito queda guardado al
  volver); reseña de un producto Entregado (y sin formulario si no lo recibió); dos
  direcciones con predeterminada y elección en el checkout; relacionados en el detalle; comprobante con
  `page.emulateMedia({ media: 'print' })` (sin encabezado ni botones) y PDF de una página A4 con
  `page.pdf()`; aviso en la campana tras un cambio de estado hecho con la cookie de `adminCookies`
- [ ] T062 [P] Escribir `e2e/admin-extras.spec.ts` (HU-43, HU-47, HU-50, SC-005): el administrador crea 3
  variantes y ve el rango en la lista, oculta y muestra una reseña, crea y desactiva un cupón y los ve en la
  auditoría (reutiliza `adminCookies`)
- [ ] T063 Ampliar `e2e/accesibilidad.spec.ts` con axe AA en tema claro y oscuro para las pantallas nuevas:
  detalle con variantes, reseñas y relacionados, Mis favoritos, Mis direcciones, Avisos, comprobante,
  checkout con cupón, y en el panel Cupones, Reseñas y el formulario de producto con variantes (RNF-03,
  FR-035, SC-008)
- [ ] T064 [P] Actualizar `DESPLIEGUE.md` (aplicar la migración `0003` antes de publicar, que copia las
  direcciones existentes; cupones de demostración; comprobación de la campana y del cupón), `README.md`
  (variantes, favoritos, reseñas, direcciones, cupones, comprobante y avisos) y `specs/README.md` (estado de
  la 003 y su sección) (RNF-09, RNF-10)
- [ ] T065 Revisión de seguridad del diff de la 003: favoritos, direcciones, avisos y comprobante siempre
  filtrados por `user_id` (404 si es ajeno); comentarios de reseñas mostrados como texto; validación de
  `variantId`, `addressId` y `couponCode` en el servidor con mensajes por campo y montos en céntimos (FR-033); el cupón solo se consulta con sesión (sin enumeración
  anónima); ninguna acción de variantes, cupones o reseñas sin auditoría; ningún dato sensible en los avisos
  ni en el comprobante (solo últimos 4 de la tarjeta) (RNF-05, RNF-06, RN-08)
- [ ] T066 Verificar la migración aplicando `0003` sobre una base con la dirección única de la 001, ejecutar
  `npm run check` y `npm run test:e2e`, recorrer quickstart.md en tema claro y oscuro y corregir contra la
  spec (SC-001 a SC-009, FR-037)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → historias.
- **US1 (Phase 3)** depende de Foundational. **US2 (Phase 4)** depende de US1 (necesita variantes y su
  servicio). **US3 a US11** dependen solo de Foundational, salvo lo indicado abajo.
- **US4** depende de US3 (moderar reseñas existentes). **US7** (admin de cupones) antecede a **US8**
  (aplicar cupón). **US10** (comprobante) muestra variante y cupón: conviene después de US2 y US8, pero
  funciona sin ellos. **US11** envuelve los cambios de estado y la cancelación (US8 ya extendió
  `cancelOrder`).
- **Polish (Phase 14)** depende de todas las historias.

### Within Each User Story

- La prueba va primero y debe fallar; luego servicio o ruta del Worker; luego pantalla; al final los datos
  de demostración. Las tareas que tocan el mismo archivo (`orders.ts`, `pricing.ts`, `cart.ts`,
  `catalog.ts`, `seed-data.ts`, `Product.tsx`) se ejecutan en serie.

### Parallel Opportunities

- Phase 1: T003, T004 y T005 en paralelo tras T001. Phase 2: T006, T007 y T009 en paralelo.
- Tras Foundational: US3, US5, US6, US7 y US9 no comparten archivos con US1 y US2 (salvo `seed-data.ts`,
  `Product.tsx`, `router.tsx` y `Header.tsx`, que se tocan en serie).
- Phase 14: T060, T061, T062 y T064 en paralelo.

### Parallel Example: Phase 2

```text
T006 tests/unit/coupon.test.ts   |  T007 tests/unit/variant.test.ts  |  T009 tests/api/variants-service.test.ts
```

---

## Implementation Strategy

### MVP First

1. Phase 1 y 2 (esquema, utilidades y stock de variantes).
2. US1 y US2: variantes de punta a punta (HU-43 y HU-44). **Parar y validar**: definir y comprar una variante.
3. US3 (reseñas), el resto de P1.

### Incremental Delivery

4. US4 a US8 (P2): moderación, favoritos, direcciones y cupones; validar cada una con su prueba.
5. US9 a US11 (P3): relacionados, comprobante y avisos.
6. Phase 14: regresión completa, e2e, accesibilidad, documentación y revisión de seguridad.

### Commits

Un commit al cerrar cada fase, con el formato `feat(003): …`, `test(003): …` o `docs(003): …`, sin firmas de
IA. Todas las pruebas de las features 001 y 002 deben seguir en verde en cada commit (FR-037).
