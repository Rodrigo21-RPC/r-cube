# R Cube: historias de usuario

Tienda en línea de dispositivos electrónicos (celulares, laptops, tablets y accesorios) con un solo vendedor (R Cube), con experiencia tipo Amazon.

**Actores:** Visitante (sin sesión), Cliente (con sesión) y Administrador.
**Prioridad:** A = imprescindible, M = importante.
**Feature:** 001 Tienda y compra, 002 Administración, 003 Experiencia avanzada. Cada feature recorre todo el flujo SDD (specify, clarify, plan, tasks, analyze, implement) y se cierra antes de la siguiente.

---

## Feature 001: Tienda y compra

### Épica E1. Descubrir productos

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-01 | Como visitante quiero ver el catálogo paginado para explorar los productos | 12 productos por página; foto, nombre, precio y disponibilidad en cada tarjeta; solo se ven productos activos; estado vacío si no hay resultados | A |
| HU-02 | Como visitante quiero buscar por texto para encontrar un producto rápido | Busca en nombre, marca y descripción; tolera mayúsculas y tildes; muestra «N resultados para …»; mensaje claro si no hay coincidencias | A |
| HU-03 | Como visitante quiero filtrar por categoría, marca, rango de precio y disponibilidad para acotar resultados | Filtros combinables; los filtros activos se ven como etiquetas que se pueden quitar; la URL conserva los filtros; botón «Limpiar filtros» | A |
| HU-04 | Como visitante quiero ordenar por relevancia, precio (menor y mayor) y novedad para comparar | El orden se mantiene al paginar y filtrar | A |
| HU-05 | Como visitante quiero ver el detalle de un producto para decidir la compra | Galería de fotos, nombre, marca, precio con IGV, descripción, especificaciones, disponibilidad («Quedan N» si el stock es 5 o menos, «Agotado» si es 0), botón «Agregar al carrito» (deshabilitado si está agotado) | A |
| HU-06 | Como visitante quiero una página de inicio con secciones para descubrir ofertas | Secciones: categorías, ofertas (productos con precio anterior), más vendidos y novedades; cada tarjeta lleva al detalle | M |

### Épica E2. Cuenta del cliente

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-07 | Como visitante quiero registrarme para poder comprar | Nombre, correo, teléfono y contraseña (mínimo 8 caracteres); correo único; errores por campo; al terminar queda con sesión iniciada | A |
| HU-08 | Como cliente quiero iniciar y cerrar sesión para proteger mi cuenta | Mensaje genérico ante credenciales inválidas; bloqueo temporal tras 5 intentos fallidos; la sesión dura 7 días | A |
| HU-09 | Como cliente quiero ver y editar mi perfil para mantener mis datos al día | Edita nombre, teléfono y dirección de entrega; el correo se ve pero no se edita; confirmación al guardar | A |
| HU-10 | Como cliente quiero cambiar mi contraseña | Pide la contraseña actual; mínimo 8 caracteres; las demás sesiones se cierran | M |

### Épica E3. Carrito

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-11 | Como visitante o cliente quiero agregar, cambiar cantidad y quitar productos del carrito | Contador en el encabezado; la cantidad no supera el stock; subtotal por línea y total en soles con desglose de IGV | A |
| HU-12 | Como visitante quiero que mi carrito se conserve para no perder mi selección | Se guarda en el navegador; al iniciar sesión se fusiona con el carrito de la cuenta sin duplicar productos | A |
| HU-13 | Como cliente quiero que el carrito me avise de cambios para no sorprenderme | Si un precio cambió o el stock bajó, se muestra aviso y se ajusta; el precio y el total siempre los calcula el servidor | A |

