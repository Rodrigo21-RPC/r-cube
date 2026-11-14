# Feature Specification: Tienda y compra (R Cube)

**Feature Branch**: `001-tienda-compra`

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description: "Feature 001, Tienda y compra, de R Cube: tienda en línea de dispositivos electrónicos (celulares, laptops, tablets y accesorios) en Perú, con un solo vendedor y experiencia tipo Amazon. Fuente obligatoria: docs/requisitos/HISTORIAS-DE-USUARIO.md (HU-01 a HU-25) y docs/requisitos/REQUISITOS.md. 4 métodos de pago simulados (tarjeta, Yape o Plin, transferencia bancaria y WhatsApp; sin contra entrega), cancelación automática de pedidos impagos a las 24 horas, tema claro y oscuro, datos de demostración con las fotos de docs/fotos. Referencia visual: diseños de Stitch en docs/diseno (Kallpa y Chaski). Fuera: panel de administración (002) y variantes (003)."

**Fuentes**: `docs/requisitos/HISTORIAS-DE-USUARIO.md` (HU-01 a HU-25; HU-19 retirada) y
`docs/requisitos/REQUISITOS.md` (RNF-01 a RNF-10, RN-01 a RN-14, métodos de pago, estados del
pedido, datos de demostración). Si esta spec y esas fuentes difieren, mandan las fuentes.

**Referencia visual**: `docs/diseno/kallpa-01-catalogo-movil.png`, `kallpa-02-carrito-movil.png`,
`kallpa-03-pago-movil.png`, `chaski-01-catalogo-movil.png`, `chaski-02-detalle-producto-movil.png`,
`chaski-03-mi-pedido-movil.png`, `kallpa-DESIGN-comprador.md` y `chaski-DESIGN-comprador.md`. Las
imágenes muestran marcas antiguas (Kallpa, Chaski): se toma su estructura y estilo, con la marca
R Cube (`docs/fotos/r-cube-logo-oficial.png`) y el alcance de las historias.

## Clarifications

### Session 2026-11-12

- Q: ¿Qué pasa con el carrito guardado en el navegador cuando el cliente cierra sesión? → A: Se
  vacía en ese navegador y queda guardado en la cuenta.
- Q: ¿Puede una cuenta de administrador comprar en la tienda? → A: No; puede navegar la tienda, pero
  el checkout es solo para cuentas de cliente.
- Q: ¿El interruptor de tema tiene dos estados (claro y oscuro) o tres (claro, oscuro y sistema)? →
  A: Dos estados; sin elección guardada se sigue la preferencia del sistema.
- Q: ¿Qué pasa si el navegador no abre WhatsApp al confirmar un pedido por WhatsApp? → A: La pantalla
  de confirmación siempre muestra el botón «Abrir WhatsApp» para reintentar.
- Q: ¿Para qué volumen de datos y de personas se diseña la tienda? → A: Hasta 1 000 productos activos
  y 200 personas navegando a la vez sin perder el objetivo de 2,5 s.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Descubrir productos en el catálogo (Priority: P1)

Un visitante, sin cuenta, recorre el catálogo de R Cube, busca un producto por texto, filtra por
categoría, marca, precio y disponibilidad, ordena los resultados y abre el detalle de un producto
para decidir la compra. Cubre HU-01, HU-02, HU-03, HU-04 y HU-05.

**Why this priority**: Sin catálogo no hay compra; es la puerta de entrada de toda la tienda.

**Independent Test**: Con los datos de demostración cargados, un visitante encuentra «iPhone» por
búsqueda, filtra por la categoría Celulares y un rango de precio, ordena por precio y abre el
detalle de un producto con su galería, precio con IGV y disponibilidad.

**Acceptance Scenarios**:

1. **Given** 24 productos activos, **When** el visitante abre el catálogo, **Then** ve 12 tarjetas
   por página con foto, nombre, precio y disponibilidad, y controles para pasar de página (HU-01).
2. **Given** un producto desactivado en los datos, **When** el visitante recorre el catálogo o
   busca su nombre, **Then** ese producto no aparece (HU-01).
