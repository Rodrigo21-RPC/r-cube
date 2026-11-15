# Feature Specification: Administración (R Cube)

**Feature Branch**: `002-administracion`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Feature 002, Administración, de R Cube. Fuente obligatoria: docs/requisitos/HISTORIAS-DE-USUARIO.md (HU-26 a HU-42) y docs/requisitos/REQUISITOS.md. Panel protegido por rol con resumen, productos con fotos en R2, categorías y marcas, stock con historial, pedidos con transiciones válidas, confirmación y rechazo de pagos por Yape, Plin y transferencia, clientes, configuración de la tienda (WhatsApp, datos de pago y delivery por zona), exportación a CSV y registro de auditoría. Referencia visual: diseños de administración de Stitch (Kallpa y Chaski), en tema claro y oscuro. Fuera: variantes, reseñas, cupones y demás historias de la 003."

**Fuentes**: `docs/requisitos/HISTORIAS-DE-USUARIO.md` (HU-26 a HU-42) y `docs/requisitos/REQUISITOS.md`
(RNF-01 a RNF-10, RN-01 a RN-14, métodos de pago y estados del pedido §4 y §5). Si esta spec y esas
fuentes difieren, mandan las fuentes. Esta feature se construye sobre la 001 ya fusionada: reutiliza
sus cuentas, pedidos, pagos, línea de tiempo, configuración de la tienda y tema claro y oscuro.

**Referencia visual**: `docs/diseno/kallpa-04-resumen-admin-escritorio.png`,
`kallpa-05-productos-admin-escritorio.png`, `kallpa-06-detalle-pedido-admin-escritorio.png`,
`chaski-04-acceso-administrador-escritorio.png`, `chaski-05-panel-administracion-escritorio.png`,
`chaski-06-agregar-producto-escritorio.png`, `kallpa-DESIGN-administrador.md` y
`chaski-DESIGN-administrador.md`. Se toma su estructura (menú lateral, tarjetas de indicadores, tablas,
formularios) con la marca R Cube y el alcance de las historias; el tema oscuro usa los tokens de la 001.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acceso al panel y resumen del negocio (Priority: P1)

El administrador entra a `/admin` con su cuenta y ve el resumen de la tienda: ventas de hoy, pedidos
por preparar, pagos por confirmar, clientes registrados, productos con stock bajo, ventas de los
últimos 30 días, ventas por categoría, los 5 productos más vendidos y los últimos pedidos. Un cliente
que intenta entrar ve «sin permiso». Cubre HU-26 y HU-27.

**Why this priority**: Sin acceso protegido no existe el panel; el resumen es la pantalla de entrada.

**Independent Test**: Con los datos de demostración, ingresar como `admin@rcube.pe` y ver las 5
tarjetas, el gráfico y las listas; ingresar como cliente e intentar `/admin` y recibir «sin permiso».

**Acceptance Scenarios**:

1. **Given** un visitante sin sesión, **When** abre `/admin`, **Then** ve el formulario de ingreso del
   panel; al ingresar con una cuenta de administrador llega al resumen (HU-26).
2. **Given** un cliente con sesión, **When** abre `/admin` o cualquier ruta del panel, **Then** ve una
   página «No tienes permiso para entrar al panel» con enlace a la tienda (HU-26).
3. **Given** cualquier petición a la API del panel sin sesión o con una sesión de cliente, **When**
   llega al servidor, **Then** se rechaza (sin sesión: «inicia sesión»; cliente: «sin permiso») sin
   devolver datos (HU-26, RNF-05).
4. **Given** pedidos de hoy y de días anteriores, **When** el administrador abre el resumen, **Then** ve
   ventas de hoy (suma de pedidos de hoy que no están en Pendiente de pago ni Cancelado), pedidos por
   preparar (Pagado y Preparando), pagos por confirmar (Pendiente de pago), clientes registrados y
   productos activos con stock de 5 o menos (HU-27).
5. **Given** el resumen, **When** se muestra, **Then** incluye un gráfico de ventas diarias de los
   últimos 30 días, las ventas por categoría y los 5 productos más vendidos de ese periodo, y los 5
   últimos pedidos con enlace a su detalle (HU-27).