### Épica E4. Compra y pagos

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-14 | Como cliente quiero elegir cómo recibir mi pedido | Opciones: recojo en tienda (sin costo) o delivery con costo fijo según la zona configurada; el costo se suma al total antes de pagar | A |
| HU-15 | Como cliente quiero indicar la dirección de entrega | Se precarga con la del perfil; campos: nombre, teléfono, dirección, distrito y referencia; obligatorios si hay delivery | A |
| HU-16 | Como cliente quiero pagar con tarjeta para recibir mi pedido enseguida | Pasarela simulada en modo de prueba; 4111 1111 1111 1111 aprueba y 4000 0000 0000 0002 rechaza; validación del número (Luhn), vencimiento y CVV; nunca se guarda el número completo ni el CVV; aviso «Pago simulado, no se cobra dinero real»; si aprueba, el pedido pasa a Pagado | A |
| HU-17 | Como cliente quiero pagar con Yape o Plin | Muestra el QR y el número de ejemplo de R Cube y pide el código de operación; el pedido queda en «Pendiente de pago» hasta que el administrador lo confirme; aviso de modo de prueba | A |
| HU-18 | Como cliente quiero pagar por transferencia bancaria | Muestra los datos de la cuenta de la tienda (de ejemplo) y el monto; el pedido queda en «Pendiente de pago» hasta confirmación del administrador | A |
| HU-19 | Retirada | Se retiró el pago contra entrega: todo pedido se paga por adelantado (RN-11). El número se conserva para no alterar la numeración | No aplica |
| HU-20 | Como cliente quiero coordinar mi pedido por WhatsApp | Botón «Coordinar por WhatsApp» que abre `wa.me` con el número de la tienda y un mensaje con el resumen del pedido (N.º, productos, cantidades, total, método y entrega); el pedido queda en «Pendiente de pago» | A |
| HU-21 | Como cliente quiero confirmar mi pedido con un resumen para tener certeza | Pantalla final con N.º de pedido, productos, desglose (subtotal, IGV, envío, total), método de pago, entrega y siguientes pasos; si el pago queda pendiente, avisa que el pedido se cancela si no se paga en 24 horas; el stock se descuenta al crear el pedido; no se puede comprar más que el stock | A |

### Épica E5. Mis pedidos y experiencia

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-22 | Como cliente quiero ver mis pedidos para seguir mis compras | Lista del más nuevo al más antiguo con N.º, fecha, total y estado; solo ve los suyos | A |
| HU-23 | Como cliente quiero ver el detalle y la línea de tiempo de un pedido | Productos, montos, método de pago, dirección y línea de tiempo con fecha y hora de cada cambio de estado | A |
| HU-24 | Como cliente quiero cancelar un pedido que aún no se envió | Solo en Pendiente de pago, Pagado o Preparando; devuelve el stock; pide confirmación; queda Cancelado con motivo | M |
| HU-25 | Como usuario quiero cambiar entre tema claro y oscuro | Interruptor visible en tienda y administración; sigue la preferencia del sistema; recuerda la elección; sin parpadeo al cargar; contraste AA en ambos temas | A |

---

## Feature 002: Administración

### Épica E6. Acceso y resumen

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-26 | Como administrador quiero iniciar sesión en un panel separado para gestionar la tienda | Solo el rol administrador entra a `/admin`; un cliente recibe «sin permiso»; las rutas `/api/admin/*` lo exigen en el servidor | A |
| HU-27 | Como administrador quiero un resumen de la tienda para ver cómo va el negocio | Tarjetas: ventas de hoy, pedidos por preparar, pagos por confirmar, clientes registrados, productos con stock bajo; gráfico de ventas de los últimos 30 días; ventas por categoría; 5 productos más vendidos; últimos pedidos | A |

### Épica E7. Catálogo

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-28 | Como administrador quiero crear y editar productos | Campos: nombre, marca, categoría, descripción, especificaciones, precio, precio anterior opcional y stock; validación en servidor; precio mayor que 0 | A |
| HU-29 | Como administrador quiero activar o desactivar productos sin borrarlos | El producto desactivado desaparece de la tienda pero conserva su historial de pedidos | A |
| HU-30 | Como administrador quiero buscar y filtrar la lista de productos | Por nombre, categoría, estado y stock bajo; paginada | A |
| HU-31 | Como administrador quiero subir las fotos de un producto | Hasta 6 fotos por producto; JPG, PNG o WebP de hasta 2 MB; se elige la principal y se reordenan; se guardan en R2 | A |
| HU-32 | Como administrador quiero gestionar categorías y marcas | Crear, renombrar y desactivar; no se puede desactivar una con productos activos sin avisar | M |
| HU-33 | Como administrador quiero ajustar el stock con historial | Cada ajuste pide cantidad y motivo; se guarda quién, cuándo y cuánto; el stock no puede quedar negativo | A |