3. **Given** el catálogo, **When** el visitante busca «IPHONE» o «galaxy», **Then** ve las
   coincidencias en nombre, marca o descripción sin importar mayúsculas ni tildes, con el texto
   «N resultados para "…"» (HU-02).
4. **Given** una búsqueda sin coincidencias, **When** se muestra el resultado, **Then** aparece un
   mensaje claro de que no hay resultados y una forma de limpiar la búsqueda (HU-01, HU-02).
5. **Given** filtros de categoría, marca, rango de precio y «solo disponibles», **When** el
   visitante combina varios, **Then** los resultados cumplen todos, cada filtro activo se ve como
   una etiqueta que se puede quitar, la dirección de la página conserva los filtros (al recargar o
   compartirla se ven los mismos resultados) y «Limpiar filtros» los quita todos (HU-03).
6. **Given** resultados filtrados, **When** el visitante ordena por precio menor, precio mayor,
   novedad o relevancia y luego pasa de página o cambia un filtro, **Then** el orden se mantiene
   (HU-04).
7. **Given** un producto con stock 3, **When** el visitante abre su detalle, **Then** ve galería de
   fotos, nombre, marca, precio con IGV incluido, descripción, especificaciones, «Quedan 3» y el
   botón «Agregar al carrito» activo (HU-05).
8. **Given** un producto con stock 0, **When** el visitante abre su detalle, **Then** ve «Agotado»
   y el botón «Agregar al carrito» deshabilitado (HU-05).

---

### User Story 2 - Armar el carrito (Priority: P1)

Un visitante o cliente agrega productos al carrito, cambia cantidades y quita líneas, y ve el
total en soles con el desglose del IGV. El carrito se conserva en el navegador y, al iniciar
sesión, se fusiona con el de su cuenta. Si un precio o el stock cambiaron, el carrito avisa y se
ajusta. Cubre HU-11, HU-12 y HU-13.

**Why this priority**: Es el paso obligado entre descubrir y pagar.

**Independent Test**: Un visitante agrega dos productos, cambia una cantidad, recarga la página y
el carrito sigue igual, con contador en el encabezado y desglose correcto de base imponible e IGV.

**Acceptance Scenarios**:

1. **Given** un producto con stock 4, **When** el visitante lo agrega y sube la cantidad, **Then**
   no puede pasar de 4 y ve un mensaje que lo explica (HU-11, RN-01).
2. **Given** un carrito con líneas, **When** se muestra, **Then** cada línea tiene su subtotal, el
   encabezado muestra el número de unidades y el total aparece en soles con la base imponible y el
   IGV calculados según RN-14 (HU-11, RNF-01).
3. **Given** un visitante con carrito, **When** cierra y vuelve a abrir el navegador, **Then** su
   carrito sigue ahí (HU-12).
4. **Given** un visitante con el producto A ×1 en el navegador y una cuenta que ya tiene A ×2 y B ×1,
   **When** inicia sesión, **Then** el carrito queda con A ×3 y B ×1 en una sola línea por producto,
   sin superar el stock (HU-12).
5. **Given** un producto del carrito cuyo precio cambió o cuyo stock bajó por debajo de la cantidad,
   **When** el cliente abre el carrito o pasa al pago, **Then** ve un aviso por cada cambio, la
   cantidad se ajusta al stock disponible y el total usa el precio vigente calculado por el
   servidor (HU-13, RNF-07).
6. **Given** un producto del carrito que quedó agotado o desactivado, **When** se abre el carrito,
   **Then** la línea se marca como no disponible, no cuenta en el total y no puede pagarse (HU-13).
7. **Given** un carrito vacío, **When** se abre, **Then** muestra un estado vacío con un enlace al
   catálogo (RNF-02).

---

### User Story 3 - Cuenta del cliente (Priority: P1)

Un visitante se registra para poder comprar, inicia y cierra sesión, edita su perfil y cambia su
contraseña. Cubre HU-07, HU-08, HU-09 y HU-10.

**Why this priority**: Comprar exige cuenta; los pedidos se asocian al cliente.

**Independent Test**: Registrar una cuenta nueva, quedar con sesión iniciada, editar teléfono y
dirección, cerrar sesión y volver a entrar con la contraseña nueva.

**Acceptance Scenarios**:

1. **Given** el formulario de registro, **When** el visitante envía nombre, correo, teléfono y una
   contraseña de 8 o más caracteres con un correo no usado, **Then** se crea la cuenta y queda con
   sesión iniciada (HU-07).
2. **Given** un correo ya registrado o una contraseña de 7 caracteres, **When** envía el formulario,
   **Then** ve el error junto al campo correspondiente y no se crea la cuenta (HU-07).
3. **Given** credenciales inválidas, **When** intenta iniciar sesión, **Then** ve un mensaje
   genérico que no revela si el correo existe (HU-08).
4. **Given** 5 intentos fallidos seguidos para un mismo correo, **When** intenta otra vez, **Then**
   la cuenta queda bloqueada temporalmente 15 minutos con un mensaje que lo indica, aunque la
   contraseña sea correcta (HU-08).
5. **Given** una sesión iniciada, **When** pasan 7 días sin cerrarla, **Then** la sesión expira; y
   **When** el cliente pulsa «Cerrar sesión», **Then** la sesión termina en ese momento (HU-08).
6. **Given** el perfil, **When** el cliente edita nombre, teléfono y dirección de entrega y guarda,
   **Then** ve una confirmación; el correo se muestra pero no se puede editar (HU-09).
7. **Given** el cambio de contraseña, **When** el cliente escribe su contraseña actual correcta y una
   nueva de 8 o más caracteres, **Then** la contraseña cambia y todas sus demás sesiones se cierran;
   con la contraseña actual incorrecta ve un error y nada cambia (HU-10).

---

### User Story 4 - Checkout y pago (Priority: P1)

Un cliente con sesión elige cómo recibir el pedido (recojo en tienda o delivery por zona), indica
la dirección si corresponde, elige uno de los 4 métodos de pago simulados y confirma. El pedido se
crea con número correlativo, descuenta stock y muestra un resumen final. Los pedidos que quedan en
«Pendiente de pago» se cancelan solos a las 24 horas. Cubre HU-14, HU-15, HU-16, HU-17, HU-18,
HU-20 y HU-21, con RN-01 a RN-07 y RN-11 a RN-14.

**Why this priority**: Es el objetivo de la tienda: convertir un carrito en un pedido.

**Independent Test**: Comprar con la tarjeta 4111 1111 1111 1111 con delivery y obtener un pedido
`RC-…` en estado Pagado con el stock descontado; repetir con Yape y obtener uno en Pendiente de pago.

**Acceptance Scenarios**:

1. **Given** un carrito, **When** un visitante sin sesión pulsa «Pagar», **Then** se le pide iniciar
   sesión o registrarse y, al hacerlo, vuelve al checkout con su carrito (HU-07, HU-12).
2. **Given** el checkout, **When** el cliente elige recojo en tienda, **Then** el envío cuesta S/ 0.00
   y se muestra la dirección de la tienda; **When** elige delivery y una zona, **Then** el costo fijo
   de esa zona se suma al total antes de pagar (HU-14, RN-05).
3. **Given** delivery, **When** se muestra la dirección, **Then** viene precargada con los datos del
   perfil y exige nombre, teléfono, dirección y distrito (la referencia es opcional); con recojo en
   tienda esos campos no se piden (HU-15).
4. **Given** pago con tarjeta, **When** el cliente usa 4111 1111 1111 1111 con vencimiento futuro y
   CVV de 3 dígitos, **Then** el pago se aprueba, el pedido se crea en Pagado y se guarda solo los
   últimos 4 dígitos (HU-16, RNF-06).
5. **Given** pago con tarjeta, **When** usa 4000 0000 0000 0002, **Then** el pago se rechaza con un
   mensaje claro, no se crea ningún pedido, no se descuenta stock y el carrito sigue igual (HU-16).
6. **Given** pago con tarjeta, **When** el número no pasa la validación Luhn, el vencimiento ya pasó o
   el CVV no tiene 3 dígitos, **Then** ve el error en el campo y no se envía el pago (HU-16).
7. **Given** pago con Yape o Plin, **When** el cliente ve el QR y el número de ejemplo de R Cube y
   escribe el código de operación, **Then** el pedido se crea en Pendiente de pago con ese código
   (HU-17).