6. **Given** el panel, **When** el administrador cambia el tema, **Then** todo el panel funciona en
   claro y oscuro con contraste AA (HU-25, RNF-03).

---

### User Story 2 - Gestionar productos, categorías y marcas (Priority: P1)

El administrador crea y edita productos, los activa o desactiva sin borrarlos, busca y filtra la lista,
y gestiona categorías y marcas. Cubre HU-28, HU-29, HU-30 y HU-32.

**Why this priority**: El catálogo deja de depender de los datos de demostración.

**Independent Test**: Crear «Tablet de prueba» con precio y stock, verlo en la tienda, editar su precio,
desactivarlo y comprobar que desaparece de la tienda pero sigue en los pedidos anteriores.

**Acceptance Scenarios**:

1. **Given** el formulario de producto, **When** el administrador guarda nombre, marca, categoría,
   descripción, especificaciones, precio, precio anterior opcional y stock inicial válidos, **Then** el
   producto se crea y aparece en la tienda si está activo (HU-28).
2. **Given** precio 0 o negativo, precio anterior menor o igual al precio, nombre vacío o datos que el
   servidor no acepta, **When** guarda, **Then** ve el error junto a cada campo y nada se guarda (HU-28).
3. **Given** un producto existente, **When** el administrador cambia su precio, **Then** la tienda muestra
   el nuevo precio, los pedidos anteriores conservan el precio de ese momento y el cambio queda en la
   auditoría con el precio anterior y el nuevo (HU-28, RN-07, HU-42).
4. **Given** un producto activo con pedidos, **When** lo desactiva, **Then** desaparece del catálogo,
   la búsqueda y el detalle de la tienda, sus pedidos anteriores siguen mostrándolo, y puede reactivarse
   (HU-29, RN-06).
5. **Given** la lista de productos, **When** el administrador busca por nombre y filtra por categoría,
   estado (activo o inactivo) y stock bajo, **Then** ve los resultados combinados en páginas de 20
   (HU-30).
6. **Given** las categorías y marcas, **When** el administrador crea una nueva, renombra una existente o
   la desactiva, **Then** el cambio se refleja en los filtros de la tienda; desactivar una que tiene
   productos activos muestra cuántos productos dejarán de verse y pide confirmación (HU-32).
7. **Given** un nombre de categoría o marca ya usado, **When** intenta guardarlo, **Then** ve un error
   claro y no se duplica (HU-32).

---

### User Story 3 - Fotos de productos (Priority: P1)

El administrador sube hasta 6 fotos por producto, elige la principal, las reordena y las borra; se
guardan en el almacenamiento de archivos de la tienda. Cubre HU-31.

**Why this priority**: Un producto nuevo sin fotos no se puede vender bien.

**Independent Test**: Subir 2 fotos JPG a un producto nuevo, marcar la segunda como principal, ver que
la tienda muestra esa primero; intentar subir un PDF o una foto de 3 MB y ver el rechazo.

**Acceptance Scenarios**:

1. **Given** un producto, **When** el administrador sube una foto JPG, PNG o WebP de hasta 2 MB, **Then**
   se guarda y aparece en la galería del producto en el panel y en la tienda (HU-31).
2. **Given** un archivo de otro tipo o de más de 2 MB, **When** lo sube, **Then** ve un mensaje claro y
   no se guarda nada (HU-31).
3. **Given** un producto con 6 fotos, **When** intenta subir otra, **Then** se rechaza con el mensaje
   «Máximo 6 fotos por producto» (HU-31).
4. **Given** varias fotos, **When** marca una como principal o cambia el orden, **Then** la tienda usa
   ese orden y esa foto en la tarjeta y el detalle (HU-31).
5. **Given** una foto, **When** el administrador la borra y confirma, **Then** desaparece del producto;
   si era la principal, la siguiente pasa a serlo; sin fotos, la tienda usa la imagen genérica (HU-31).
6. **Given** el texto alternativo, **When** se sube una foto, **Then** toma por defecto el nombre del
   producto y el administrador puede editarlo (RNF-03).

---

### User Story 4 - Ajustar stock con historial (Priority: P1)

El administrador ajusta el stock de un producto indicando cantidad y motivo; cada ajuste queda en un
historial. Cubre HU-33.

