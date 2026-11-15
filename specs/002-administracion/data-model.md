# Data Model: Administración (002)

Se suma al modelo de `specs/001-tienda-compra/data-model.md`. Montos en céntimos. Migración nueva sobre
la base existente (sin rehacer tablas).

## Nuevas tablas

### stock_movement
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| product_id | text FK product | |
| delta | integer | ≠ 0 (positivo entra, negativo sale) |
| stock_before | integer | ≥ 0 |
| stock_after | integer | ≥ 0; = stock_before + delta |
| source | text | `inicial`, `ajuste`, `venta`, `cancelacion` |
| order_id | text FK orders null | obligatorio en `venta` y `cancelacion` |
| reason | text null | obligatorio en `ajuste` (3 a 200 caracteres) |
| actor_type | text | `administrador`, `cliente`, `sistema` |
| actor_user_id | text FK user null | |
| created_at | timestamptz | |

Índice `(product_id, created_at desc)`.

### audit_log
| Campo | Tipo | Reglas |
|---|---|---|
| id | text PK | |
| actor_user_id | text FK user | administrador que hizo la acción |
| action | text | `producto_creado`, `producto_editado`, `precio_cambiado`, `producto_estado`, `foto`, `categoria`, `marca`, `stock_ajustado`, `pedido_estado`, `pago_confirmado`, `pago_rechazado`, `cliente_bloqueado`, `cliente_reactivado`, `configuracion`, `zona` |
| entity_type | text | `producto`, `categoria`, `marca`, `pedido`, `cliente`, `configuracion`, `zona` |
| entity_id | text | |
| entity_label | text | nombre o N.º legible al momento de la acción |
| detail | text | frase legible en español |
| data | jsonb | `{ before, after }` con los campos cambiados |
| created_at | timestamptz | |

Índices `(created_at desc)` y `(action, created_at desc)`.

## Cambios a tablas existentes

- **product_image**: `+ r2_key text null` (clave en R2; null en fotos de demostración). `alt` pasa a ser
  editable. Máximo 6 por producto (regla del servicio).
- **payment.status**: ya admite `confirmed` y `rejected` (se usan desde ahora).
- **orders**: sin cambios; los cambios de estado escriben en `order_event` como en la 001.

## Reglas de negocio (resumen)

- Stock: `stock_after >= 0` siempre; el `UPDATE` condicional y el `INSERT` del movimiento van en la
  misma transacción (FR-012).
- Venta (`createOrder`) inserta un movimiento `venta` por línea; cancelación (`cancelOrder`) uno
  `cancelacion` por línea (FR-013).
- Seed: un movimiento `inicial` por producto con su stock de demostración, más los `venta` y
  `cancelacion` de los 8 pedidos (FR-028), de modo que la suma de movimientos = stock actual.
- Transiciones de pedido: `canTransition` de la 001; desde el panel, Pendiente de pago → Pagado solo por
  «Confirmar pago» (FR-019).