8. **Given** pago por transferencia, **When** el cliente ve los datos de la cuenta de ejemplo y el
   monto exacto y confirma, **Then** el pedido se crea en Pendiente de pago (HU-18).
9. **Given** coordinación por WhatsApp, **When** el cliente pulsa «Coordinar por WhatsApp», **Then**
   el pedido se crea en Pendiente de pago y se abre WhatsApp con el número de la tienda y un mensaje
   con N.º de pedido, productos, cantidades, total, método y forma de entrega (HU-20).
10. **Given** cualquier método, **When** se muestra el pago, **Then** se ve el aviso «Pago simulado,
    no se cobra dinero real» (HU-16, HU-17, RNF-06).
11. **Given** un pedido creado, **When** termina el checkout, **Then** la pantalla final muestra N.º
    de pedido con formato `RC-000001`, productos, subtotal, IGV, envío, total, método de pago, forma
    de entrega y siguientes pasos; si quedó pendiente, avisa que se cancelará si no se paga en 24
    horas; el carrito queda vacío (HU-21, RN-03, RN-04).
12. **Given** dos clientes que compran la última unidad de un producto al mismo tiempo, **When**
    ambos confirman, **Then** solo uno obtiene el pedido y el otro ve que el stock ya no alcanza
    (HU-21, RN-01, RN-02).
13. **Given** un pedido en Pendiente de pago creado hace más de 24 horas, **When** el sistema hace su
    revisión periódica, **Then** el pedido pasa a Cancelado con el motivo «Pago no recibido en 24 h»,
    autor «Sistema», y el stock vuelve (RN-12).

---

### User Story 5 - Mis pedidos (Priority: P2)

Un cliente revisa sus pedidos, abre el detalle con la línea de tiempo y cancela uno que aún no se
envió. Cubre HU-22, HU-23 y HU-24.

**Why this priority**: Da confianza después de pagar; depende de que exista la compra (US4).

**Independent Test**: Con un cliente de demostración que tiene pedidos, ver la lista, abrir uno con
su línea de tiempo y cancelar uno Pagado, comprobando que el stock vuelve.

**Acceptance Scenarios**:

1. **Given** un cliente con pedidos, **When** abre «Mis pedidos», **Then** ve solo los suyos, del más
   nuevo al más antiguo, con N.º, fecha, total y estado; sin pedidos ve un estado vacío (HU-22).
2. **Given** el N.º de un pedido de otro cliente, **When** intenta abrirlo, **Then** no ve ningún dato
   y recibe un mensaje de pedido no encontrado (HU-22, RN-08).
3. **Given** el detalle de un pedido, **When** lo abre, **Then** ve productos con el precio congelado
   del momento de la compra, montos con desglose, método de pago, dirección o recojo y la línea de
   tiempo con fecha y hora de cada cambio de estado (HU-23, RN-07).
4. **Given** un pedido en Pendiente de pago, Pagado o Preparando, **When** el cliente pulsa «Cancelar
   pedido», elige un motivo y confirma, **Then** el pedido pasa a Cancelado, la línea de tiempo
   registra el motivo y el stock vuelve (HU-24, RN-10).
5. **Given** un pedido Enviado, Entregado o Cancelado, **When** el cliente abre el detalle, **Then**
   no aparece la opción de cancelar (HU-24).

---

### User Story 6 - Página de inicio (Priority: P2)

Un visitante llega a la portada y descubre categorías, ofertas, más vendidos y novedades. Cubre
HU-06.

**Why this priority**: Mejora el descubrimiento, pero el catálogo ya permite comprar sin ella.

**Independent Test**: Abrir la portada con los datos de demostración y comprobar que las 4 secciones
tienen productos y que cada tarjeta lleva a su detalle.

**Acceptance Scenarios**:

1. **Given** los datos de demostración, **When** el visitante abre la portada, **Then** ve las
   secciones Categorías, Ofertas (productos con precio anterior mayor al actual, mostrando ambos
   precios), Más vendidos (por unidades en pedidos no cancelados) y Novedades (los más recientes)
   (HU-06).