**Why this priority**: El stock correcto es la base de RN-01 (no vender más que el stock).

**Independent Test**: Sumar 5 unidades con motivo «Llegada de mercadería», restar 2 con motivo
«Producto dañado», ver el historial con autor, fecha y cantidades, e intentar dejar el stock negativo.

**Acceptance Scenarios**:

1. **Given** un producto con stock 3, **When** el administrador registra +5 con motivo, **Then** el stock
   queda en 8 y el historial muestra quién, cuándo, cuánto (+5), stock anterior (3), stock nuevo (8) y
   el motivo (HU-33).
2. **Given** un producto con stock 3, **When** intenta registrar −4, **Then** se rechaza con un mensaje
   claro y el stock no cambia (HU-33).
3. **Given** un ajuste sin motivo o con cantidad 0, **When** lo envía, **Then** ve el error del campo
   (HU-33).
4. **Given** las ventas y cancelaciones de la tienda, **When** cambian el stock, **Then** el historial
   también las muestra con su origen («Venta RC-…», «Cancelación RC-…») para explicar cada cambio
   (HU-33).
5. **Given** un ajuste de stock, **When** se guarda, **Then** queda también en la auditoría (HU-42).

---

### User Story 5 - Gestionar pedidos (Priority: P1)

El administrador lista y filtra pedidos, abre el detalle, cambia el estado solo por transiciones
válidas y exporta la lista a CSV. Cubre HU-34, HU-35 y HU-37.

**Why this priority**: Es la operación diaria de la tienda; sin ella los pedidos no avanzan.

**Independent Test**: Filtrar pedidos Pagados, abrir uno, pasarlo a Preparando y luego a Enviado, ver
la línea de tiempo con autor y hora, y exportar los pedidos filtrados a CSV.

**Acceptance Scenarios**:

1. **Given** la lista de pedidos, **When** el administrador filtra por estado, método de pago, rango de
   fechas y texto (N.º de pedido, nombre o correo del cliente), **Then** ve los pedidos que cumplen todo,
   del más nuevo al más antiguo, en páginas de 20 (HU-34).
2. **Given** el detalle de un pedido, **When** se muestra, **Then** incluye cliente con su contacto,
   productos, montos con desglose de IGV, pago (con últimos 4 dígitos o código de operación), entrega y
   la línea de tiempo (HU-35).
3. **Given** un pedido, **When** el administrador abre el cambio de estado, **Then** solo ve los estados
   a los que puede pasar según REQUISITOS §5 (por ejemplo, un pedido de recojo pasa de Preparando a
   Entregado; uno con delivery, de Preparando a Enviado) (HU-35, RN-11).
4. **Given** un cambio de estado válido, **When** lo guarda, **Then** la línea de tiempo registra el
   cambio con el administrador como autor y la fecha y hora, y el cliente lo ve en «Mis pedidos»
   (HU-35).
5. **Given** un pedido en Pendiente de pago, Pagado o Preparando, **When** el administrador lo cancela
   indicando el motivo, **Then** pasa a Cancelado, el stock vuelve y el motivo queda en la línea de
   tiempo (HU-35, RN-10).
6. **Given** una transición inválida enviada al servidor (por ejemplo, Entregado → Preparando), **When**
   llega, **Then** se rechaza y nada cambia (HU-35).
7. **Given** filtros activos en la lista, **When** el administrador pulsa «Exportar CSV», **Then**
   descarga un archivo con los pedidos que cumplen esos filtros (todas las páginas) y las columnas N.º,
   fecha, cliente, total, método y estado, que se abre en una hoja de cálculo con tildes correctas
   (HU-37).

---

### User Story 6 - Confirmar o rechazar pagos (Priority: P1)

El administrador revisa los pagos pendientes con su código de operación y los confirma o rechaza.
Cubre HU-36 con RN-12 y RN-13.

**Why this priority**: Yape, Plin, transferencia y WhatsApp dejan pedidos pendientes que solo el
administrador puede confirmar.

**Independent Test**: Con un pedido Yape pendiente de los datos de demostración, confirmarlo y verlo en
Pagado; con otro, rechazarlo con motivo y verlo Cancelado con el stock devuelto.

