# Contrato de la API: Tienda y compra (001)

Base `/api`. JSON en UTF-8. Montos en céntimos. Errores con la forma
`{ "error": { "code": "STRING", "message": "texto para la persona", "fields"?: { "campo": "mensaje" } } }`.
El cliente web usa `hc<AppType>` de Hono (tipos compartidos). Sesión por cookie de Better Auth.

| Código | Cuándo |
|---|---|
| 400 `VALIDATION` | datos inválidos (con `fields`) |
| 401 `UNAUTHENTICATED` | falta sesión |
| 403 `FORBIDDEN` | rol sin permiso (por ejemplo, administrador en checkout) |
| 404 `NOT_FOUND` | no existe o no es del cliente (RN-08) |
| 409 `STOCK` / `PRICE_CHANGED` / `INVALID_TRANSITION` | conflicto de negocio |
| 402 `CARD_REJECTED` | tarjeta rechazada (no crea pedido) |
| 423 `LOCKED` | cuenta bloqueada temporalmente (HU-08) |

## Catálogo (público)

- `GET /api/catalog/products?q&category&brand&min&max&available&sort&page` → `{ items: ProductCard[],
  total, page, pageSize: 12, query? }`. `sort` ∈ `relevance|price_asc|price_desc|newest`. `min` y `max`
  en soles enteros. Página fuera de rango → la última válida (HU-01 a HU-04).
- `GET /api/catalog/products/:slug` → `ProductDetail` (galería, specs, `stock`, `availability`:
  `in_stock|low|out`) o 404 si no existe o está inactivo (HU-05).
- `GET /api/catalog/facets` → categorías y marcas activas con conteo, rango de precio (HU-03).
- `GET /api/catalog/home` → `{ categories, offers, bestSellers, newest }`, hasta 8 por sección (HU-06).

`ProductCard`: `{ id, slug, name, brand, priceCents, compareAtCents|null, imageUrl, imageAlt,
availability, stock }`.

## Cuenta

- `POST /api/auth/sign-up/email` `{ name, email, password, phone }` → sesión iniciada (HU-07).
- `POST /api/auth/sign-in/email` `{ email, password }` → sesión; 401 genérico; 423 bloqueado (HU-08).
- `POST /api/auth/sign-out` (HU-08).
- `POST /api/auth/change-password` `{ currentPassword, newPassword, revokeOtherSessions: true }`
  (HU-10).
- `GET /api/account/me` → `{ id, name, email, phone, role, address }` o 401.
- `PATCH /api/account/me` `{ name, phone, address: { line, district, reference } }` (HU-09); el correo
  no se acepta.

## Carrito

- `POST /api/cart/quote` (público) `{ items: [{ productId, quantity }] }` →
  `{ lines: [{ productId, name, imageUrl, unitPriceCents, quantity, maxQuantity, lineTotalCents,
  available }], warnings: [{ productId, type: 'price_changed'|'stock_reduced'|'unavailable', … }],
  totals: { subtotalCents, taxableBaseCents, igvCents, totalCents } }` (HU-11, HU-13).
- `GET /api/cart` (cliente) → misma forma que `quote` con el carrito de la cuenta.
- `PUT /api/cart/items/:productId` (cliente) `{ quantity }`; `DELETE /api/cart/items/:productId`.
- `POST /api/cart/merge` (cliente) `{ items }` → carrito fusionado (HU-12).

## Checkout (solo rol cliente)

- `GET /api/checkout/options` → `{ zones: [{ id, name, costCents }], methods: [...activos],
  pickupAddress, yape: { number, qrUrl }, plin: { number }, bank: {...}, whatsappNumber }` (HU-14,
  HU-17, HU-18).
- `POST /api/checkout/orders` →
  ```json
  {
    "delivery": { "method": "pickup" } | { "method": "delivery", "zoneId": "…", "name": "…",
                  "phone": "…", "address": "…", "district": "…", "reference": "…" },
    "payment": { "method": "card", "cardNumber": "4111…", "expMonth": 12, "expYear": 2030, "cvv": "123" }
             | { "method": "yape_plin", "operationCode": "12345678" }
             | { "method": "transfer", "operationCode": "…"? }
             | { "method": "whatsapp" },
    "expectedTotalCents": 528800
  }
  ```
  Toma las líneas del carrito de la cuenta. Respuestas: 201 `{ order: OrderDetail, whatsappUrl? }`;
  402 `CARD_REJECTED`; 409 `STOCK` (con líneas); 409 `PRICE_CHANGED` si `expectedTotalCents` difiere
  del total calculado (el cliente ve el aviso y confirma de nuevo). El número de tarjeta y el CVV solo
  se usan para decidir el resultado y nunca se guardan ni se registran (HU-14 a HU-21).

## Mis pedidos (solo el dueño)

- `GET /api/orders?page` → `{ items: [{ number, createdAt, totalCents, status }], total }` (HU-22).
- `GET /api/orders/:number` → `OrderDetail` con líneas, montos, pago (`cardLast4`), entrega y
  `events` (HU-23); 404 si no es suyo.
- `POST /api/orders/:number/cancel` `{ reason: 'no_lo_necesito'|'me_equivoque'|'otra_opcion'|'otro',
  detail? }` → `OrderDetail`; 409 `INVALID_TRANSITION` si ya se envió (HU-24).

## Tarea programada

- `scheduled` (cron `0 * * * *`): cancela pendientes con más de 24 h (RN-12). Sin ruta HTTP.