2. **Given** una tarjeta de cualquier sección, **When** la pulsa, **Then** llega al detalle del
   producto; **When** pulsa una categoría, **Then** llega al catálogo filtrado por ella (HU-06).

---

### User Story 7 - Tema claro y oscuro (Priority: P1)

Cualquier persona cambia entre tema claro y oscuro con un interruptor visible; por defecto se sigue
la preferencia del sistema y la elección se recuerda. Cubre HU-25.

**Why this priority**: Es requisito transversal del producto (principio X) y afecta cada pantalla.

**Independent Test**: Con el sistema en modo oscuro, abrir la tienda (se ve oscura), cambiar a claro,
recargar (sigue clara y sin destello oscuro al cargar).

**Acceptance Scenarios**:

1. **Given** un primer ingreso con el sistema en modo oscuro, **When** se abre la tienda, **Then** se
   ve en tema oscuro (HU-25).
2. **Given** que la persona eligió tema claro, **When** recarga o vuelve otro día en el mismo
   navegador, **Then** la tienda carga directamente en claro, sin parpadeo del otro tema (HU-25).
3. **Given** cualquier pantalla de esta feature, **When** se ve en cualquiera de los dos temas,
   **Then** el texto y los controles cumplen contraste WCAG AA (HU-25, RNF-03).

---

### Edge Cases

- El stock de un producto baja mientras está en el carrito: aviso y ajuste (HU-13); si llega a 0
  justo al confirmar, el pedido no se crea y el cliente vuelve al carrito con el aviso (RN-02).
- El precio cambia entre el carrito y la confirmación: el pedido usa el precio vigente del servidor y
  el cliente ve el aviso antes de pagar (HU-13, RNF-07).
- El navegador envía un precio o total manipulado: se ignora; el servidor recalcula todo (RNF-07).
- Falla algo a mitad de la creación del pedido: no queda pedido, pago ni descuento de stock a medias
  (RN-02).
- Un cliente cancela un pedido en Pendiente de pago justo cuando vence a las 24 h: el pedido queda
  Cancelado una sola vez y el stock se devuelve una sola vez.
- La zona de delivery elegida deja de estar disponible antes de confirmar: el checkout pide elegir
  otra zona.
- Un método de pago está desactivado en la configuración de la tienda: no aparece en el checkout
  (los datos de demostración traen los 4 activos).
- Página de catálogo fuera de rango (por ejemplo, página 99): se muestra la última página válida; si
  no hay resultados, el estado vacío con enlace al inicio del catálogo.
- Falla la conexión al cargar cualquier pantalla: se muestra un estado de error con «Reintentar»
  (RNF-02).
- Foto de producto que no carga: se muestra la imagen genérica con el texto alternativo del producto.

## Requirements *(mandatory)*

### Functional Requirements

**Catálogo y detalle**

- **FR-001**: El sistema MUST mostrar el catálogo paginado a 12 productos por página, solo con
  productos activos, con foto, nombre, precio y disponibilidad en cada tarjeta (HU-01).
- **FR-002**: El sistema MUST permitir buscar por texto en nombre, marca y descripción, sin
  distinguir mayúsculas ni tildes, e indicar «N resultados para "…"» (HU-02).
- **FR-003**: El sistema MUST permitir combinar filtros de categoría, marca, rango de precio y
  disponibilidad, mostrar los filtros activos como etiquetas removibles, ofrecer «Limpiar filtros» y
  reflejar búsqueda, filtros, orden y página en la dirección de la página (HU-03).
- **FR-004**: El sistema MUST ordenar por relevancia, precio menor, precio mayor y novedad,
  conservando el orden al paginar y filtrar (HU-04).
- **FR-005**: El detalle de producto MUST mostrar galería, nombre, marca, precio con IGV,
  descripción, especificaciones y disponibilidad: «Quedan N» con stock de 1 a 5, «Agotado» con 0 y
  el botón «Agregar al carrito» deshabilitado si está agotado (HU-05).
- **FR-006**: La portada MUST mostrar las secciones Categorías, Ofertas, Más vendidos y Novedades,
  con tarjetas que llevan al detalle (HU-06).

**Cuenta**