**Acceptance Scenarios**:

1. **Given** pedidos en Pendiente de pago, **When** el administrador abre «Pagos por confirmar»,
   **Then** ve N.º, cliente, método, monto, código de operación (si existe), antigüedad y cuánto falta
   para el vencimiento de 24 horas, del más antiguo al más nuevo (HU-36, RN-12).
2. **Given** un pago pendiente, **When** lo confirma, **Then** el pedido pasa a Pagado, el pago queda
   confirmado, la línea de tiempo registra al administrador y desaparece de la lista (HU-36).
3. **Given** un pago pendiente, **When** lo rechaza indicando el motivo, **Then** el pedido pasa a
   Cancelado con ese motivo, el stock vuelve y el pago queda rechazado (HU-36, RN-13).
4. **Given** un pedido que venció o que el cliente canceló mientras el administrador lo tenía abierto,
   **When** intenta confirmarlo, **Then** ve un mensaje de que el pedido ya no está pendiente y nada
   cambia (HU-36).

---

### User Story 7 - Clientes (Priority: P2)

El administrador busca clientes, ve su detalle con historial de pedidos y puede bloquearlos o
reactivarlos. Cubre HU-38, HU-39 y HU-40.

**Why this priority**: Importante para atención y control, pero la tienda opera sin ello.

**Independent Test**: Buscar «mateo», abrir su detalle, bloquearlo, comprobar que no puede iniciar
sesión ni comprar, y reactivarlo.

**Acceptance Scenarios**:

1. **Given** la lista de clientes, **When** el administrador busca por nombre o correo, **Then** ve
   nombre, correo, fecha de registro, N.º de pedidos y total gastado (pedidos que no están en Pendiente
   de pago ni Cancelado), en páginas de 20 (HU-38).
2. **Given** un cliente, **When** abre su detalle, **Then** ve sus datos, dirección, fecha de registro,
   estado (activo o bloqueado) y su historial de pedidos con enlace a cada uno (HU-39).
3. **Given** un cliente activo, **When** el administrador lo bloquea y confirma, **Then** sus sesiones
   abiertas dejan de valer, no puede iniciar sesión ni comprar, y al intentarlo ve «Tu cuenta está
   bloqueada…» (HU-40, RN-08).
4. **Given** un cliente bloqueado, **When** el administrador lo reactiva, **Then** puede volver a
   iniciar sesión (HU-40).
5. **Given** el bloqueo o la reactivación, **When** ocurre, **Then** queda en la auditoría (HU-42).

---

### User Story 8 - Configurar la tienda (Priority: P1)

El administrador configura el número de WhatsApp, los datos de Yape, Plin y la cuenta bancaria, las
zonas de delivery con su costo y los métodos de pago activos; el checkout refleja los cambios. Cubre
HU-41.

**Why this priority**: El checkout de la 001 depende de esta configuración.

**Independent Test**: Cambiar el costo de una zona, desactivar transferencia y cambiar el número de
WhatsApp; luego ir al checkout como cliente y ver los tres cambios.

**Acceptance Scenarios**:

1. **Given** la configuración, **When** el administrador cambia el número de WhatsApp, los números de
   Yape y Plin o los datos bancarios (banco, titular, cuenta y CCI) y guarda, **Then** el checkout y el
   enlace de WhatsApp usan los datos nuevos (HU-41).
2. **Given** los métodos de pago, **When** desactiva uno, **Then** deja de aparecer en el checkout; no se
   puede dejar la tienda sin ningún método activo (HU-41, FR-019 de la 001).
3. **Given** las zonas de delivery, **When** el administrador crea una, cambia su nombre o costo, o la
   desactiva, **Then** el checkout muestra solo las activas con su costo; los pedidos anteriores
   conservan el costo congelado (HU-41, RN-05).
4. **Given** datos inválidos (número de WhatsApp sin 11 dígitos con prefijo 51, CCI sin 20 dígitos, costo
   negativo), **When** guarda, **Then** ve el error del campo y nada cambia (HU-41).
5. **Given** cualquier cambio de configuración, **When** se guarda, **Then** queda en la auditoría con
   los valores anteriores y nuevos (HU-42).

