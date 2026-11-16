# Research: Experiencia avanzada

Decisiones técnicas de la feature 003. Cada una indica la historia que la exige, lo elegido, por qué y
qué se descartó. No hay marcadores «NEEDS CLARIFICATION» pendientes: las dudas de producto se resolvieron
en `spec.md` (sección Clarifications).

## R1. Variantes: tabla propia y resumen derivado en `product` (HU-43, HU-44, FR-001 a FR-008)

- **Decisión**: tabla `product_variant` con SKU único, atributos (`color`, `storage`, `ram`), precio,
  stock, foto opcional y estado. El producto **conserva** `price_cents` y `stock` y gana
  `has_variants` y `max_price_cents`. Un único servicio, `syncProductFromVariants(tx, productId)`, los
  recalcula: `price_cents` = menor precio de las variantes activas (o de todas si ninguna está activa),
  `max_price_cents` = mayor precio de las activas, `stock` = suma del stock de las activas y
  `has_variants` = existe alguna variante.
- **Por qué**: el catálogo, el filtro y el orden por precio (la clarificación pide el precio «desde»), la
  disponibilidad, «más vendidos», el resumen del panel y ~15 consultas más ya leen `product.price_cents`
  y `product.stock`. Con el resumen derivado no hay que tocarlas y las pruebas de la 001 y 002 siguen
  pasando (FR-037). Los productos sin variantes no cambian en nada (FR-008).
- **Integridad bajo concurrencia**: todo cambio de stock o de variante abre con
  `SELECT … FROM product WHERE id = $1 FOR UPDATE`. Con la fila del producto bloqueada, las compras
  simultáneas de variantes del mismo producto se serializan y la suma que lee el `sync` ya incluye lo
  confirmado por la otra transacción. El descuento sigue siendo un `UPDATE` condicional
  (`stock >= cantidad`) sobre la variante. Una prueba de invariante comprueba
  `product.stock = suma(stock de variantes activas)` después de ventas, cancelaciones y ajustes.
- **Primera variante de un producto con stock propio**: el stock del producto pasa a depender de sus
  variantes, así que se registra un movimiento `ajuste` de `-stock` («El stock del producto pasó a sus
  variantes») y cada variante nace con su movimiento `inicial` (spec, Edge Cases).
- **Borrar la última variante**: el producto vuelve a ser simple, con stock 0 y el último precio; el
  administrador lo repone con un ajuste. No se bloquea (la variante nunca vendida se puede borrar).
- **Descartado**: (a) calcular precio y stock en cada consulta con subconsultas o una vista: obligaba a
  reescribir el catálogo y complicaba el índice por precio; (b) un trigger de PostgreSQL: lógica
  oculta fuera del código y de las pruebas de API; (c) tratar el producto con variantes como varios
  productos: rompe reseñas, favoritos y relacionados, que son del producto.

## R2. Variante en carrito, pedido e historial de stock (HU-44, FR-006, FR-007)

- **Decisión**: `cart_item.variant_id`, `order_item.variant_id`, `order_item.variant_label`,
  `order_item.sku` y `stock_movement.variant_id`, todos opcionales. En el carrito de cuenta, la
  unicidad pasa de `(user_id, product_id)` a `(user_id, product_id, coalesce(variant_id, ''))` con un
  índice único de expresión, y el alta usa `INSERT … ON CONFLICT (user_id, product_id,
  (coalesce(variant_id,''))) DO UPDATE` con SQL directo de Drizzle.
- **Rutas**: se conservan `PUT /cart/items/:productId` y `DELETE /cart/items/:productId`; la variante
  viaja en el cuerpo (`variantId`) o en la consulta (`?variantId=`). Así las pruebas de la 001, que no
  usan variantes, no cambian.
- **Carrito del visitante** (Zustand): cada línea pasa a ser `{ productId, variantId?, quantity,
  seenPriceCents? }` y su clave es `productId` o `productId:variantId`; se sube a la versión 2 del
  almacén persistido con migración que deja las líneas existentes sin variante.
- **Línea sin variante de un producto con variantes** (clarificación): `quoteCart` la marca no
  disponible con un aviso nuevo `choose_variant` («Elige una variante de …»); el checkout ya rechaza
  cualquier aviso distinto de cambio de precio, así que no puede pagarse ni descuenta stock.
- **Pedido**: `createOrder` recibe `variantId`, `sku` y `label` por línea; para variantes descuenta con
  `UPDATE product_variant … WHERE stock >= n AND active` bajo el bloqueo de R1 y llama a
  `syncProductFromVariants`; el precio congelado es el de la variante (RN-07). `cancelOrder` devuelve
  el stock a la variante con `applyStockChange({ variantId })`.
- **Descartado**: cambiar el identificador de línea del carrito a un `lineId` propio: obliga a cambiar
  contratos y las pruebas de la 001; una clave compuesta es más pequeña.