- **FR-007**: El sistema MUST permitir registrarse con nombre, correo único, teléfono y contraseña de
  al menos 8 caracteres, con errores por campo, dejando la sesión iniciada al terminar (HU-07).
- **FR-008**: El sistema MUST responder con un mensaje genérico ante credenciales inválidas, bloquear
  el inicio de sesión de una cuenta durante 15 minutos tras 5 intentos fallidos seguidos y mantener la
  sesión 7 días o hasta que el cliente la cierre (HU-08, RNF-05).
- **FR-009**: El cliente MUST poder editar nombre, teléfono y una dirección de entrega (dirección,
  distrito y referencia), ver su correo sin poder editarlo y recibir confirmación al guardar (HU-09).
- **FR-010**: El cliente MUST poder cambiar su contraseña indicando la actual; la nueva tiene al menos
  8 caracteres y al cambiarla se cierran sus demás sesiones (HU-10).
- **FR-011**: Las contraseñas MUST guardarse solo como hash; la sesión MUST viajar en una cookie no
  accesible por scripts, solo por conexión segura y restringida al mismo sitio (RNF-05).

**Carrito**

- **FR-012**: Visitantes y clientes MUST poder agregar productos, cambiar cantidades y quitar líneas;
  la cantidad nunca supera el stock disponible; el encabezado muestra el número de unidades (HU-11,
  RN-01).
- **FR-013**: El carrito MUST mostrar subtotal por línea y total en soles con base imponible e IGV
  según RN-14 (HU-11, RNF-01).
- **FR-014**: El carrito del visitante MUST conservarse en el navegador; al iniciar sesión MUST
  fusionarse con el carrito de la cuenta dejando una línea por producto, con la suma de cantidades
  limitada al stock; al cerrar sesión, el carrito se vacía en ese navegador y sigue guardado en la
  cuenta (HU-12).
- **FR-015**: Al abrir el carrito y al iniciar el pago, el sistema MUST recalcular precios y stock en
  el servidor, avisar cada cambio de precio o stock, ajustar cantidades y marcar como no disponibles
  las líneas agotadas o desactivadas (HU-13, RNF-07).

**Checkout y pagos**

- **FR-016**: El checkout MUST exigir sesión iniciada con una cuenta de cliente y conservar el
  carrito al pasar por el inicio de sesión o el registro; una cuenta de administrador puede navegar
  la tienda pero no comprar, y ve un mensaje que lo indica (HU-07, HU-12).
- **FR-017**: El cliente MUST elegir recojo en tienda (sin costo, con la dirección de la tienda) o
  delivery con el costo fijo de una de las zonas configuradas; el costo se suma al total antes de
  pagar (HU-14, RN-05).
- **FR-018**: Con delivery, el sistema MUST pedir nombre, teléfono, dirección y distrito
  (obligatorios) y referencia (opcional), precargados desde el perfil (HU-15).
- **FR-019**: El checkout MUST ofrecer solo los métodos activos en la configuración de la tienda,
  entre tarjeta, Yape o Plin, transferencia bancaria y WhatsApp, con el aviso «Pago simulado, no se
  cobra dinero real» (RN-11, RNF-06).
- **FR-020**: El pago con tarjeta MUST validar número (Luhn), vencimiento no pasado y CVV de 3 dígitos;
  4111 1111 1111 1111 aprueba y crea el pedido en Pagado; 4000 0000 0000 0002 rechaza sin crear
  pedido ni tocar el stock; cualquier otro número válido se rechaza como «tarjeta no reconocida en
  modo de prueba»; solo se guardan los últimos 4 dígitos y nunca el CVV (HU-16, RNF-06).
- **FR-021**: El pago con Yape o Plin MUST mostrar el QR y el número de ejemplo configurados, pedir el
  código de operación (obligatorio, de 6 a 12 dígitos) y crear el pedido en Pendiente de pago (HU-17).
- **FR-022**: El pago por transferencia MUST mostrar banco, titular, número de cuenta y CCI de ejemplo
  configurados y el monto exacto, aceptar un número de operación opcional y crear el pedido en
  Pendiente de pago (HU-18).