### Épica E8. Pedidos y pagos

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-34 | Como administrador quiero listar y filtrar pedidos | Por estado, método de pago, fecha y texto (N.º o cliente); paginada | A |
| HU-35 | Como administrador quiero ver el detalle de un pedido y cambiar su estado | Solo transiciones válidas (ver REQUISITOS); cada cambio queda en la línea de tiempo con autor y hora; cancelar devuelve el stock | A |
| HU-36 | Como administrador quiero confirmar pagos por Yape, Plin o transferencia | Lista de «Pagos por confirmar» con el código de operación; al confirmar, el pedido pasa a Pagado; también puede rechazar con motivo, y entonces el pedido pasa a Cancelado y devuelve el stock; se muestra cuánto falta para el vencimiento de 24 horas | A |
| HU-37 | Como administrador quiero exportar pedidos a CSV | Respeta los filtros activos; columnas: N.º, fecha, cliente, total, método, estado | M |

### Épica E9. Clientes y configuración

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-38 | Como administrador quiero ver la lista de clientes | Buscar por nombre o correo; total gastado y N.º de pedidos por cliente; paginada | A |
| HU-39 | Como administrador quiero ver el detalle de un cliente | Datos, historial de pedidos y fecha de registro | A |
| HU-40 | Como administrador quiero bloquear o reactivar a un cliente | El cliente bloqueado no puede iniciar sesión ni comprar y ve un mensaje claro | M |
| HU-41 | Como administrador quiero configurar la tienda | Número de WhatsApp, datos de Yape, Plin y cuenta bancaria, costo de delivery por zona, métodos de pago activos; los cambios se reflejan en el checkout | A |
| HU-42 | Como administrador quiero un registro de auditoría | Lista de acciones del panel (quién, qué, cuándo): cambios de precio, stock, estado y configuración | M |

---

## Feature 003: Experiencia avanzada

| ID | Historia | Criterios de aceptación | P |
|---|---|---|---|
| HU-43 | Como administrador quiero definir variantes de un producto (color, almacenamiento, RAM) | Cada variante tiene su precio, stock y SKU; el producto muestra el rango de precios | A |
| HU-44 | Como cliente quiero elegir la variante de un producto | Selector en el detalle; el precio, la foto y la disponibilidad cambian con la variante; el carrito guarda la variante | A |
| HU-45 | Como cliente quiero guardar productos en una lista de deseos | Corazón en la tarjeta y el detalle; página «Mis favoritos»; pasar un favorito al carrito | M |
| HU-46 | Como cliente quiero calificar y reseñar productos que compré | Solo si el pedido está Entregado; 1 a 5 estrellas y comentario; una reseña por producto y cliente; el detalle muestra promedio y cantidad | A |
| HU-47 | Como administrador quiero moderar reseñas | Ocultar o mostrar una reseña; se registra en la auditoría | M |
| HU-48 | Como cliente quiero guardar varias direcciones | Crear, editar, borrar y marcar una como predeterminada; elegir una en el checkout | M |
| HU-49 | Como cliente quiero aplicar un cupón de descuento | Código válido, vigente y con usos disponibles; descuento visible en el desglose; mensaje claro si no es válido | M |
| HU-50 | Como administrador quiero crear y administrar cupones | Código, porcentaje o monto, vigencia, usos máximos y estado | M |
| HU-51 | Como cliente quiero ver productos relacionados | En el detalle, hasta 4 productos de la misma categoría | M |
| HU-52 | Como cliente quiero un comprobante imprimible de mi pedido | Vista de impresión con datos de la tienda, cliente, productos y desglose de IGV | M |
| HU-53 | Como cliente quiero avisos dentro de la app cuando cambia mi pedido | Campana con contador; cada aviso lleva al pedido; se puede marcar como leído | M |