## R3. Cupones: validación, canje y devolución (HU-49, HU-50, FR-020 a FR-025)

- **Decisión**: tabla `coupon` (código en mayúsculas único, `kind` `percent` o `fixed`, `value`,
  `starts_on` y `ends_on` como fechas de Lima, `max_uses`, `used_count`, `active`). El pedido guarda
  `coupon_id` y `coupon_code` y usa la columna `discount_cents` que la 001 ya dejó en `orders`.
- **Cálculo** (puro, en `src/shared/coupon.ts`, con pruebas unitarias): `percent` →
  `round(subtotal × valor / 100)`; `fixed` → `valor`; el descuento se limita a
  `max(0, subtotal − 100)` (el total de productos nunca baja de S/ 1.00); el envío nunca se descuenta.
  Los totales usan `orderTotals(lines, shipping, discount)` ya existente (RN-04, RN-14).
- **Validación** (`validateCoupon`): devuelve el cupón o un error con código y mensaje:
  `COUPON_NOT_FOUND`, `COUPON_INACTIVE`, `COUPON_NOT_STARTED`, `COUPON_EXPIRED`, `COUPON_EXHAUSTED`.
  La fecha de hoy se calcula en SQL con `(now() at time zone 'America/Lima')::date`, igual que los
  agregados de la 002.
- **Canje atómico**: dentro de la transacción de `createOrder`,
  `UPDATE coupon SET used_count = used_count + 1 WHERE id = $1 AND active AND used_count < max_uses
  AND starts_on <= hoy AND ends_on >= hoy RETURNING …`; si no devuelve fila, se revalida para dar el
  mensaje exacto y el pedido no se crea. Dos compras por el último uso: solo una gana (SC-004).
- **Devolución**: `cancelOrder` hace, en su transacción y bajo el bloqueo del pedido que ya toma,
  `UPDATE coupon SET used_count = greatest(used_count − 1, 0) WHERE id = (cupón del pedido)`. Cubre
  cliente, rechazo de pago, administrador y vencimiento a las 24 h con un solo cambio.
- **Estado en el cliente**: el código escrito se guarda en un almacén persistido (`rcube-cupon`) y se
  envía en cada cotización (`GET /cart?coupon=` y `POST /cart/quote`); el servidor responde con el
  descuento o con el error. El visitante no consulta al servidor: el cupón se aplica al pagar y se le
  pide iniciar sesión (spec US8, escenario 9). `POST /checkout/orders` recibe `couponCode` y
  `expectedTotalCents` ya con descuento; el servidor revalida todo.
- **Descartado**: guardar el cupón aplicado en la base por carrito (tabla extra sin necesidad) y
  tratar el descuento en el navegador (viola RNF-07).

## R4. Reseñas y moderación (HU-46, HU-47, RN-09, FR-012 a FR-015)

- **Decisión**: tabla `review` con `(product_id, user_id)` único, `rating` 1 a 5, `comment` opcional de
  hasta 1000 caracteres y `hidden`. Elegibilidad en el servidor:
  `EXISTS (order_item oi JOIN orders o ON o.id = oi.order_id WHERE o.user_id = $u AND o.status =
  'delivered' AND oi.product_id = $p)`. El `UNIQUE` hace cumplir «una por producto» aunque lleguen dos
  envíos a la vez.
- **Lectura**: `GET /catalog/products/:slug/reviews?page=` es público y devuelve promedio de las
  visibles (un decimal), cantidad, página de 5 y, con sesión, `mine` (su reseña, incluso oculta) y
  `canReview` con el motivo. El nombre se muestra como «Mateo Q.».
- **Moderación**: `GET /admin/reviews`, `POST /admin/reviews/:id/hide` y `/show`; cada una escribe la
  auditoría en la misma transacción con las acciones nuevas `resena_oculta` y `resena_visible`.
- **Descartado**: guardar promedio y cantidad en `product`: obliga a mantenerlos al ocultar y el
  volumen no lo justifica (un `AVG` indexado por producto).

## R5. Favoritos (HU-45, FR-009 a FR-011)

- **Decisión**: tabla `favorite` con clave primaria `(user_id, product_id)`. `PUT` y `DELETE` son
  idempotentes. `GET /favorites` devuelve las tarjetas con disponibilidad actual (incluye inactivos
  marcados «No disponible» para poder quitarlos) y `GET /favorites/ids` alimenta los corazones de las
  tarjetas con una sola consulta en caché de TanStack Query.
- **Visitante**: el corazón lleva a `/ingresar?volver=<ruta>&favorito=<id>`; al iniciar sesión se guarda
  el favorito y se vuelve a la ruta (el parámetro `volver` ya existe y está validado con `safeReturn`).