- **FR-023**: La coordinación por WhatsApp MUST crear el pedido en Pendiente de pago y abrir WhatsApp
  hacia el número configurado con un mensaje que incluye N.º de pedido, productos, cantidades, total,
  método y forma de entrega; la pantalla de confirmación siempre muestra el botón «Abrir WhatsApp»
  por si el navegador no lo abrió (HU-20).
- **FR-024**: La creación del pedido MUST, en una sola operación indivisible, validar stock, calcular
  montos en el servidor, congelar nombre y precio de cada línea, registrar el pago y descontar stock;
  si algo falla, no queda nada a medias (RN-02, RN-07, RNF-07).
- **FR-025**: Cada pedido MUST recibir un número correlativo con formato `RC-000001` (RN-03) y un
  total igual a suma de líneas más envío menos descuento (en esta feature el descuento es 0), con
  base imponible e IGV según RN-14 (RN-04).
- **FR-026**: La pantalla de confirmación MUST mostrar N.º de pedido, productos, subtotal, IGV,
  envío, total, método de pago, entrega y siguientes pasos, incluido el aviso de vencimiento a las 24
  horas cuando el pedido queda pendiente; el carrito queda vacío (HU-21).
- **FR-027**: El sistema MUST cancelar automáticamente, al menos una vez por hora, los pedidos con más
  de 24 horas en Pendiente de pago, con motivo «Pago no recibido en 24 h», autor «Sistema» y
  devolución del stock (RN-12).

**Mis pedidos**

- **FR-028**: El cliente MUST ver solo sus pedidos, del más nuevo al más antiguo, con N.º, fecha,
  total y estado; cualquier intento de ver un pedido ajeno MUST responder como no encontrado (HU-22,
  RN-08).
- **FR-029**: El detalle del pedido MUST mostrar productos con precio congelado, montos con desglose,
  método de pago (con últimos 4 dígitos si fue tarjeta), entrega y la línea de tiempo con fecha, hora,
  estado, autor y motivo de cada cambio (HU-23).
- **FR-030**: El cliente MUST poder cancelar sus pedidos en Pendiente de pago, Pagado o Preparando,
  con confirmación y un motivo elegido de una lista («Ya no lo necesito», «Me equivoqué en el
  pedido», «Encontré otra opción», «Otro» con texto); el pedido queda Cancelado y el stock vuelve
  (HU-24, RN-10).
- **FR-031**: Los cambios de estado MUST respetar solo las transiciones válidas de REQUISITOS §5;
  ningún pedido pasa a Preparando sin estar Pagado (RN-11).

**Tema, experiencia y datos**

- **FR-032**: Toda pantalla de esta feature MUST ofrecer un interruptor de tema visible de dos
  estados (claro y oscuro), seguir la preferencia del sistema mientras la persona no elija, recordar la elección en el navegador y
  cargar sin parpadeo del otro tema (HU-25).
- **FR-033**: Toda pantalla que cargue datos MUST tener estados de carga, vacío y error con opción de
  reintentar; los formularios MUST mostrar errores junto a cada campo (RNF-02, principio IX).
- **FR-034**: Toda la interfaz MUST estar en español de Perú con precios en soles con dos decimales
  (por ejemplo, «S/ 5,288.00») (RNF-01).
- **FR-035**: El sistema MUST incluir datos de demostración repetibles: al menos 24 productos activos
  con las fotos de `docs/fotos` (tablets y productos sin foto con imagen genérica), al menos 1
  producto desactivado, 6 marcas, 4 categorías (Celulares, Laptops, Tablets, y Accesorios y
  repuestos), 1 administrador, 5 clientes, 8 pedidos en distintos estados, 3 zonas de delivery con
  costo y la configuración de la tienda (WhatsApp, Yape, Plin, cuenta bancaria, dirección de la
  tienda y métodos activos) (REQUISITOS §6).
- **FR-036**: Algunos productos de demostración MUST tener precio anterior (para Ofertas) y stock de 0
  y de 1 a 5 (para «Agotado» y «Quedan N»).

### Key Entities *(include if feature involves data)*

- **Producto**: artículo a la venta; nombre, marca, categoría, descripción, especificaciones
  (pares nombre y valor), precio, precio anterior opcional, stock, activo o no, fecha de alta, fotos
  ordenadas con una principal.
