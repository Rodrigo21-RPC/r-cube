# Data Model: Experiencia avanzada

Esquema de PostgreSQL con Drizzle. Todo cambio va en la migración `0003_experiencia_avanzada.sql`.
Los montos son céntimos enteros; los identificadores son UUID en texto, como en las features 001 y 002.
Reglas de negocio de referencia: RN-01 a RN-14 (`docs/requisitos/REQUISITOS.md`).

## Tablas nuevas

### `product_variant` (HU-43, HU-44)

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | texto, PK | UUID |
| `product_id` | texto, FK `product(id)` | `ON DELETE CASCADE`; obligatorio |
| `sku` | texto | obligatorio, único en toda la tienda, 3 a 40 caracteres de letras, números, guion y guion bajo, guardado en mayúsculas |
| `color` | texto | obligatorio con valor `''` si no aplica; máx. 40 |
| `storage` | texto | ídem; máx. 40 (almacenamiento, p. ej. «256 GB») |
| `ram` | texto | ídem; máx. 40 |
| `price_cents` | entero | `> 0` (`CHECK product_variant_price_positive`) |
| `stock` | entero | `>= 0` (`CHECK product_variant_stock_non_negative`) |
| `image_id` | texto, FK `product_image(id)` | opcional, `ON DELETE SET NULL`; debe ser una foto del mismo producto (se valida en el servicio) |
| `active` | booleano | por defecto `true` |
| `created_at`, `updated_at` | fecha y hora con zona | |

Restricciones e índices:
- `CHECK product_variant_has_attribute`: al menos uno de `color`, `storage`, `ram` distinto de `''`.
- Índice único `product_variant_sku_uq (sku)`.
- Índice único `product_variant_combo_uq (product_id, color, storage, ram)`: no hay dos variantes con la
  misma combinación (spec, Edge Cases).
- Índice `product_variant_product_idx (product_id, active)`.
- Máximo 20 variantes por producto (se valida en el servicio, 409 `TOO_MANY_VARIANTS`).

Nombre legible (`variantLabel`): «256 GB · Azul · 8 GB RAM», en el orden almacenamiento, color, RAM y
omitiendo los vacíos.

### `favorite` (HU-45)

| Columna | Tipo | Reglas |
|---|---|---|
| `user_id` | texto, FK `user(id)` | `ON DELETE CASCADE` |
| `product_id` | texto, FK `product(id)` | `ON DELETE CASCADE` |
| `created_at` | fecha y hora | |

PK `(user_id, product_id)`; índice `(user_id, created_at desc)`.

### `review` (HU-46, HU-47)

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | texto, PK | UUID |
| `product_id` | texto, FK `product(id)` | `ON DELETE CASCADE` |
| `user_id` | texto, FK `user(id)` | `ON DELETE CASCADE` |
| `rating` | entero | `CHECK rating BETWEEN 1 AND 5` |
| `comment` | texto | opcional; `CHECK char_length(comment) <= 1000`; el servicio recorta espacios y guarda `NULL` si queda vacío |
| `hidden` | booleano | por defecto `false` (HU-47) |
| `created_at` | fecha y hora | |

Índices: único `(product_id, user_id)` (una reseña por producto y cliente, RN-09); `(product_id,
created_at desc) WHERE NOT hidden` para el detalle; `(created_at desc)` para el panel.

### `address` (HU-48)

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | texto, PK | UUID |
| `user_id` | texto, FK `user(id)` | `ON DELETE CASCADE` |
| `label` | texto | obligatorio, 2 a 40 («Casa», «Trabajo») |
| `recipient_name` | texto | obligatorio, 2 a 80 |
| `phone` | texto | 9 dígitos que empiezan con 9 (validado en el servidor; la migración puede copiar `''`) |
| `line` | texto | obligatorio, 5 a 160 |
| `district` | texto | obligatorio, 2 a 80 |
| `reference` | texto | opcional, hasta 160 |
| `is_default` | booleano | por defecto `false` |
| `created_at` | fecha y hora | |

Índices: único parcial `address_default_uq (user_id) WHERE is_default` (una sola predeterminada);
`(user_id, created_at desc)`. Tope de 10 por cliente en el servicio (409 `TOO_MANY_ADDRESSES`).

Reglas: la primera dirección es predeterminada; marcar otra cambia ambas en una transacción; borrar la
predeterminada promueve la más reciente.

### `coupon` (HU-49, HU-50)

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | texto, PK | UUID |
| `code` | texto | único; 3 a 20 caracteres `[A-Z0-9-]`, guardado en mayúsculas; no se cambia si `used_count > 0` |
| `kind` | texto | `percent` o `fixed` |
| `value` | entero | `percent`: 1 a 90; `fixed`: céntimos `>= 100` (`CHECK` por tipo) |
| `starts_on` | fecha | día calendario de Lima |
| `ends_on` | fecha | `CHECK ends_on >= starts_on` |
| `max_uses` | entero | `>= 1` |
| `used_count` | entero | por defecto 0; `CHECK used_count >= 0` |
| `active` | booleano | por defecto `true` |
| `created_at`, `updated_at` | fecha y hora | |

Índice único `coupon_code_uq (code)`. Estado calculado (no se guarda): Inactivo si `active = false`;
Agotado si `used_count >= max_uses`; Vencido si `ends_on < hoy`; si no, Activo. «Hoy» es
`(now() at time zone 'America/Lima')::date`. `max_uses` no puede quedar por debajo de `used_count`.