- **Corazón accesible**: botón con `aria-pressed` y nombre «Agregar a favoritos» o «Quitar de favoritos».

## R6. Direcciones (HU-48, FR-016 a FR-019)

- **Decisión**: tabla `address` con `is_default` y un índice único parcial
  `UNIQUE (user_id) WHERE is_default` que garantiza **una sola** predeterminada. El servicio
  `addresses.ts` aplica: la primera es predeterminada, cambiar la predeterminada es una transacción de
  dos `UPDATE`, borrar la predeterminada promueve la más reciente y el tope es 10.
- **Compatibilidad con la 001**: las columnas `user.address_line`, `district` y `address_reference`
  se **conservan** sin uso nuevo. `GET /account/me` lee la dirección predeterminada y `PATCH
  /account/me` escribe en ella (la crea como «Principal» si no existe), de modo que la pantalla de
  cuenta y sus pruebas de la 001 siguen igual. La migración copia la dirección única existente como
  primera dirección predeterminada. Retirar las columnas queda como limpieza para una feature futura.
- **Checkout**: `delivery.addressId` opcional; con él, el servidor carga la dirección del cliente y
  congela sus datos en el pedido; si ya no existe responde 400 «Esa dirección ya no existe; elige otra».
  Sin `addressId` se usa la dirección escrita a mano como hoy (la opción «Otra dirección»).

## R7. Avisos dentro de la app (HU-53, FR-029 a FR-031)

- **Decisión**: tabla `notification` (`user_id`, `order_id`, `order_number`, `message`, `read_at`,
  `created_at`) con índice `(user_id, read_at, created_at desc)`. Un único servicio
  `notifyOrderStatus(tx, order, toStatus, reason)` se llama en los tres lugares donde ya cambia el
  estado por el administrador o el sistema: `cancelOrder` (cuando el actor no es el cliente), el cambio
  de estado del panel y la confirmación de pago. No se avisa de lo que hace el propio cliente.
- **Texto**: «Tu pedido RC-000123 está Enviado» y, al cancelar, «Tu pedido RC-000123 fue cancelado:
  <motivo>».
- **Sondeo**: `GET /notifications/summary` devuelve `{ unread, latest[20] }` y la campana lo consulta
  con `refetchInterval: 60_000` y al enfocar la ventana. `GET /notifications?page=` para la lista
  completa de 20 en 20, `POST /notifications/:id/read` y `POST /notifications/read-all`.
- **Campana**: `Popover` de radix-ui (ya incluido en el paquete `radix-ui`), botón con nombre
  «Avisos, N sin leer» y contador de 1 a 99 o «99+».
- **Descartado**: correo, WebSockets y notificaciones del navegador (fuera de alcance, REQUISITOS §1).

## R8. Productos relacionados (HU-51, FR-026)

- **Decisión**: `GET /catalog/products/:slug/related` reutiliza `cardsQuery`: misma categoría, activos
  con marca y categoría activas, con stock, distinto del actual; orden determinista:
  misma marca primero, luego unidades vendidas (`soldUnits` ya existente en el catálogo) y `id`. Máximo
  4. Si no hay ninguno, el arreglo vacío oculta la sección.

## R9. Comprobante imprimible (HU-52, FR-027, FR-028)

- **Decisión**: `GET /orders/:number/receipt` devuelve el detalle del pedido más los datos de la tienda
  (nombre «R Cube», WhatsApp, dirección de recojo de la configuración) y del cliente; solo para el
  dueño (404 para otro, RN-08). La página `/pedidos/:number/comprobante` se imprime con CSS: `@media
  print` oculta encabezado, pie y botones, fuerza los tokens claros aunque esté `.dark` y usa
  `break-inside: avoid` por línea. Sin librerías de PDF: el navegador imprime o guarda como PDF.
- **Tamaño**: tipografía de impresión de 11 pt y márgenes de 15 mm; hasta 10 productos caben en una hoja
  A4 (SC-007, comprobado con la vista previa de impresión de Playwright: `page.pdf()` en la prueba e2e).
- **Montos**: salen de las columnas congeladas del pedido (`subtotal`, `discount`, `shipping`, `total`,
  base e IGV), nunca se recalculan (RN-07).

## R10. Migración y datos de demostración (RNF-10, FR-019, FR-036)

- **Decisión**: `drizzle-kit generate` produce `0003_experiencia_avanzada.sql` con tablas, columnas e
  índices; al final se agrega a mano un `INSERT INTO address … SELECT … FROM "user" WHERE address_line
  IS NOT NULL` (con `label = 'Principal'`, destinatario = nombre del usuario, `is_default = true`).
