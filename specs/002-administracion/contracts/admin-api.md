# Contrato de la API de administración (002)

Base `/api/admin`. Todas las rutas exigen sesión con rol `administrador`: 401 `UNAUTHENTICATED` sin
sesión y 403 `FORBIDDEN` con otro rol, sin datos (FR-002). Errores con la forma de la 001
(`{ error: { code, message, fields? } }`). Paginación: `?page=` (1 por defecto). Toda acción que cambia
datos escribe en la auditoría dentro de la misma transacción.

## Resumen
- `GET /summary` → `{ cards: { salesTodayCents, toPrepare, toConfirm, customers, lowStock },
  salesByDay: [{ date: 'YYYY-MM-DD', totalCents }] (30), salesByCategory: [{ name, totalCents }],
  topProducts: [{ id, name, units }] (5), latestOrders: AdminOrderRow[] (5) }` (HU-27).

## Productos, fotos, categorías y marcas
- `GET /products?q&category&status=active|inactive&lowStock=1&page` → `{ items: AdminProductRow[], total,
  page, pageSize: 20 }` (HU-30).
- `GET /products/:id` → producto completo con fotos (orden), marca, categoría y specs.
- `POST /products` `{ name, brandId, categoryId, description, specs:[{label,value}], priceCents,
  compareAtCents|null, stock, active }` → 201 (HU-28). Crea movimiento `inicial`.
- `PATCH /products/:id` mismos campos sin `stock` → 200; si cambia el precio, auditoría
  `precio_cambiado` (HU-28, FR-006).
- `PATCH /products/:id/status` `{ active }` (HU-29).
- `POST /products/:id/images` multipart `file` → 201 `{ id, url, alt, position }`; 400 `INVALID_IMAGE`
  (tipo o tamaño), 409 `MAX_IMAGES` (HU-31).
- `PATCH /products/:id/images/:imageId` `{ alt }`; `POST /products/:id/images/:imageId/move`
  `{ direction: 'up'|'down' }`; `POST /products/:id/images/:imageId/main`; `DELETE
  /products/:id/images/:imageId` (borra de R2 si `r2_key`) (HU-31).
- `GET /categories`, `POST /categories` `{ name }`, `PATCH /categories/:id` `{ name?, active? ,
  confirm? }` → si se desactiva con productos activos y sin `confirm: true`, 409 `HAS_ACTIVE_PRODUCTS`
  `{ count }` (HU-32). Igual para `/brands`.

## Stock
- `GET /products/:id/stock-movements?page` → `{ items: [{ delta, stockBefore, stockAfter, source,
  orderNumber|null, reason, actor, createdAt }], total }` (HU-33).
- `POST /products/:id/stock-adjustments` `{ delta (≠0, entero), reason (3–200) }` → 201 con el producto;
  409 `NEGATIVE_STOCK` (HU-33).

## Pedidos y pagos
- `GET /orders?status&method&from&to&q&page` → `{ items: AdminOrderRow[], total, page, pageSize: 20 }`
  (HU-34). `AdminOrderRow`: `{ number, createdAt, customerName, customerEmail, totalCents, method,
  status }`.
- `GET /orders/export.csv?…mismos filtros` → `text/csv; charset=utf-8` con BOM; 422 `TOO_MANY_ROWS` si
  pasan de 10 000 (HU-37).
- `GET /orders/:number` → `OrderDetail` de la 001 + `customer: { id, name, email, phone }` y
  `allowedTransitions: OrderStatus[]` (HU-35).
- `POST /orders/:number/status` `{ to, expectedStatus, reason? }` → 200 detalle; 409
  `INVALID_TRANSITION` o `STATE_CHANGED`; `to: 'cancelled'` exige `reason`; `to: 'paid'` desde
  `pending_payment` no se acepta aquí (usar confirmar pago) (HU-35, FR-017, FR-019).
- `GET /payments/pending` → `[{ number, customerName, method, totalCents, operationCode, createdAt,
  expiresAt }]` del más antiguo al más nuevo (HU-36).
- `POST /orders/:number/payment/confirm` → 200; 409 `STATE_CHANGED` si ya no está pendiente (HU-36).
- `POST /orders/:number/payment/reject` `{ reason }` → 200 (pedido Cancelado, stock devuelto) (HU-36,
  RN-13).

## Clientes
- `GET /customers?q&page` → `{ items: [{ id, name, email, createdAt, orders, spentCents, blocked }],
  total }` (HU-38).
- `GET /customers/:id` → datos, dirección, fecha de registro, estado y pedidos (HU-39).
- `POST /customers/:id/block` y `POST /customers/:id/unblock` → 200; 403 si el usuario es administrador
  (HU-40).

## Configuración
- `GET /settings` → configuración + zonas (activas e inactivas).
- `PATCH /settings` `{ whatsappNumber, yapeNumber, plinNumber, bankName, bankHolder, bankAccount,
  bankCci, enabledMethods }` (HU-41).
- `POST /zones` `{ name, costCents }`, `PATCH /zones/:id` `{ name?, costCents?, active? }` (HU-41).

## Auditoría
- `GET /audit?action&page` → `{ items: [{ createdAt, actorName, action, entityType, entityLabel, detail
  }], total, page, pageSize: 30 }` (HU-42). Sin rutas de escritura.

## Fotos (público)
- `GET /api/media/:key{.+}` → el objeto de R2 con su `Content-Type` y caché larga; 404 si no existe.