---

### User Story 9 - Registro de auditoría (Priority: P2)

El administrador consulta la lista de acciones del panel: quién, qué y cuándo. Cubre HU-42.

**Why this priority**: Da trazabilidad; las acciones ya se registran en cada historia.

**Independent Test**: Cambiar un precio, ajustar stock, confirmar un pago y cambiar la configuración;
abrir la auditoría y ver las cuatro acciones con autor, fecha y detalle.

**Acceptance Scenarios**:

1. **Given** acciones del panel, **When** el administrador abre la auditoría, **Then** ve, de la más
   nueva a la más antigua y en páginas de 30, el autor, la fecha y hora, el tipo de acción, el objeto
   afectado y un detalle legible (por ejemplo, «Precio de iPhone 15 Pro: S/ 4,899.00 → S/ 4,599.00»)
   (HU-42).
2. **Given** la auditoría, **When** filtra por tipo de acción (precio, stock, estado de pedido, pago,
   configuración, producto, categoría o marca, cliente), **Then** ve solo ese tipo (HU-42).
3. **Given** el registro, **When** se consulta, **Then** no se puede editar ni borrar desde el panel
   (HU-42).

### Edge Cases

- Dos administradores cambian el estado del mismo pedido a la vez: solo el primer cambio válido se
  aplica; el segundo ve que el estado ya cambió y la lista se actualiza.
- El vencimiento automático de 24 horas cancela un pedido mientras el administrador lo revisa: la
  confirmación posterior se rechaza con un mensaje claro (US6, escenario 4).
- Se sube una foto con extensión `.jpg` que en realidad no es una imagen: se rechaza.
- Se desactiva la categoría o la marca de productos que están en carritos de clientes: esos productos
  pasan a «no disponible» en el carrito, como en la 001.
- Se desactiva un producto que está en carritos: pasa a «no disponible» en el carrito (HU-13).
- La exportación CSV no tiene resultados: descarga un archivo solo con los encabezados.
- Un nombre de cliente con comas o comillas en el CSV: el archivo sigue siendo válido.
- Se intenta bloquear la propia cuenta de administrador o a otro administrador: no está permitido.
- Se cambia el precio de un producto mientras un cliente está en el checkout: el cliente recibe el
  aviso de precio cambiado de la 001 antes de pagar.
- Error de red o del servidor en cualquier pantalla del panel: estado de error con «Reintentar».

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y resumen**

- **FR-001**: El panel MUST estar en `/admin`, con su propio formulario de ingreso; solo las cuentas con
  rol administrador pueden usarlo; un cliente ve «sin permiso» (HU-26).
- **FR-002**: Toda operación del panel en el servidor MUST exigir sesión de administrador y rechazar
  la petición sin sesión o con otro rol, sin devolver datos (HU-26, RNF-05).
- **FR-003**: El resumen MUST mostrar ventas de hoy, pedidos por preparar (Pagado y Preparando), pagos
  por confirmar (Pendiente de pago), clientes registrados y productos activos con stock de 5 o menos
  (HU-27).
- **FR-004**: El resumen MUST mostrar un gráfico de ventas diarias de los últimos 30 días, las ventas por
  categoría y los 5 productos más vendidos de ese periodo, y los 5 últimos pedidos; «ventas» suma los
  pedidos que no están en Pendiente de pago ni Cancelado, por día calendario de Lima (HU-27).

**Catálogo**

- **FR-005**: El administrador MUST poder crear y editar productos con nombre, marca, categoría,
  descripción, especificaciones (pares nombre y valor), precio mayor que 0, precio anterior opcional
  mayor que el precio y stock inicial mayor o igual a 0; todo validado en el servidor (HU-28).
- **FR-006**: Editar un producto MUST NOT cambiar su stock; el stock solo cambia por ajustes (FR-012),
  ventas y cancelaciones (HU-33).
- **FR-007**: El administrador MUST poder activar y desactivar productos sin borrarlos; el producto
  inactivo no se lista ni se vende, y sus pedidos lo conservan (HU-29, RN-06).
- **FR-008**: La lista de productos del panel MUST permitir buscar por nombre y filtrar por categoría,
  estado y stock bajo (5 o menos), paginada de 20 en 20, y mostrar foto principal, precio, stock y
  estado (HU-30).