- **Seed**: `runSeed` agrega variantes a 3 productos (iPhone 15 Pro, Galaxy S24 y una laptop), con
  `syncProductFromVariants` al final; reseñas de los clientes con pedidos Entregados; favoritos;
  direcciones; 3 cupones (`BIENVENIDO10` vigente, `VERANO5` vencido y `ULTIMO` agotado) y avisos
  generados desde los eventos de los pedidos de demostración (algunos sin leer). El historial de
  stock del seed incluye movimientos de variantes y su suma sigue igualando el stock actual.

## R11. Auditoría de las acciones nuevas (FR-034)

- **Decisión**: se agregan a `AUDIT_ACTIONS` y a `AUDIT_LABEL`: `variante`, `cupon`, `resena_oculta` y
  `resena_visible`. Cada una se escribe con `audit(tx, …)` en la misma transacción del cambio, con el
  mismo contrato de la 002. La columna `action` es texto con enum de TypeScript; no requiere cambio de
  esquema.

## R12. Hora de Lima y fechas (RNF-01, spec Assumptions)

- **Decisión**: vigencias de cupón como columnas `date` (día calendario de Lima, sin hora); «hoy» y los
  estados Activo, Vencido y Agotado se calculan en SQL con `America/Lima`. Las horas relativas de los
  avisos («hace 5 min») se formatean en el navegador con `Intl.RelativeTimeFormat('es-PE')`.

## R13. Accesibilidad de los controles nuevos (RNF-03, FR-035)

- **Estrellas**: `radiogroup` con 5 `radio` (teclado con flechas), etiqueta «Calificación: N de 5» y
  estrellas decorativas con `aria-hidden`; el promedio se lee como «4,5 de 5, 12 reseñas».
- **Selector de variante**: grupo de botones `radio` por atributo con `aria-checked`, los agotados con
  `disabled` y texto «Agotado».
- **Contraste**: las insignias nuevas usan el estilo de 002 (fondo base y borde del color) que pasa AA
  en ambos temas; la prueba de accesibilidad se amplía a las pantallas nuevas.

## R14. Pruebas (RNF-08, FR-037)

- **API** (Vitest, proyecto `api`): una archivo por área con casos HU-xx; concurrencia con
  `Promise.all` para la última unidad de una variante y el último uso de un cupón.
- **Unitarias**: `coupon.ts` (porcentaje, monto, tope de S/ 1.00, redondeo) y `variant.ts`.
- **e2e** (Playwright): compra con variante y cupón, extras del cliente (favoritos, reseña, direcciones,
  avisos, comprobante) y administración (variantes, cupones, moderación). Las sesiones de administrador
  se reutilizan con `adminCookies` por el límite de ingresos. El tope de registros de Better Auth ya
  se subió a 30 por minuto.
- **Regresión**: `npm run check` y `npm run test:e2e` completos al cerrar.

## R15. Revisión de seguridad del diff de la 003 (T065, RNF-05, RNF-06, RN-08)

Comprobado sobre el código y con pruebas:

- **Autorización**: favoritos, avisos y reseñas (alta) usan `requireCustomer`; direcciones, `/account/me` y el
  comprobante usan sesión; las rutas nuevas de administración cuelgan del único `requireAdmin` del
  sub-router. `tests/api/admin/access.test.ts` recorre las 29 rutas anteriores y las 11 nuevas del panel
  (401 sin sesión, 403 con cliente) y las 15 rutas de cliente nuevas (401 sin sesión y con cliente bloqueado).
- **Propiedad de los datos (RN-08)**: toda consulta de favoritos, direcciones y avisos filtra por `user_id`;
  el comprobante usa `loadOrderDetail(…, userId)`. Lo ajeno responde 404 sin datos (pruebas por área).
- **Entradas**: `variantId`, `addressId` y `couponCode` se validan en el servidor (Zod y búsqueda con
  dueño); montos en céntimos enteros; SKU y códigos con formato fijo; comentario de reseña de hasta 1000
  caracteres.
- **Salida**: los comentarios de reseñas viajan como JSON y se pintan como texto de React (sin
  `dangerouslySetInnerHTML`); una prueba confirma que `<img onerror>` se devuelve literal.
- **Datos sensibles**: el comprobante y los avisos solo llevan los 4 últimos dígitos de la tarjeta (una
  prueba verifica que el número completo no aparece); la auditoría de cupones, variantes y reseñas guarda
  antes y después sin datos personales más allá del nombre abreviado.
- **SQL**: todo con parámetros de Drizzle; los únicos `sql.raw` son constantes literales de la 002.
- **Concurrencia**: stock de variantes y usos de cupón con `UPDATE` condicional bajo bloqueo; direcciones
  con bloqueo del cliente; pruebas de carrera de la última unidad y del último uso.

Limitaciones aceptadas (alcance de la feature): un cliente con sesión puede probar códigos de cupón sin un
límite propio de intentos (los códigos no son secretos y el descuento solo vale con usos disponibles); y
el tope de registros de Better Auth se subió a 30 por minuto (research de la corrección de CI).
