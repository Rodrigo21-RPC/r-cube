# Data Model: Tienda y compra (001)

PostgreSQL 16. Nombres de tablas y columnas en inglés (`snake_case`). Montos en céntimos (`integer`).
Identificadores `text` (UUID generados por la aplicación), salvo donde se indica. Todas las tablas
llevan `created_at timestamptz default now()`; las editables, también `updated_at`.

## Tablas de Better Auth (con campos extra)

### user
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| name | text | obligatorio, 2 a 80 caracteres |
| email | text | único, guardado en minúsculas |
| email_verified | boolean | default false (no se usa: sin correos) |
| image | text null | sin uso |
| role | text | `cliente` o `administrador`, default `cliente` |
| phone | text | 9 dígitos, empieza con 9 |
| address_line | text null | dirección de entrega del perfil (HU-09) |
| district | text null | |
| address_reference | text null | |
| failed_login_count | integer | default 0 (HU-08) |
| locked_until | timestamptz null | bloqueo temporal de 15 min (HU-08) |
| blocked | boolean | default false; la 002 lo edita (HU-40); si es true no inicia sesión (RN-08) |

### session, account, verification, rate_limit
Las de Better Auth sin cambios. `account.password` guarda el hash PBKDF2 (nunca la contraseña).
`session.expires_at` = creación + 7 días.

## Catálogo

### category
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| name | text | único; Celulares, Laptops, Tablets, Accesorios y repuestos |
| slug | text | único, para la dirección de la página |
| active | boolean | default true |
| sort_order | integer | orden en la portada |

### brand
`id`, `name` (único), `slug` (único), `active`.

### product
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| slug | text | único |
| name | text | obligatorio |
| brand_id | text FK brand | |
| category_id | text FK category | |
| description | text | |
| specs | jsonb | lista `[{ "label": "RAM", "value": "8 GB" }]` |
| price_cents | integer | > 0 |
| compare_at_cents | integer null | precio anterior; si es mayor que `price_cents` el producto está en Ofertas |
| stock | integer | ≥ 0 (`CHECK`) |
| active | boolean | si es false no se vende ni se lista (RN-06) |
| search_text | text | nombre + marca + descripción, minúsculas y sin tildes (R6) |
| created_at | timestamptz | define «Novedad» |

Índices: `(active, category_id)`, `(active, created_at desc)`, `(active, price_cents)`.

### product_image
`id`, `product_id` FK (cascade), `url` (ruta estática `/img/productos/…` o clave de R2 en la 002),
`alt` (texto alternativo), `position` (0 = principal). Máximo 6 por producto (regla de la 002).

## Carrito

### cart_item (solo clientes con sesión)
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | clave propia para admitir `variant_id` en la 003 |
| user_id | text FK user | |
| product_id | text FK product | |
| quantity | integer | ≥ 1 |

Único `(user_id, product_id)`; la 003 lo cambia a `(user_id, product_id, variant_id)`.

## Pedidos

### order (tabla `orders`)
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| number | text | único; `RC-` + `lpad(nextval('order_number_seq'), 6, '0')` (RN-03) |
| user_id | text FK user | dueño; solo él lo ve en la tienda (RN-08) |
| status | text | `pending_payment`, `paid`, `preparing`, `shipped`, `delivered`, `cancelled` |
| delivery_method | text | `pickup` o `delivery` |
| delivery_zone_id | text FK null | obligatorio si `delivery` |
| shipping_cents | integer | costo de la zona congelado; 0 en `pickup` |
| ship_name, ship_phone, ship_address, ship_district, ship_reference | text null | obligatorios con `delivery` salvo la referencia (HU-15) |
| subtotal_cents | integer | suma de líneas |
| discount_cents | integer | 0 en esta feature (cupones en la 003) |
| total_cents | integer | subtotal + envío − descuento (RN-04) |
| taxable_base_cents | integer | `round(total / 1.18)` (RN-14) |
| igv_cents | integer | total − base |
| payment_method | text | `card`, `yape_plin`, `transfer`, `whatsapp` |
| created_at | timestamptz | base del vencimiento de 24 h (RN-12) |

Índices: `(user_id, created_at desc)`, `(status, created_at)`.

### order_item
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| order_id | text FK orders | |
| product_id | text FK product | se conserva aunque el producto se desactive (RN-06) |
| product_name | text | congelado (RN-07) |
| unit_price_cents | integer | congelado (RN-07) |
| quantity | integer | ≥ 1 |
| line_total_cents | integer | precio × cantidad |
| image_url | text null | foto principal al momento de la compra |

### payment
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| order_id | text FK orders | uno por pedido en esta feature |
| method | text | igual a `orders.payment_method` |
| status | text | `approved` (tarjeta), `pending` (los demás), `rejected` y `confirmed` los usa la 002 |
| amount_cents | integer | = total del pedido |
| card_last4 | text null | solo tarjeta; nunca número completo ni CVV (RNF-06) |
| operation_code | text null | Yape o Plin (obligatorio, 6 a 12 dígitos) o transferencia (opcional) |

### order_event (línea de tiempo)
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| order_id | text FK orders | |
| from_status | text null | null en la creación |
| to_status | text | |
| actor_type | text | `cliente`, `administrador` o `sistema` |
| actor_user_id | text null | null cuando es `sistema` |
| reason | text null | obligatorio al cancelar (RN-10) |
| created_at | timestamptz | fecha y hora visibles en HU-23 |

## Configuración

### delivery_zone
`id`, `name`, `cost_cents` (≥ 0), `active`, `sort_order`. Demostración: 3 zonas.

### store_settings (una sola fila, `id = 1`)
`whatsapp_number`, `yape_number`, `plin_number`, `yape_qr_url`, `bank_name`, `bank_holder`,
`bank_account`, `bank_cci`, `pickup_address`, `enabled_methods` (`text[]`, subconjunto de los 4
métodos).

## Transiciones de estado (REQUISITOS §5, RN-11 a RN-13)

```text
pending_payment ──(admin confirma, 002)──▶ paid ──▶ preparing ──▶ shipped ──▶ delivered
       │                                     │          │                       ▲
       │                                     │          └──(solo pickup)────────┘
       └──▶ cancelled ◀──────────────────────┴──────────┘
```

- `pending_payment → cancelled`: el cliente (HU-24), el rechazo del pago (RN-13, en la 002) o el sistema
  a las 24 h (RN-12).
- `paid → cancelled` y `preparing → cancelled`: el cliente (HU-24) o el administrador (002).
- `preparing → delivered`: solo si `delivery_method = pickup`.
- `delivered` y `cancelled` son finales. Toda cancelación devuelve el stock (RN-10) en la misma
  transacción y exige motivo.
- La regla vive en una función pura `canTransition(from, to, deliveryMethod)` con prueba unitaria.