- **Categoría** y **Marca**: agrupan productos; tienen nombre y estado activo.
- **Usuario**: persona con cuenta; nombre, correo único, teléfono, rol (cliente o administrador),
  dirección de entrega (dirección, distrito, referencia), intentos fallidos y bloqueo temporal.
- **Sesión**: acceso iniciado de un usuario, con vencimiento a 7 días.
- **Carrito y línea de carrito**: carrito de un cliente con sesión; una línea por producto con
  cantidad.
- **Pedido**: compra de un cliente; N.º correlativo, estado, forma de entrega, zona y costo de envío,
  datos de entrega, subtotal, base imponible, IGV, descuento, total, fecha de creación.
- **Línea de pedido**: producto, nombre y precio congelados, cantidad y subtotal.
- **Pago**: método, estado, últimos 4 dígitos (tarjeta), código o número de operación (Yape, Plin o
  transferencia), monto.
- **Evento de pedido**: cambio de estado en la línea de tiempo; estado anterior y nuevo, autor
  (cliente, administrador o Sistema), fecha y hora, motivo.
- **Zona de delivery**: nombre, costo fijo y estado activo.
- **Configuración de la tienda**: número de WhatsApp, datos de Yape y Plin, cuenta bancaria, dirección
  de recojo y métodos de pago activos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona nueva encuentra un producto concreto por búsqueda o filtros y llega a su
  detalle en menos de 1 minuto.
- **SC-002**: Un cliente con sesión completa una compra con tarjeta, desde el carrito hasta la
  confirmación, en menos de 3 minutos.
- **SC-003**: La página de catálogo se ve completa en menos de 2,5 segundos en una conexión móvil
  normal (RNF-04).
- **SC-004**: En 100 % de las pruebas, no se vende más que el stock, un pago rechazado no crea pedido,
  un cliente no ve pedidos ajenos y el total cobrado coincide con el calculado en el servidor.
- **SC-005**: Los criterios de aceptación de las 24 historias activas (HU-01 a HU-25, sin HU-19) se
  comprueban usando solo la app, en tema claro y en tema oscuro.
- **SC-006**: Todas las pantallas de la feature cumplen contraste WCAG 2.2 AA y se pueden usar solo
  con teclado en ambos temas.
- **SC-007**: Ningún pedido queda en Pendiente de pago más de 25 horas.
- **SC-008**: Con 1 000 productos activos y 200 personas navegando a la vez, el catálogo y la
  búsqueda mantienen el objetivo de SC-003.

## Assumptions

- Esta feature no incluye el panel de administración: la confirmación de pagos de Yape, Plin y
  transferencia, el bloqueo de clientes y la edición de la configuración llegan en la 002; aquí la
  configuración y los productos vienen de los datos de demostración.
- La cuenta de administrador de los datos de demostración existe; en esta feature puede navegar la
  tienda pero no comprar, y su panel llega en la 002.
- «Relevancia» ordena, cuando hay búsqueda, primero coincidencias en el nombre, luego en la marca y
  luego en la descripción; sin búsqueda equivale a novedad.
- «Más vendidos» cuenta unidades en pedidos no cancelados; con empate, por novedad.
- La fusión de carritos suma cantidades del mismo producto y las limita al stock disponible.
- El bloqueo por intentos fallidos dura 15 minutos y el contador se reinicia con un inicio de sesión
  correcto.
- El perfil guarda una sola dirección; varias direcciones son de la feature 003 (HU-48).
- El recojo en tienda pasa de Preparando a Entregado sin Enviado (REQUISITOS §5); esos cambios los
  hace el administrador en la 002.
- Precios con formato «S/ 5,288.00» (punto decimal y coma de miles), como en los diseños.
- Las imágenes de Stitch tienen marcas antiguas y solo tema claro; el tema oscuro se construye con
  los colores de la guía (fondo #0B0B0F, tarjetas #17171C, bordes #2A2A31, texto #F5F5F7 y #A1A1AA)
  y el mismo acento del tema claro.
- Fuera de alcance (REQUISITOS §1): pagos reales, contra entrega, correos, recuperación de contraseña
  por correo, facturación electrónica, varios vendedores, idiomas o monedas.
