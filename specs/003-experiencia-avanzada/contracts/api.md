# Contrato de la API de la feature 003

Todas las rutas son JSON bajo `/api`. Errores con la forma de las features anteriores:
`{ error: { code, message, fields?, ...extra } }`. Autorización: **P** pública, **C** cliente con sesión
y no bloqueado (401 `UNAUTHENTICATED` sin sesión), **A** administrador (401 sin sesión, 403 `FORBIDDEN`
con otro rol, sin datos). Los datos de un cliente nunca son accesibles por otro (RN-08): una consulta
ajena responde 404. Paginación: `?page=` (1 por defecto). Toda acción del panel que cambia datos escribe
la auditoría en la misma transacción. Montos en céntimos.

## Catálogo y variantes (HU-43, HU-44, HU-51)

- **P** `GET /catalog/products` y `GET /catalog/home`: las tarjetas (`ProductCard`) agregan
  `hasVariants: boolean` y `maxPriceCents: number | null`. `priceCents` es el precio «desde». Filtro y
  orden por precio usan `priceCents` (clarificación 2). Sin cambios para productos sin variantes.
- **P** `GET /catalog/products/:slug` → `ProductDetail` agrega
  `variants: [{ id, sku, label, color, storage, ram, priceCents, stock, availability, imageUrl|null,
  active }]` (solo las activas, ordenadas por precio y SKU). `stock` y `availability` del detalle son los
  totales.
- **P** `GET /catalog/products/:slug/related` → `ProductCard[]` (0 a 4) (HU-51).

## Carrito y cupón (HU-44, HU-49)

- **C o P** `POST /cart/quote` `{ items: [{ productId, variantId?, quantity, seenPriceCents? }], coupon? }`
  → `CartQuote`. Para el visitante, el cupón se ignora.
- **C** `GET /cart?coupon=CODE` → `CartQuote`.
- **C** `PUT /cart/items/:productId` `{ quantity, variantId? }`, `DELETE /cart/items/:productId
  ?variantId=`, `POST /cart/merge` `{ items: [{ productId, variantId?, quantity }] }`: mismos contratos
  de la 001 con `variantId` opcional. 404 `NOT_FOUND` si la variante no pertenece al producto o está
  inactiva; 409 `STOCK` si no hay stock de la variante; 400 `VARIANT_REQUIRED` («Elige color,
  almacenamiento o RAM») si el producto tiene variantes y no se envía `variantId` al agregar.
- `CartLine` agrega `variantId: string | null`, `variantLabel: string | null`, `sku: string | null`.
  `CartWarning.type` agrega `"choose_variant"` y `"coupon"`.
- `CartQuote` agrega `coupon: { code, kind, value, discountCents } | null` y
  `couponError: { code, message } | null`; `totals.discountCents` es el descuento (0 sin cupón) y los
  totales cumplen RN-04 y RN-14. Códigos de `couponError`: `COUPON_NOT_FOUND` («El cupón no existe»),
  `COUPON_INACTIVE` («El cupón no está activo»), `COUPON_NOT_STARTED` («El cupón aún no está vigente»),
  `COUPON_EXPIRED` («El cupón venció»), `COUPON_EXHAUSTED` («El cupón ya no tiene usos»).

## Checkout y pedidos (HU-44, HU-48, HU-49, HU-52)

- **C** `GET /checkout/options` agrega `addresses: Address[]` (la predeterminada primero).
- **C** `POST /checkout/orders` `{ delivery, payment, expectedTotalCents, couponCode? }`:
  - `delivery` con `method: 'delivery'` acepta `addressId` (usa la dirección guardada y congela sus
    datos; 400 `VALIDATION` en `delivery.addressId` si no existe o no es del cliente) o los campos
    escritos a mano como en la 001.
  - Con `couponCode` el servidor revalida: 409 con el `code` del cupón (`COUPON_EXPIRED`, etc.) y el
    mensaje; el pedido no se crea. Con el último uso tomado por otro: 409 `COUPON_EXHAUSTED`.
  - 409 `STOCK` y `PRICE_CHANGED` como antes, ahora por variante; 409 `STOCK` con el aviso
    `choose_variant` si hay una línea sin variante de un producto con variantes.
  - `expectedTotalCents` incluye el descuento. `OrderDetail` agrega `couponCode`, y cada línea
    `variantLabel` y `sku`; `totals.discountCents` es el descuento.
- **C** `GET /orders/:number/receipt` → `Receipt` = `OrderDetail` + `store: { name, whatsappNumber,
  pickupAddress }` + `customer: { name, email, phone }`; 404 si el pedido no es del cliente (HU-52).

## Reseñas (HU-46)

- **P** `GET /catalog/products/:slug/reviews?page=` → `{ average: number | null, count: number, items:
  [{ id, rating, comment|null, authorName, createdAt }], page, pageSize: 5, total, mine?: Review | null,
  canReview?: boolean, reviewBlockedReason?: string }`. `average` con un decimal y solo reseñas
  visibles; `mine` y `canReview` solo con sesión (`mine` incluye su reseña aunque esté oculta).
- **C** `POST /catalog/products/:slug/reviews` `{ rating: 1..5, comment?: string ≤ 1000 }` → 201
  `Review`. 403 `NOT_DELIVERED` («Puedes reseñar este producto después de recibirlo») si no tiene el
  producto en un pedido Entregado (RN-09); 409 `ALREADY_REVIEWED` si ya reseñó; 400 `VALIDATION` por
  campo.

## Favoritos (HU-45)

- **C** `GET /favorites` → `{ items: [{ product: ProductCard, available: boolean }] }` (los
  desactivados y agotados incluidos, con `available: false`).