- **FR-009**: El administrador MUST poder subir hasta 6 fotos por producto (JPG, PNG o WebP, hasta 2 MB,
  verificando que el contenido sea realmente una imagen), elegir la principal, reordenarlas, editar su
  texto alternativo y borrarlas; se guardan en el almacenamiento de archivos de la tienda (HU-31).
- **FR-010**: El administrador MUST poder crear, renombrar, desactivar y reactivar categorías y marcas,
  con nombres únicos; desactivar una con productos activos MUST mostrar cuántos dejarán de verse y
  pedir confirmación (HU-32).

**Stock**

- **FR-011**: Cada cambio de stock MUST quedar en un historial con producto, cantidad (positiva o
  negativa), stock anterior, stock nuevo, origen (ajuste, venta, cancelación o stock inicial), motivo,
  autor y fecha (HU-33).
- **FR-012**: El ajuste manual MUST pedir cantidad distinta de 0 y motivo, y MUST rechazarse si deja el
  stock negativo; el cambio de stock y su registro ocurren juntos (HU-33, RNF-07).
- **FR-013**: Las ventas y cancelaciones de la 001 MUST registrar su movimiento en el mismo historial,
  dentro de la misma operación que cambia el stock (HU-33, RN-02, RN-10).

**Pedidos y pagos**

- **FR-014**: La lista de pedidos MUST filtrar por estado, método de pago, rango de fechas y texto (N.º,
  nombre o correo del cliente), ordenar del más nuevo al más antiguo y paginar de 20 en 20 (HU-34).
- **FR-015**: El detalle del pedido MUST mostrar cliente y contacto, productos, montos con desglose,
  pago, entrega y línea de tiempo (HU-35).
- **FR-016**: El cambio de estado MUST ofrecer y aceptar solo las transiciones válidas de REQUISITOS §5;
  cada cambio MUST registrar autor, fecha y hora en la línea de tiempo; cancelar MUST pedir motivo y
  devolver el stock (HU-35, RN-10, RN-11).
- **FR-017**: Un cambio de estado sobre un pedido que ya cambió (por otro administrador, el cliente o el
  vencimiento) MUST rechazarse sin efectos (HU-35, HU-36).
- **FR-018**: La lista «Pagos por confirmar» MUST mostrar los pedidos en Pendiente de pago con N.º,
  cliente, método, monto, código de operación, antigüedad y tiempo restante hasta el vencimiento de 24
  horas (HU-36, RN-12).
- **FR-019**: Confirmar un pago MUST pasar el pedido a Pagado y el pago a confirmado; rechazarlo MUST
  pedir motivo, pasar el pedido a Cancelado, devolver el stock y marcar el pago como rechazado (HU-36,
  RN-13).
- **FR-020**: La exportación MUST generar un CSV con los pedidos que cumplen los filtros activos (todas
  las páginas) y las columnas N.º, fecha, cliente, total, método y estado, codificado para abrirse con
  tildes correctas en una hoja de cálculo (HU-37).

**Clientes y configuración**

- **FR-021**: La lista de clientes MUST buscar por nombre o correo y mostrar fecha de registro, N.º de
  pedidos y total gastado, paginada de 20 en 20 (HU-38).
- **FR-022**: El detalle del cliente MUST mostrar sus datos, dirección, fecha de registro, estado e
  historial de pedidos (HU-39).
- **FR-023**: El administrador MUST poder bloquear y reactivar clientes (no administradores); el
  bloqueo invalida las sesiones abiertas del cliente e impide iniciar sesión y comprar con un mensaje
  claro (HU-40, RN-08).
- **FR-024**: La configuración MUST permitir editar el número de WhatsApp, los números de Yape y Plin,
  banco, titular, cuenta y CCI, los métodos de pago activos (al menos uno) y las zonas de delivery
  (crear, renombrar, cambiar costo, activar y desactivar); el checkout MUST reflejar los cambios (HU-41).

**Auditoría y transversales**

