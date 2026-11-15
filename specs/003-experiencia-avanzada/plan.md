# Implementation Plan: Experiencia avanzada (R Cube)

**Branch**: `003-experiencia-avanzada` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-experiencia-avanzada/spec.md`

## Summary

Once the 001 (tienda y compra) and 002 (administración) are merged, this feature adds eleven stories on
top of them without redoing anything: variantes de producto (HU-43, HU-44), favoritos (HU-45), reseñas
y su moderación (HU-46, HU-47), varias direcciones (HU-48), cupones del cliente y su administración
(HU-49, HU-50), productos relacionados (HU-51), comprobante imprimible (HU-52) y avisos dentro de la app
(HU-53).

El enfoque técnico mantiene el mismo Worker y la misma SPA. Las variantes viven en una tabla propia y
**el producto conserva sus columnas de precio y stock como resumen derivado** (precio «desde», precio
máximo y stock total), que un único servicio recalcula bajo bloqueo de la fila del producto; así el
catálogo, el filtro y el orden por precio, el resumen del panel y todas las pruebas de la 001 y 002
siguen funcionando sin tocarse. El carrito, el pedido y el historial de stock ganan una referencia
opcional a la variante. Los cupones se canjean con un `UPDATE` condicional dentro de la transacción del
pedido y se devuelven al cancelar. Los avisos se generan en un solo servicio llamado desde los tres
puntos donde ya cambia el estado de un pedido. El comprobante es una página con CSS de impresión.

## Technical Context

**Language/Version**: TypeScript 6.0 estricto (Node 24 en desarrollo y CI)

**Primary Dependencies**: las de la 001 y 002 (Hono, React 19, React Router 8, TanStack Query 5,
React Hook Form, Zod 4, Zustand, Tailwind 4, radix-ui, Drizzle 0.45, postgres.js, Better Auth 1.7);
**sin dependencias nuevas**. El selector de avisos usa `Popover` de radix-ui, que ya es parte del
paquete `radix-ui` instalado.

**Storage**: PostgreSQL con migración versionada `0003_experiencia_avanzada.sql` (tablas
`product_variant`, `favorite`, `review`, `address`, `coupon`, `notification`; columnas nuevas en
`product`, `cart_item`, `order_item`, `orders` y `stock_movement`; copia de la dirección única a
`address`). Fotos de variantes: referencia a `product_image`, sin almacenamiento nuevo.

**Testing**: Vitest (proyecto `unit` en Node y proyecto `api` con `@cloudflare/vitest-plugin`) y
Playwright (e2e y accesibilidad AA con axe, tema claro y oscuro). Pruebas primero, una por regla.

**Target Platform**: Cloudflare Workers (assets estáticos + `/api/*`) con Hyperdrive; sin módulos
nativos ni sistema de archivos.

**Project Type**: aplicación web (SPA React + API Hono en un solo Worker), ya existente.

**Performance Goals**: el detalle de producto con variantes, reseñas y relacionados responde con 3
consultas en paralelo; el sondeo de avisos es una sola consulta indexada cada 60 s; el catálogo no
cambia de costo (filtro y orden usan la columna resumen indexada).

**Constraints**: montos en céntimos enteros; fechas de vigencia en hora de Lima (UTC−5); el servidor
recalcula siempre precios, descuento y totales; stock y cupones nunca por debajo de 0 ni por encima de
sus máximos aunque haya compras simultáneas; nada de correos ni tiempo real (sondeo).

**Scale/Scope**: hasta 20 variantes por producto, 10 direcciones por cliente, 1 000 caracteres por
reseña; 11 historias, 6 tablas nuevas, unas 28 rutas nuevas y 9 pantallas nuevas o ampliadas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple el plan | Estado |
|---|---|---|
| I. Simplicidad | Mismo Worker y SPA, sin dependencias nuevas; el resumen derivado del producto evita reescribir el catálogo; el estado del cupón del visitante es solo un texto en el navegador | Cumple |
| II. Idioma y mercado | Todo en español de Perú; `formatPEN`; vigencias y horas relativas en hora de Lima | Cumple |
| III. Cero alcance fantasma | Cada ruta y tabla se rastrea a HU-43 a HU-53; sin edición de reseñas, sin límite por cliente ni compra mínima de cupones (no se piden) | Cumple |
| IV. Verificable sin código | `quickstart.md` recorre las 11 historias con los datos de demostración | Cumple |
| V. Datos y pagos con respeto | Reseñas con nombre abreviado; avisos y favoritos solo del dueño; pagos siguen simulados; ningún secreto nuevo | Cumple |
| VI. Pruebas primero | Prueba de API o unitaria por historia antes de cada ruta; cupón y variantes con pruebas de concurrencia | Cumple |
| VII. Integridad de datos | Pedido, pago, stock de variante, canje de cupón y avisos en una transacción; `UPDATE` condicional; migración versionada | Cumple |
| VIII. Publicable en Cloudflare | Sin módulos nativos ni archivos locales; impresión por CSS del navegador | Cumple |
| IX. Experiencia cuidada | Estados de carga, vacío y error en cada pantalla; errores por campo; estrellas y corazón accesibles con teclado | Cumple |
| X. Tema claro y oscuro | Mismos tokens; la impresión fuerza colores claros | Cumple |
| XI. Trazabilidad | Pruebas y tareas con HU-xx | Cumple |

Re-check tras la Fase 1: sin violaciones; ver [research.md](research.md) para las decisiones que
sostienen la tabla.

## Project Structure

### Documentation (this feature)

```text
specs/003-experiencia-avanzada/
├── spec.md
├── plan.md              # este archivo
├── research.md          # decisiones R1 a R14
├── data-model.md        # tablas, columnas, reglas e invariantes
├── quickstart.md        # recorrido de validación con los datos de demostración
├── contracts/
│   └── api.md           # rutas de cliente y de administración
├── checklists/
│   └── requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── schema.ts                    # + product_variant, favorite, review, address, coupon, notification
│   └── seed-data.ts                 # + variantes, reseñas, favoritos, direcciones, cupones, avisos
├── shared/
│   ├── coupon.ts                    # NUEVO: couponDiscount() puro, estado del cupón, mensajes
│   ├── variant.ts                   # NUEVO: variantLabel(), rango de precios
│   ├── types.ts                     # + variantes en ProductCard/Detail y CartLine; Review, Address, Notification, Receipt
│   └── admin-types.ts               # + AdminVariant, AdminCoupon, AdminReview; AUDIT_LABEL nuevos
├── worker/
│   ├── routes/
│   │   ├── cart.ts                  # variantId en líneas; cupón en cotización
│   │   ├── catalog.ts               # precio «desde»/máximo, /products/:slug/related, variantes en el detalle
│   │   ├── checkout.ts              # addressId, couponCode, direcciones en /options
│   │   ├── account.ts               # /me escribe en la dirección predeterminada; /account/addresses
│   │   ├── orders.ts                # /orders/:number/receipt
│   │   ├── reviews.ts               # NUEVO: /catalog/products/:slug/reviews (público y del cliente)
│   │   ├── favorites.ts             # NUEVO
│   │   ├── notifications.ts         # NUEVO
│   │   └── admin/
│   │       ├── variants.ts          # NUEVO
│   │       ├── coupons.ts           # NUEVO
│   │       └── reviews.ts           # NUEVO (moderación)
│   └── services/
│       ├── variants.ts              # NUEVO: sync del producto, stock por variante, altas y bajas
│       ├── coupons.ts               # NUEVO: validar, canjear, devolver
│       ├── notifications.ts         # NUEVO: notifyOrderStatus()
│       ├── addresses.ts             # NUEVO: predeterminada y tope de 10
│       ├── pricing.ts               # quoteCart con variantes y cupón
│       ├── stock.ts                 # applyStockChange con variantId
│       └── orders.ts                # createOrder/cancelOrder con variante, cupón y avisos
└── web/
    ├── components/                  # StarRating, FavoriteButton, VariantPicker, NotificationBell, PriceRange
    ├── pages/                       # Favorites, Addresses, Notifications, Receipt; Product, Cart, Checkout, OrderDetail ampliados
    ├── stores/coupon.ts             # NUEVO: código de cupón pendiente del visitante
    └── admin/pages/                 # Coupons, Reviews; ProductForm con variantes y ProductVariants

drizzle/
└── 0003_experiencia_avanzada.sql    # generada con drizzle-kit + copia de direcciones

tests/
├── unit/                            # coupon, variant
└── api/                             # variants-service, variants-cart, favorites, reviews, addresses, coupons, related, receipt, notifications (+ admin/)

e2e/                                 # variantes-compra, extras-cliente, admin-extras; accesibilidad ampliada
```

**Structure Decision**: se mantiene el único proyecto web con Worker y SPA de las features 001 y 002.
Cada historia aporta su ruta (archivo propio del Worker o de `admin/`), su servicio cuando hay lógica
transaccional (variantes, cupones, avisos, direcciones) y su pantalla. No se crean paquetes ni
proyectos nuevos.

## Complexity Tracking

Sin violaciones de la constitución. La única decisión que se aparta de «lo más directo» es mantener en
`product` un resumen derivado de las variantes (precio «desde», precio máximo, stock y marca de «tiene
variantes»): se justifica en `research.md` R1 porque evita reescribir ~15 consultas de catálogo, panel y
pruebas, y se protege con una prueba de invariante y con bloqueo de la fila del producto en cada
cambio de stock de una variante.