### `notification` (HU-53)

| Columna | Tipo | Reglas |
|---|---|---|
| `id` | texto, PK | UUID |
| `user_id` | texto, FK `user(id)` | `ON DELETE CASCADE` |
| `order_id` | texto, FK `orders(id)` | `ON DELETE CASCADE` |
| `order_number` | texto | `RC-000123`, para el texto y el enlace |
| `message` | texto | ya redactado en español |
| `read_at` | fecha y hora | `NULL` = sin leer |
| `created_at` | fecha y hora | |

Índice `(user_id, read_at, created_at desc)`; las consultas siempre filtran por `user_id` (RN-08).

## Columnas nuevas en tablas existentes

| Tabla | Columna | Tipo | Reglas |
|---|---|---|---|
| `product` | `has_variants` | booleano | por defecto `false`; `true` si existe alguna variante |
| `product` | `max_price_cents` | entero | `NULL` sin variantes; con variantes, el mayor precio de las activas |
| `cart_item` | `variant_id` | texto, FK `product_variant(id)` | opcional, `ON DELETE CASCADE`; el índice único pasa a `(user_id, product_id, coalesce(variant_id, ''))` |
| `order_item` | `variant_id` | texto, FK `product_variant(id)` | opcional, sin cascada (una variante vendida no se borra) |
| `order_item` | `variant_label` | texto | opcional, nombre congelado de la variante |
| `order_item` | `sku` | texto | opcional, SKU congelado |
| `orders` | `coupon_id` | texto, FK `coupon(id)` | opcional |
| `orders` | `coupon_code` | texto | opcional, código congelado; `discount_cents` ya existe (valor 0 hasta ahora) |
| `stock_movement` | `variant_id` | texto, FK `product_variant(id)` | opcional; con variante, `stock_before` y `stock_after` son los de la variante |

`product.price_cents` y `product.stock` se mantienen y pasan a ser el **resumen derivado** cuando
`has_variants` es `true` (ver invariantes). Las columnas `user.address_line`, `user.district` y
`user.address_reference` siguen existiendo; la dirección de cuenta se lee y escribe en la dirección
predeterminada (research R6).

## Invariantes

1. **Resumen del producto**: si `has_variants`, entonces `product.stock` = suma de `stock` de las
   variantes activas, `product.price_cents` = menor `price_cents` de las activas (de todas si ninguna
   está activa) y `product.max_price_cents` = mayor precio de las activas. Lo mantiene
   `syncProductFromVariants` bajo `FOR UPDATE` de la fila del producto.
2. **Stock**: `product_variant.stock >= 0` y `product.stock >= 0`; el stock de un producto con
   variantes nunca se modifica directamente, solo por sus variantes.
3. **Variante vendida**: si existe un `order_item` con la variante, no se borra (solo se desactiva).
4. **Una predeterminada**: por cliente hay 0 o 1 dirección con `is_default`; hay 1 si tiene alguna.
5. **Cupón**: `0 <= used_count <= max_uses` siempre; cada pedido con cupón no cancelado cuenta 1 uso.
6. **Reseña**: existe como máximo una por `(product_id, user_id)` y solo si el cliente tiene el producto
   en un pedido Entregado en el momento de crearla.
7. **Totales del pedido**: `total_cents = subtotal_cents + shipping_cents − discount_cents`;
   `taxable_base_cents + igv_cents = total_cents`; `discount_cents <= subtotal_cents − 100` cuando hay
   cupón (RN-04, RN-14).
8. **Historial de stock**: para cada producto o variante, la suma de `delta` de sus movimientos es su
   stock actual (el seed lo cumple y una prueba lo verifica).

## Transiciones y eventos

- **Pedido**: no cambia el grafo de estados de REQUISITOS §5. Cada cambio hecho por el administrador o
  por el sistema, además del `order_event` y de la auditoría que ya existen, crea un `notification`
  para el cliente en la misma transacción. Cancelar devuelve además el uso del cupón y el stock de la
  variante.
- **Cupón**: `Activo → Agotado` al consumir el último uso; `Agotado → Activo` si se devuelve un uso;
  `Activo → Vencido` por el paso del tiempo; `Inactivo` por decisión del administrador.
- **Reseña**: `visible ⇄ oculta` solo por el administrador, con auditoría.

## Auditoría

Acciones nuevas en `audit_log.action`: `variante`, `cupon`, `resena_oculta`, `resena_visible` (ver
research R11). Las fotos y el stock de variantes reutilizan `foto` y `stock_ajustado`.

## Datos de demostración (FR-036)

| Dato | Contenido mínimo |
|---|---|
| Variantes | 3 productos con 3 variantes cada uno, SKU, precios y stock distintos, una variante agotada y una con foto propia |
| Reseñas | 6 reseñas de clientes con pedidos Entregados, una oculta |
| Favoritos | 2 a 3 por cliente de demostración |
| Direcciones | 2 clientes con 2 direcciones (una predeterminada) |
| Cupones | `BIENVENIDO10` (10 %, vigente, 50 usos), `VERANO5` (S/ 5.00, vencido) y `ULTIMO` (10 %, 1 uso, agotado) |
| Avisos | uno por cada cambio de estado de los pedidos de demostración, algunos sin leer |