- **C** `GET /favorites/ids` → `{ ids: string[] }`.
- **C** `PUT /favorites/:productId` → 204 (idempotente); 404 si el producto no existe.
- **C** `DELETE /favorites/:productId` → 204 (idempotente).

## Direcciones (HU-48)

- **C** `GET /account/addresses` → `Address[]` = `{ id, label, recipientName, phone, line, district,
  reference, isDefault }`, la predeterminada primero y luego por fecha descendente.
- **C** `POST /account/addresses` `{ label, recipientName, phone, line, district, reference? }` → 201
  `Address`; la primera queda predeterminada; 409 `TOO_MANY_ADDRESSES` al llegar a 10; 400 `VALIDATION`
  por campo.
- **C** `PATCH /account/addresses/:id` mismos campos → 200; **C** `POST
  /account/addresses/:id/default` → 200 (cambia la predeterminada); **C** `DELETE
  /account/addresses/:id` → 204 (promueve la más reciente si era la predeterminada). 404 si la dirección
  no es del cliente.
- **C** `GET /account/me` devuelve `address` desde la dirección predeterminada y `PATCH /account/me`
  la escribe (la crea con el nombre «Principal» si no existe): sin cambios de contrato respecto a la 001.

## Avisos (HU-53)

- **C** `GET /notifications/summary` → `{ unread: number, latest: Notification[] (20) }`.
- **C** `GET /notifications?page=` → `{ items: Notification[], total, page, pageSize: 20 }`.
- **C** `POST /notifications/:id/read` → 204; **C** `POST /notifications/read-all` → 204. 404 si el
  aviso no es del cliente.
- `Notification` = `{ id, orderNumber, message, read: boolean, createdAt }`.

## Administración (A) bajo `/api/admin`

### Variantes (HU-43)

- `GET /products/:id/variants` → `AdminVariant[]` = `{ id, sku, color, storage, ram, label, priceCents,
  stock, imageId|null, imageUrl|null, active, sold: boolean }` (todas, activas e inactivas).
- `POST /products/:id/variants` `{ sku, color, storage, ram, priceCents, stock, imageId|null, active }`
  → 201. Crea movimiento `inicial`; la primera variante de un producto con stock propio registra
  antes el ajuste a 0 del producto (research R1). 409 `DUPLICATE_SKU` («Ese SKU ya existe», campo
  `sku`), 409 `DUPLICATE_COMBINATION`, 409 `TOO_MANY_VARIANTS` (20), 400 `VALIDATION`.
- `PATCH /variants/:id` mismos campos sin `stock` → 200; auditoría `variante` con antes y después.
- `DELETE /variants/:id` → 204 si nunca se vendió; 409 `VARIANT_SOLD` («Esta variante ya tiene pedidos;
  desactívala») si vendió.
- `POST /products/:id/stock-adjustments` (002) acepta `variantId` y **lo exige** si el producto tiene
  variantes (400 `VARIANT_REQUIRED`); `GET /products/:id/stock-movements` incluye `variantLabel`.
- `GET /products` y `GET /products/:id` (002) agregan `hasVariants`, `maxPriceCents` y, en el detalle,
  `variants`. El resumen `lowStock` cuenta variantes activas con 5 o menos unidades (clarificación 3) y
  `GET /summary` indica producto y variante.

### Cupones (HU-50)

- `GET /coupons?page=` → `{ items: AdminCoupon[], total, page, pageSize: 20 }`, `AdminCoupon` = `{ id,
  code, kind, value, startsOn, endsOn, maxUses, usedCount, active, status:
  'active'|'inactive'|'expired'|'exhausted' }`.
- `POST /coupons` `{ code, kind, value, startsOn, endsOn, maxUses, active? }` → 201. 409
  `DUPLICATE_CODE` («Ese código ya existe», campo `code`); 400 `VALIDATION` (rango del valor, fechas).
- `PATCH /coupons/:id` `{ code?, kind?, value?, startsOn?, endsOn?, maxUses?, active? }` → 200; 409
  `COUPON_USED` si cambia el código de un cupón ya usado; 400 si `maxUses < usedCount` con el mensaje
  «El cupón ya lleva N usos».
- `DELETE /coupons/:id` → 204 si `usedCount = 0`; 409 `COUPON_USED` si tiene usos. Auditoría `cupon` en
  cada alta, cambio, activación y baja.

### Reseñas (HU-47)

- `GET /reviews?status=visible|hidden&q&page` → `{ items: [{ id, productId, productName, authorName,
  authorEmail, rating, comment|null, hidden, createdAt }], total, page, pageSize: 20 }`.
- `POST /reviews/:id/hide` y `POST /reviews/:id/show` → `{ id, hidden }`; auditoría `resena_oculta` /
  `resena_visible`; idempotentes (sin segunda entrada de auditoría si no cambia).
- `GET /orders/:number` (002) agrega `couponCode` y `discountCents` en el desglose; el CSV de
  pedidos **no cambia**.

## Códigos de error nuevos

`VARIANT_REQUIRED`, `DUPLICATE_SKU`, `DUPLICATE_COMBINATION`, `TOO_MANY_VARIANTS`, `VARIANT_SOLD`,
`COUPON_NOT_FOUND`, `COUPON_INACTIVE`, `COUPON_NOT_STARTED`, `COUPON_EXPIRED`, `COUPON_EXHAUSTED`,
`COUPON_USED`, `DUPLICATE_CODE`, `NOT_DELIVERED`, `ALREADY_REVIEWED`, `TOO_MANY_ADDRESSES`.