- **FR-025**: El sistema MUST registrar en la auditoría cada acción del panel que cambia datos: crear y
  editar productos (con precio anterior y nuevo si cambió), activar o desactivar productos, fotos,
  categorías y marcas, ajustes de stock, cambios de estado de pedidos, confirmaciones y rechazos de
  pagos, bloqueos y reactivaciones de clientes y cambios de configuración, con autor, fecha y hora,
  tipo, objeto y detalle (HU-42).
- **FR-026**: La auditoría MUST listarse de la más nueva a la más antigua, filtrarse por tipo y paginarse
  de 30 en 30; no se puede editar ni borrar (HU-42).
- **FR-027**: Todo el panel MUST funcionar en tema claro y oscuro, en español de Perú, con estados de
  carga, vacío y error y accesibilidad WCAG 2.2 AA; se usa principalmente en escritorio y tableta y debe
  poder usarse en un celular (HU-25, RNF-01 a RNF-03).
- **FR-028**: Los datos de demostración MUST incluir el historial inicial de stock de cada producto y
  movimientos coherentes con los 8 pedidos de demostración, para que el panel no aparezca vacío (REQUISITOS
  §6).

### Key Entities *(include if feature involves data)*

- **Movimiento de stock**: producto, cantidad (con signo), stock anterior, stock nuevo, origen (ajuste,
  venta, cancelación, stock inicial), pedido relacionado si existe, motivo, autor, fecha.
- **Registro de auditoría**: autor, fecha y hora, tipo de acción, objeto afectado (tipo e identificador
  legible), detalle con valores anteriores y nuevos.
- **Foto de producto** (ya existe en la 001): se agrega la clave del archivo guardado, orden y texto
  alternativo editable.
- **Categoría, Marca, Producto, Pedido, Pago, Evento de pedido, Usuario, Zona de delivery,
  Configuración** (ya existen en la 001): esta feature los administra; el pago agrega los estados
  confirmado y rechazado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El administrador encuentra un pedido por N.º o cliente y cambia su estado en menos de 30
  segundos.
- **SC-002**: El administrador confirma o rechaza un pago pendiente en menos de 1 minuto desde que abre
  «Pagos por confirmar».
- **SC-003**: El administrador crea un producto completo con 3 fotos en menos de 3 minutos.
- **SC-004**: El resumen se muestra completo en menos de 2 segundos con los datos de demostración.
- **SC-005**: En el 100 % de las pruebas, ninguna operación del panel responde con datos a un visitante o
  a un cliente, y ningún ajuste deja el stock negativo.
- **SC-006**: El 100 % de los cambios de precio, stock, estado, pago, configuración y bloqueo aparecen en
  la auditoría.
- **SC-007**: Los criterios de aceptación de las 17 historias (HU-26 a HU-42) se comprueban usando solo
  la app, en tema claro y oscuro, y todas las pantallas del panel cumplen contraste AA.

## Assumptions

- Hay un solo rol de administrador; la cuenta viene de los datos de demostración (`admin@rcube.pe`). No
  se administran otros administradores ni se crean desde el panel.
- El ingreso al panel usa las mismas reglas de la 001 (mensaje genérico, bloqueo tras 5 intentos, sesión
  de 7 días); `/admin` tiene su propia pantalla de ingreso con estilo de panel.
- «Pedidos por preparar» cuenta Pagado y Preparando; «Pagos por confirmar» cuenta todos los pedidos en
  Pendiente de pago (Yape, Plin, transferencia y WhatsApp), mostrando el código de operación cuando
  existe; los pedidos de WhatsApp se confirman igual que los demás.
- «Total gastado» y «ventas» excluyen pedidos en Pendiente de pago y Cancelado.
- Stock bajo es 5 o menos, igual que «Quedan N» en la tienda.
- La dirección de recojo y la imagen QR de Yape se mantienen como en los datos de demostración; HU-41 no
  pide editarlas.
- El CSV usa coma como separador y UTF-8 con marca de orden de bytes para que las hojas de cálculo
  muestren bien las tildes.
- Los textos de la auditoría se guardan ya legibles en español; no se traducen después.
- Fuera de alcance (feature 003 o REQUISITOS §1): variantes, reseñas y su moderación, cupones,
  favoritos, varias direcciones, comprobante imprimible, avisos dentro de la app, correos y pagos reales.
