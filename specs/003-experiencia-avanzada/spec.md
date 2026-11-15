# Feature Specification: Experiencia avanzada (R Cube)

**Feature Branch**: `003-experiencia-avanzada`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Feature 003, Experiencia avanzada, de R Cube. Fuente obligatoria: docs/requisitos/HISTORIAS-DE-USUARIO.md (HU-43 a HU-53) y docs/requisitos/REQUISITOS.md (RN-09, RN-04, RN-14, RNF-01 a RNF-10). Variantes de producto con precio, stock y SKU propios y su selector en detalle y carrito; favoritos; reseñas de productos entregados con promedio y su moderación en el panel; varias direcciones con una predeterminada; cupones del cliente y su administración; productos relacionados; comprobante imprimible con desglose de IGV; avisos dentro de la app cuando cambia un pedido. Se construye sobre las features 001 y 002. Fuera: correos, facturación electrónica real, varios vendedores y pasarelas de pago reales."

**Fuentes**: `docs/requisitos/HISTORIAS-DE-USUARIO.md` (HU-43 a HU-53) y `docs/requisitos/REQUISITOS.md`
(RNF-01 a RNF-10, RN-01 a RN-14, métodos de pago §4 y estados del pedido §5). Si esta spec y esas
fuentes difieren, mandan las fuentes. Esta feature se construye sobre la 001 (tienda y compra) y la 002
(administración) ya fusionadas: reutiliza el carrito, el checkout, los pedidos y su línea de tiempo, el
stock con historial, el panel `/admin`, la auditoría y el tema claro y oscuro. No rehace nada de eso.

**Referencia visual**: no hay pantallas de Stitch para esta feature. Se reutilizan los tokens, las
tarjetas, las tablas y los diálogos de las features 001 y 002, en tema claro y oscuro
(`docs/diseno/*-DESIGN-comprador.md` y `docs/diseno/*-DESIGN-administrador.md`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Definir variantes de un producto (Priority: P1)

El administrador agrega a un producto sus variantes (por ejemplo, color, almacenamiento y RAM). Cada
variante tiene su propio SKU, precio y stock, y puede tener una de las fotos del producto como foto
propia. En el panel y en la tienda, el producto muestra el rango de precios de sus variantes.

**Why this priority**: Sin variantes definidas no hay nada que el cliente pueda elegir; es la base de
HU-44. Es una historia imprescindible (A).

**Independent Test**: Con el administrador de los datos de demostración, abrir un celular, agregar 3
variantes («128 GB Negro», «256 GB Negro», «256 GB Azul») con precios y stock distintos, y ver en la
lista de productos del panel el rango de precios y el stock total.

**Acceptance Scenarios**:

1. **Given** un producto sin variantes, **When** el administrador agrega la variante «256 GB Azul» con
   SKU `IP15-256-AZ`, precio S/ 4,599.00 y stock 4, **Then** la variante queda guardada y el producto
   pasa a mostrar «Desde S/ …» o el rango de sus variantes.
2. **Given** un producto con 3 variantes de S/ 3,999.00, S/ 4,299.00 y S/ 4,599.00, **When** se ve en la
   lista de la tienda y en el detalle, **Then** el precio se muestra como el rango «S/ 3,999.00 a
   S/ 4,599.00».
3. **Given** una variante con SKU `IP15-256-AZ`, **When** el administrador intenta crear otra con el
   mismo SKU, **Then** ve el error «Ese SKU ya existe» en el campo y no se guarda.
4. **Given** una variante, **When** el administrador la edita (precio, stock, SKU, atributos o foto) o la
   desactiva, **Then** el cambio se guarda, queda en la auditoría y la variante desactivada ya no se
   vende pero conserva sus pedidos anteriores (RN-06).
5. **Given** una variante que ya aparece en un pedido, **When** el administrador intenta borrarla,
   **Then** no se permite y se le ofrece desactivarla; una variante nunca vendida sí se puede borrar.
6. **Given** una variante, **When** el administrador ajusta su stock con motivo, **Then** el historial de
   stock del producto registra el movimiento indicando la variante.

---

### User Story 2 - Elegir la variante y comprarla (Priority: P1)

El cliente (o visitante) elige en el detalle del producto la variante que quiere. El precio, la foto y
la disponibilidad cambian con la variante elegida. El carrito guarda la variante, y el checkout y el
pedido la conservan con su precio de ese momento.

**Why this priority**: Es el valor de HU-43 para el comprador y la historia imprescindible (A) que
conecta las variantes con la compra.

**Independent Test**: En el detalle del celular con 3 variantes, elegir «256 GB Azul», ver su precio y
su foto, agregarla al carrito, completar la compra con tarjeta y ver en el pedido el nombre de la
variante y su precio.

**Acceptance Scenarios**:

1. **Given** el detalle de un producto con variantes, **When** el cliente elige una opción, **Then** el
   precio, la foto principal y el texto de disponibilidad («Quedan N» o «Agotado») cambian sin recargar
   la página y el botón «Agregar al carrito» solo funciona con una variante disponible elegida.
2. **Given** un producto con variantes y ninguna elegida, **When** el cliente intenta agregar al carrito,
   **Then** ve el mensaje «Elige color, almacenamiento o RAM» y no se agrega nada.
3. **Given** una variante con stock 2, **When** el cliente intenta agregar 3 unidades, **Then** se aplica
   RN-01: no se puede superar el stock de esa variante y se explica el máximo.
4. **Given** el mismo producto en dos variantes distintas, **When** el cliente agrega ambas, **Then** el
   carrito las muestra como líneas separadas con el nombre de su variante, cada una con su precio y su
   stock.
5. **Given** un visitante con variantes en su carrito, **When** inicia sesión o se registra, **Then** sus
   variantes pasan a su carrito de cuenta sin perder cuál eligió.
6. **Given** una variante cuyo precio cambió o que se agotó o desactivó mientras estaba en el carrito,
   **When** el cliente abre el carrito o el checkout, **Then** ve el aviso de cambio de precio o de
   disponibilidad de esa variante, igual que ya ocurre con los productos sin variantes.
7. **Given** un pedido con una variante, **When** el cliente lo ve en «Mis pedidos» o el administrador en
   el panel, **Then** la línea muestra el nombre del producto, la variante y el SKU con el precio de ese
   momento (RN-07), aunque la variante cambie después.
8. **Given** un producto sin variantes, **When** el cliente lo compra, **Then** todo funciona exactamente
   como en la feature 001.

---

### User Story 3 - Calificar y reseñar productos comprados (Priority: P1)

El cliente que recibió un producto lo califica de 1 a 5 estrellas y puede dejar un comentario. El
detalle del producto muestra el promedio, la cantidad de reseñas y la lista de reseñas visibles.

**Why this priority**: Es la prueba social de una tienda tipo Amazon y es una historia imprescindible
(A); la regla RN-09 la limita a quienes realmente compraron.

**Independent Test**: Con un cliente de los datos de demostración que tenga un pedido Entregado, abrir el
producto, dejar 4 estrellas y un comentario, ver el promedio y la cantidad actualizados, e intentar
reseñarlo de nuevo.

**Acceptance Scenarios**:

1. **Given** un cliente con el producto en un pedido Entregado y sin reseña previa, **When** abre el
   detalle del producto, **Then** ve el formulario «Calificar este producto» con 5 estrellas
   seleccionables con teclado y un comentario opcional.
2. **Given** el formulario completo, **When** el cliente lo envía, **Then** la reseña aparece en la lista
   con su nombre abreviado («Mateo Q.»), las estrellas, el comentario y la fecha, y el promedio y la
   cantidad se actualizan.
3. **Given** un cliente cuyo pedido de ese producto está en cualquier estado distinto de Entregado, o que
   nunca lo compró, **When** abre el detalle, **Then** no ve el formulario y se le explica que puede
   reseñar después de recibir el producto (RN-09); si lo intenta directamente al servidor, se rechaza.
4. **Given** un cliente que ya reseñó el producto, **When** vuelve al detalle, **Then** ve su reseña y no
   puede enviar otra (una por producto y cliente), aunque lo haya comprado varias veces o en distintas
   variantes.
5. **Given** un visitante o un cliente sin sesión, **When** abre el detalle, **Then** ve el promedio y las
   reseñas, pero no el formulario.
6. **Given** un producto sin reseñas, **When** se abre el detalle, **Then** se muestra «Aún no hay
   reseñas» (estado vacío), sin promedio.
7. **Given** un comentario con más de 1000 caracteres o una calificación fuera de 1 a 5, **When** se
   envía, **Then** se rechaza con un mensaje claro en el campo.
8. **Given** más de 5 reseñas, **When** se ve el detalle, **Then** la lista se pagina de 5 en 5, de la más
   nueva a la más antigua.

---

### User Story 4 - Moderar reseñas desde el panel (Priority: P2)

El administrador ve todas las reseñas, puede ocultar las inadecuadas y volver a mostrarlas. Una reseña
oculta deja de verse en la tienda y de contar en el promedio. Cada acción queda en la auditoría.

**Why this priority**: Es importante para el control de la tienda, pero la tienda funciona sin ella.

**Independent Test**: Ocultar una reseña con comentario ofensivo, ver que desaparece del detalle y que el
promedio se recalcula, mostrarla de nuevo y ver ambas acciones en la auditoría.

**Acceptance Scenarios**:

1. **Given** el panel, **When** el administrador abre «Reseñas», **Then** ve una tabla paginada con
   producto, cliente, estrellas, comentario, fecha y estado (Visible u Oculta), con filtro por estado y
   búsqueda por producto.
2. **Given** una reseña visible, **When** el administrador la oculta, **Then** deja de aparecer en la
   tienda, el promedio y la cantidad se recalculan sin ella y la acción queda en la auditoría.
3. **Given** una reseña oculta, **When** el administrador la muestra, **Then** vuelve a aparecer y a
   contar, y queda en la auditoría.
4. **Given** una reseña oculta, **When** su autor abre el producto, **Then** sigue viendo que ya reseñó y
   no puede enviar otra.
5. **Given** un cliente, **When** intenta acceder a la moderación, **Then** recibe el mismo «sin permiso»
   que en el resto del panel.

---

### User Story 5 - Lista de favoritos (Priority: P2)

El cliente guarda productos en una lista de deseos con un corazón en la tarjeta y en el detalle. La
página «Mis favoritos» los muestra y permite pasar un favorito al carrito.

**Why this priority**: Mejora la experiencia de compra, pero no es necesaria para comprar.

**Independent Test**: Marcar 3 productos con el corazón, abrir «Mis favoritos», pasar uno al carrito,
quitar otro y recargar la página para comprobar que la lista se conserva.

**Acceptance Scenarios**:

1. **Given** un cliente con sesión, **When** toca el corazón de una tarjeta o del detalle, **Then** el
   producto se agrega a sus favoritos, el corazón queda relleno y su estado se anuncia a lectores de
   pantalla («Quitar de favoritos»); al tocarlo de nuevo se quita.
2. **Given** un visitante, **When** toca el corazón, **Then** se le invita a iniciar sesión o registrarse y
   después de hacerlo regresa al producto con el favorito ya guardado.
3. **Given** el menú de la cuenta, **When** el cliente abre «Mis favoritos», **Then** ve sus productos con
   foto, precio y disponibilidad, o el estado vacío «Aún no tienes favoritos» con un enlace al catálogo.
4. **Given** un favorito disponible sin variantes, **When** el cliente toca «Agregar al carrito», **Then**
   pasa al carrito respetando el stock; si el producto tiene variantes, el botón lo lleva al detalle para
   elegir la variante.
5. **Given** un favorito cuyo producto se desactivó o se agotó, **When** el cliente abre la lista,
   **Then** lo ve marcado como «No disponible» o «Agotado», sin botón de agregar y con la opción de
   quitarlo.
6. **Given** la lista de favoritos, **When** el cliente la recarga o inicia sesión en otro dispositivo,
   **Then** la lista es la misma, porque pertenece a su cuenta.

---

### User Story 6 - Varias direcciones de entrega (Priority: P2)

El cliente guarda varias direcciones (casa, trabajo…), edita, borra y marca una como predeterminada, y en
el checkout elige una de ellas para el delivery.

**Why this priority**: Acelera compras repetidas, pero se puede comprar escribiendo la dirección.

**Independent Test**: Crear dos direcciones, marcar la segunda como predeterminada, comprar con delivery
eligiendo la primera en el checkout y comprobar que el pedido lleva esa dirección.

**Acceptance Scenarios**:

1. **Given** «Mi cuenta», **When** el cliente abre «Mis direcciones», **Then** ve sus direcciones con la
   predeterminada marcada, o el estado vacío con el botón «Agregar dirección».
2. **Given** el formulario de dirección, **When** el cliente completa nombre de la dirección (por
   ejemplo «Casa»), nombre de quien recibe, celular, dirección, distrito y referencia opcional y guarda,
   **Then** la dirección queda registrada; los campos obligatorios y el celular de 9 dígitos se validan
   con un mensaje por campo.
3. **Given** una primera dirección, **When** se guarda, **Then** queda como predeterminada
   automáticamente; si el cliente marca otra como predeterminada, la anterior deja de serlo (siempre hay
   una sola).
4. **Given** una dirección predeterminada, **When** el cliente la borra y tiene otras, **Then** la más
   reciente pasa a ser la predeterminada; si era la única, la lista queda vacía.
5. **Given** el checkout con delivery, **When** el cliente tiene direcciones guardadas, **Then** el
   checkout muestra la predeterminada ya elegida, permite elegir otra y permite usar «Otra dirección»
   escribiéndola a mano sin guardarla.
6. **Given** un pedido hecho con una dirección guardada, **When** el cliente edita o borra esa dirección
   después, **Then** el pedido conserva la dirección con la que se hizo (RN-07 aplicado a la entrega).
7. **Given** un cliente con la dirección única de la feature 001 en su cuenta, **When** se actualiza la
   app, **Then** esa dirección aparece como su primera dirección guardada, predeterminada, sin perder
   datos.
8. **Given** un cliente con 10 direcciones, **When** intenta agregar otra, **Then** se le pide borrar
   alguna (máximo 10).
9. **Given** el pedido con recojo en tienda, **When** se hace el checkout, **Then** no se pide dirección,
   como antes.

---

### User Story 7 - Administrar cupones (Priority: P2)

El administrador crea cupones con código, descuento (porcentaje o monto fijo), vigencia, usos máximos y
estado; los edita, los desactiva y ve cuántas veces se usó cada uno.

**Why this priority**: Es la mitad administrativa de HU-49; sin cupones creados no hay nada que aplicar.

**Independent Test**: Crear el cupón `BIENVENIDO10` de 10 % vigente por 30 días con 50 usos, verlo en la
lista, desactivarlo y volver a activarlo; verificar las acciones en la auditoría.

**Acceptance Scenarios**:

1. **Given** el panel, **When** el administrador abre «Cupones», **Then** ve una tabla con código, tipo y
   valor del descuento, vigencia, usos (usados de máximos) y estado (Activo, Inactivo, Vencido o
   Agotado), o el estado vacío «Aún no hay cupones».
2. **Given** el formulario de cupón, **When** el administrador ingresa un código de 3 a 20 letras,
   números o guiones, un tipo (porcentaje de 1 a 90 o monto fijo en soles de S/ 1.00 en adelante), fecha
   de inicio y de fin y usos máximos de 1 en adelante, **Then** el cupón queda creado como Activo; el
   código se guarda en mayúsculas y no distingue mayúsculas al usarlo.
3. **Given** un código ya existente, **When** se intenta crear otro igual, **Then** ve «Ese código ya
   existe» en el campo.
4. **Given** una fecha de fin anterior a la de inicio, **When** se intenta guardar, **Then** se rechaza
   con un mensaje claro en el campo.
5. **Given** un cupón, **When** el administrador cambia su valor, vigencia, usos máximos o estado,
   **Then** el cambio se aplica a los usos futuros, los pedidos ya hechos conservan el descuento con que
   se crearon y todo queda en la auditoría.
6. **Given** un cupón que ya se usó en algún pedido, **When** el administrador intenta cambiar su código
   o borrarlo, **Then** no se permite (se puede desactivar); un cupón sin usos sí se puede borrar.
7. **Given** un cupón, **When** se usa en un pedido, **Then** el contador de usos del panel sube en 1; si
   ese pedido se cancela (por el cliente, por rechazo del pago o por vencer a las 24 h), el uso se
   devuelve.
8. **Given** usos máximos menores que los ya consumidos, **When** el administrador los edita, **Then** se
   rechaza el valor y se indica cuántos usos lleva el cupón.

---

### User Story 8 - Aplicar un cupón al comprar (Priority: P2)

El cliente escribe un código de cupón en el carrito o el checkout. Si es válido, el descuento aparece en el
desglose y el total baja; si no lo es, ve un mensaje claro de por qué.

**Why this priority**: Es el valor de HU-49 para el comprador.

**Independent Test**: Con el carrito de un producto de S/ 2,999.00 aplicar `BIENVENIDO10`, ver el
descuento de S/ 299.90 y el total recalculado con su IGV, completar la compra y ver el descuento en el
pedido; probar un código vencido y otro inexistente.

**Acceptance Scenarios**:

1. **Given** el resumen del carrito y del checkout, **When** el cliente escribe un código válido, vigente,
   con usos disponibles y activo, **Then** el desglose muestra la línea «Cupón CÓDIGO» con el descuento
   en negativo y el total se recalcula; el cliente puede quitar el cupón.
2. **Given** un código inexistente, vencido, aún no vigente, inactivo o agotado, **When** el cliente lo
   aplica, **Then** ve el mensaje específico («El cupón no existe», «El cupón venció», «El cupón aún no
   está vigente», «El cupón no está activo» o «El cupón ya no tiene usos») y el total no cambia.
3. **Given** un cupón de porcentaje, **When** se aplica, **Then** el descuento es ese porcentaje de la
   suma de los productos (con IGV incluido), redondeado al céntimo; un cupón de monto fijo descuenta ese
   monto; el envío nunca se descuenta y el total de los productos nunca baja de S/ 1.00 (el descuento se
   limita).
4. **Given** el total con descuento, **When** se muestra el desglose, **Then** cumple RN-04 y RN-14:
   total = productos + envío − descuento, la base imponible es el total dividido entre 1,18 redondeado al
   céntimo y el IGV es la diferencia.
5. **Given** un cupón aplicado, **When** el cliente crea el pedido, **Then** el servidor vuelve a validar
   el cupón y recalcula todo; si dejó de ser válido entre el carrito y el pago, el pedido no se crea y se
   le explica qué pasó con la opción de continuar sin cupón; el uso se consume en la misma transacción
   que el pedido, el pago y el descuento de stock (RN-02).
6. **Given** el último uso disponible de un cupón y dos clientes pagando a la vez, **When** ambos
   confirman, **Then** solo uno lo obtiene y el otro recibe el mensaje «El cupón ya no tiene usos» sin
   crear su pedido.
7. **Given** un pedido con cupón, **When** se ve en «Mis pedidos», en el panel y en el comprobante,
   **Then** muestra el código y el descuento con que se creó, aunque el cupón cambie después (RN-07).
8. **Given** un cliente, **When** intenta aplicar un segundo cupón, **Then** el nuevo reemplaza al
   anterior (un cupón por pedido).
9. **Given** un visitante con carrito, **When** escribe un cupón, **Then** se le pide iniciar sesión
   porque el descuento se aplica al pagar, conservando su carrito y el código.

---

### User Story 9 - Productos relacionados (Priority: P3)

El detalle de un producto muestra hasta 4 productos de la misma categoría para seguir explorando.

**Why this priority**: Ayuda a descubrir productos, pero no es parte de la compra.

**Independent Test**: Abrir un celular y ver 4 celulares disponibles distintos de él; abrir un producto
de una categoría con pocos productos y ver menos de 4 o ninguna sección.

**Acceptance Scenarios**:

1. **Given** el detalle de un producto, **When** su categoría tiene otros productos activos con stock,
   **Then** se muestran hasta 4, sin incluir el producto actual, con foto, nombre, precio y enlace.
2. **Given** más de 4 candidatos, **When** se elige cuáles mostrar, **Then** se priorizan los de la misma
   marca y luego los más vendidos, de forma estable (el mismo producto muestra los mismos relacionados
   mientras nada cambie).
3. **Given** una categoría sin otros productos disponibles, **When** se abre el detalle, **Then** la
   sección no aparece.
4. **Given** un producto relacionado desactivado, agotado o de una categoría o marca inactiva, **When**
   se calcula la lista, **Then** no se incluye.

---

### User Story 10 - Comprobante imprimible (Priority: P3)

El cliente abre un comprobante imprimible de su pedido, con los datos de la tienda, los suyos, los
productos y el desglose de IGV, y lo imprime o lo guarda como PDF desde el navegador.

**Why this priority**: Es útil para registro del cliente, pero no condiciona la compra.

**Independent Test**: Abrir un pedido Pagado de los datos de demostración, tocar «Ver comprobante»,
comprobar los datos y el IGV, e ver la vista previa de impresión sin elementos de navegación.

**Acceptance Scenarios**:

1. **Given** el detalle de un pedido propio, **When** el cliente toca «Ver comprobante», **Then** se abre
   una página con el nombre de la tienda y su contacto, el número y la fecha del pedido, el estado, los
   datos del cliente, la entrega, cada producto con su variante, cantidad, precio unitario y subtotal, y
   el desglose.
2. **Given** el desglose, **When** se muestra, **Then** incluye productos, cupón si hubo, envío, total,
   base imponible e IGV (18 %) con los montos congelados del pedido (RN-04, RN-14, RN-07).
3. **Given** la página del comprobante, **When** el cliente toca «Imprimir» o usa la impresión del
   navegador, **Then** la vista impresa muestra solo el comprobante (sin encabezado, menú ni botones), en
   blanco y negro legible, y cabe en una hoja A4 para pedidos de hasta 10 productos distintos.
4. **Given** el comprobante, **When** se lee, **Then** aclara que es un comprobante de pedido y no una
   factura electrónica y que el pago fue simulado.
5. **Given** un pedido de otro cliente, **When** alguien abre su enlace del comprobante, **Then** recibe
   «Pedido no encontrado», igual que en el detalle (RN-08).
6. **Given** un pedido Pendiente de pago o Cancelado, **When** el cliente abre el comprobante, **Then**
   lo ve con su estado bien visible; el comprobante nunca dice «Pagado» si no lo está.
7. **Given** el tema oscuro activo, **When** se imprime, **Then** la impresión sale con colores claros
   sobre fondo blanco.

---

### User Story 11 - Avisos dentro de la app (Priority: P3)

El cliente ve una campana con contador en el encabezado. Cada vez que cambia el estado de uno de sus
pedidos aparece un aviso que lo lleva al pedido y que puede marcar como leído.

**Why this priority**: Mantiene informado al cliente sin correos (que están fuera de alcance), pero no
condiciona la compra.

**Independent Test**: Con un cliente de los datos de demostración, pedir que el administrador pase su pedido
a Enviado, ver el contador subir a 1, abrir el aviso, llegar al pedido y comprobar que quedó leído.

**Acceptance Scenarios**:

1. **Given** el administrador cambia el estado de un pedido (confirma el pago, lo pasa a Preparando,
   Enviado o Entregado, lo cancela o rechaza su pago), o el sistema lo cancela por vencer a las 24 h,
   **When** ocurre, **Then** su cliente recibe un aviso como «Tu pedido RC-000123 está Enviado» o «Tu
   pedido RC-000123 fue cancelado: pago no recibido en 24 h».
2. **Given** un cliente con sesión, **When** ve el encabezado, **Then** ve una campana con el contador de
   avisos sin leer (de 1 a 99, o «99+»), que se actualiza al cambiar de página y al menos cada minuto
   sin recargar; si no hay avisos sin leer, no muestra número.
3. **Given** la campana, **When** el cliente la abre, **Then** ve sus avisos de más nuevo a más antiguo
   (los 20 últimos y un enlace «Ver todos»), cada uno con texto, hora relativa y el estado leído o no
   leído, o el estado vacío «No tienes avisos».
4. **Given** un aviso, **When** el cliente lo abre, **Then** llega a la página del pedido y el aviso queda
   leído; también puede marcar uno como leído sin abrirlo y «Marcar todos como leídos».
5. **Given** un cliente, **When** el estado de un pedido que él mismo canceló cambia por su propia
   acción, **Then** no recibe un aviso de lo que acaba de hacer.
6. **Given** un cliente, **When** consulta sus avisos, **Then** solo ve los suyos (RN-08) y nunca los de
   otro cliente.
7. **Given** un visitante o un administrador, **When** ve el encabezado, **Then** no ve la campana.
8. **Given** el uso con lector de pantalla, **When** cambia el contador, **Then** el botón de la campana
   anuncia «Avisos, N sin leer».

---

### Edge Cases

- **Variantes y stock a la vez**: dos clientes compran la última unidad de una variante al mismo tiempo;
  solo uno la obtiene y el otro ve el mensaje de stock sin crear su pedido (RN-01, RN-02).
- **Producto con variantes con stock propio**: al agregar la primera variante a un producto que ya tenía
  stock, ese stock propio deja de contar (el stock del producto es la suma de sus variantes) y el cambio
  queda en el historial de stock; el administrador asigna el stock a cada variante.
- **Variante sin foto propia**: usa la foto principal del producto.
- **Todas las variantes agotadas o desactivadas**: el producto aparece «Agotado» y no se puede agregar al
  carrito.
- **Combinación repetida**: dos variantes del mismo producto con exactamente los mismos atributos
  (mismo color, almacenamiento y RAM) no se permiten.
- **Reseña de un producto desactivado**: el cliente que lo recibió puede reseñarlo mientras la página del
  producto exista para él; los productos desactivados siguen mostrando sus reseñas existentes a quien
  llegue por un enlace de su pedido.
- **Cupón vence a medianoche**: la vigencia se evalúa con la hora de Lima; un cupón vigente hasta el día
  D vale durante todo el día D.
- **Cupón y carrito cambian**: si el carrito cambia después de aplicar el cupón, el descuento se
  recalcula siempre sobre el carrito actual; si el carrito queda vacío, el cupón se quita.
- **Cupón que el cliente ya usó antes**: no hay límite por cliente; solo cuentan los usos máximos del
  cupón.
- **Cupón sobre un pedido Pendiente de pago que vence**: el uso se devuelve al cancelarse
  automáticamente.
- **Favorito de un producto con variantes**: el favorito es del producto, no de una variante.
- **Dirección borrada mientras el checkout está abierto**: el checkout valida la dirección al crear el
  pedido y pide elegir otra si ya no existe.
- **Avisos acumulados**: la lista completa se pagina de 20 en 20; los avisos no se borran.
- **Pedidos antiguos de la 001 y 002**: sin variantes, sin cupón y sin avisos retroactivos; el
  comprobante y los avisos funcionan desde la fecha de la actualización (los avisos se generan solo por
  cambios nuevos).
- **Acceso sin permiso**: cada ruta nueva de administración exige rol de administrador y cada ruta de
  cliente exige sesión; un cliente bloqueado no puede usar ninguna.

## Requirements *(mandatory)*

### Functional Requirements

**Variantes (HU-43, HU-44)**

- **FR-001**: El administrador MUST poder agregar, editar, desactivar y borrar variantes de un producto;
  cada variante tiene SKU único en toda la tienda, atributos (color, almacenamiento y RAM, al menos uno
  con valor), precio en soles con IGV incluido, stock y, opcionalmente, una de las fotos del producto.
- **FR-002**: Dos variantes del mismo producto MUST NOT tener la misma combinación de atributos; una
  variante vendida alguna vez MUST NOT poder borrarse, solo desactivarse (RN-06).
- **FR-003**: Un producto con variantes MUST mostrar, en la lista de la tienda, el detalle y el panel, el
  rango de precios de sus variantes activas («S/ a a S/ b», o un solo precio si coinciden), y su
  disponibilidad MUST ser la suma del stock de sus variantes activas.
- **FR-004**: El administrador MUST poder ajustar el stock de una variante con motivo, y el historial de
  stock MUST registrar cada movimiento con su variante (venta, cancelación, ajuste o stock inicial).
- **FR-005**: El detalle MUST mostrar un selector de variante accesible con teclado; al elegir, el precio,
  la foto principal y la disponibilidad MUST cambiar sin recargar y «Agregar al carrito» MUST exigir una
  variante disponible elegida.
- **FR-006**: El carrito (de visitante y de cuenta) MUST guardar la variante de cada línea; la misma
  variante MUST sumar cantidades y variantes distintas MUST ser líneas distintas; RN-01 MUST validarse
  contra el stock de la variante.
- **FR-007**: El checkout y el pedido MUST guardar la variante, su SKU y su precio al momento de la compra
  (RN-07); el stock descontado y devuelto (cancelaciones, rechazos y vencimiento a las 24 h) MUST ser el
  de la variante, dentro de la misma transacción del pedido (RN-02).
- **FR-008**: Los productos sin variantes MUST seguir funcionando sin ningún cambio visible ni de
  comportamiento respecto a la feature 001.

**Favoritos (HU-45)**

- **FR-009**: El cliente MUST poder agregar y quitar productos de su lista de favoritos desde la tarjeta
  y el detalle; la lista MUST pertenecer a su cuenta y conservarse entre sesiones y dispositivos.
- **FR-010**: «Mis favoritos» MUST mostrar los productos guardados con su disponibilidad actual, permitir
  pasar uno al carrito (o ir al detalle si tiene variantes) y quitarlo; los no disponibles MUST mostrarse
  como tales sin permitir agregarlos.
- **FR-011**: Un visitante que toca el corazón MUST ser llevado a iniciar sesión y, al volver, el favorito
  MUST quedar guardado.

**Reseñas (HU-46, HU-47)**

- **FR-012**: Un cliente MUST poder reseñar un producto solo si lo tiene en al menos un pedido propio en
  estado Entregado, una sola vez por producto (RN-09); el servidor MUST rechazar cualquier otro intento.
- **FR-013**: La reseña MUST tener una calificación entera de 1 a 5 (obligatoria) y un comentario opcional
  de hasta 1000 caracteres; MUST mostrarse con el nombre abreviado del cliente, estrellas, comentario y
  fecha.
- **FR-014**: El detalle MUST mostrar el promedio (un decimal), la cantidad de reseñas visibles y la lista
  paginada de 5 en 5 de la más nueva a la más antigua, con estado vacío cuando no hay.
- **FR-015**: El administrador MUST poder listar todas las reseñas (filtro por estado y búsqueda por
  producto) y ocultarlas o mostrarlas; una reseña oculta MUST salir de la tienda y del promedio y MUST
  seguir impidiendo que su autor envíe otra; cada acción MUST quedar en la auditoría.

**Direcciones (HU-48)**

- **FR-016**: El cliente MUST poder crear, editar y borrar direcciones guardadas (máximo 10), cada una con
  nombre de la dirección, nombre de quien recibe, celular de 9 dígitos, dirección, distrito y referencia
  opcional.
- **FR-017**: Siempre MUST existir exactamente una dirección predeterminada si hay al menos una: la
  primera creada lo es automáticamente, el cliente puede cambiarla y, al borrarla, la más reciente
  restante la reemplaza.
- **FR-018**: El checkout con delivery MUST permitir elegir una dirección guardada (la predeterminada
  viene elegida) o escribir otra sin guardarla; el pedido MUST conservar los datos de entrega con los que
  se hizo, aunque la dirección guardada cambie después.
- **FR-019**: La dirección única de la feature 001 MUST migrarse como primera dirección predeterminada de
  cada cliente que la tenga, sin perder datos.

**Cupones (HU-49, HU-50)**

- **FR-020**: El administrador MUST poder crear, editar, activar, desactivar y (si nunca se usaron)
  borrar cupones con código único (3 a 20 letras, números o guiones, guardado en mayúsculas), tipo
  porcentaje (1 a 90) o monto fijo (desde S/ 1.00), fecha de inicio y de fin, y usos máximos (1 en
  adelante); la lista MUST mostrar los usos consumidos y el estado.
- **FR-021**: El cliente MUST poder aplicar un cupón en el carrito y el checkout; el servidor MUST validar
  que exista, esté activo, esté vigente (hora de Lima) y tenga usos disponibles, y MUST responder con un
  mensaje específico del motivo cuando no sea válido.
- **FR-022**: El descuento MUST calcularse en el servidor sobre la suma de los productos (nunca sobre el
  envío), redondeado al céntimo, sin dejar el total de los productos por debajo de S/ 1.00, y MUST
  mostrarse en el desglose cumpliendo RN-04 y RN-14.
- **FR-023**: Un pedido MUST llevar como máximo un cupón; el código y el descuento MUST quedar guardados en
  el pedido (RN-07); el uso MUST consumirse en la misma transacción que el pedido (RN-02), sin sobrepasar
  nunca los usos máximos aunque haya compras simultáneas.
- **FR-024**: Cuando un pedido con cupón se cancela por cualquier vía (cliente, rechazo del pago,
  vencimiento a las 24 h o administrador), el uso del cupón MUST devolverse.
- **FR-025**: Los cambios de un cupón MUST aplicarse solo a usos futuros y quedar en la auditoría, y el
  código de un cupón ya usado MUST NOT poder cambiarse.

**Relacionados y comprobante (HU-51, HU-52)**

- **FR-026**: El detalle MUST mostrar hasta 4 productos relacionados de la misma categoría, activos, con
  stock y sin categoría o marca inactiva, excluyendo el actual, priorizando la misma marca y luego los
  más vendidos de forma estable; si no hay, la sección MUST ocultarse.
- **FR-027**: El cliente MUST poder abrir un comprobante imprimible de cada pedido propio con los datos de
  la tienda, del cliente y de la entrega, los productos con variante, cantidad, precio y subtotal, el
  cupón si hubo, el envío, el total, la base imponible y el IGV con los montos congelados del pedido, el
  estado y la aclaración de que no es una factura electrónica y de que el pago fue simulado.
- **FR-028**: La vista impresa MUST mostrar solo el comprobante, en colores claros sobre blanco aunque el
  tema oscuro esté activo, y MUST ser inaccesible para quien no sea el dueño del pedido (RN-08).

**Avisos (HU-53)**

- **FR-029**: El sistema MUST generar un aviso para el cliente cada vez que cambie el estado de uno de sus
  pedidos por una acción del administrador o del sistema (incluida la cancelación automática a las
  24 h), sin generar aviso por las acciones del propio cliente.
- **FR-030**: El encabezado del cliente MUST mostrar una campana con el contador de avisos sin leer,
  actualizado al navegar y al menos cada minuto, con la lista de los últimos 20 y un enlace a la lista
  completa paginada.
- **FR-031**: Cada aviso MUST llevar al pedido correspondiente, poder marcarse como leído (uno, al abrirlo,
  o todos) y ser visible solo para su cliente.

**Calidad, seguridad y transversales**

- **FR-032**: Toda ruta nueva de administración MUST exigir rol de administrador y toda ruta nueva de
  cliente MUST exigir sesión de un cliente no bloqueado; los datos de un cliente MUST NOT ser accesibles
  por otro (RN-08).
- **FR-033**: Toda entrada nueva (SKU, precios, cupones, reseñas, direcciones) MUST validarse en el
  servidor con mensajes por campo en español de Perú; los montos MUST guardarse en céntimos enteros y
  mostrarse en soles con dos decimales (RNF-01, RN-14).
- **FR-034**: Los cambios de variantes, cupones y reseñas hechos desde el panel MUST quedar en la auditoría
  con quién, qué y cuándo, en la misma transacción del cambio.
- **FR-035**: Todas las pantallas nuevas MUST tener estados de carga, vacío y error, funcionar en tema
  claro y oscuro y cumplir WCAG 2.2 AA (RNF-02, RNF-03).
- **FR-036**: Los datos de demostración MUST incluir variantes en al menos 3 productos, reseñas de
  clientes con pedidos Entregados, favoritos, direcciones, 3 cupones en distintos estados (vigente,
  vencido y agotado) y avisos de los pedidos de demostración.
- **FR-037**: Las pruebas de las features 001 y 002 MUST seguir pasando sin modificar su intención.

### Key Entities *(include if feature involves data)*

- **Variante**: opción vendible de un producto. Atributos: color, almacenamiento, RAM, SKU único, precio
  (céntimos), stock, foto opcional, estado (activa o no). Pertenece a un producto; las líneas del carrito
  y del pedido pueden apuntar a una variante.
- **Favorito**: marca de un cliente sobre un producto; único por cliente y producto.
- **Reseña**: calificación (1 a 5) y comentario opcional de un cliente sobre un producto; única por
  cliente y producto; visible u oculta.
- **Dirección guardada**: nombre de la dirección, destinatario, celular, dirección, distrito, referencia
  y marca de predeterminada; pertenece a un cliente.
- **Cupón**: código único, tipo (porcentaje o monto), valor, vigencia, usos máximos, usos consumidos y
  estado. El pedido guarda el código y el descuento con que se creó.
- **Aviso**: mensaje para un cliente sobre un cambio de su pedido, con enlace al pedido, fecha y estado
  leído o no leído.
- **Línea de pedido y de carrito**: ahora pueden referirse a una variante con su nombre, SKU y precio
  congelados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cliente elige una variante, la agrega al carrito y completa la compra con tarjeta en menos
  de 3 minutos, y el pedido muestra exactamente la variante y el precio que eligió.
- **SC-002**: En el 100 % de los pedidos con cupón, el total es productos + envío − descuento, y base
  imponible + IGV es igual al total al céntimo (RN-04, RN-14).
- **SC-003**: Ningún cliente sin un pedido Entregado del producto logra publicar una reseña, ni por la
  pantalla ni enviando la solicitud directamente (RN-09).
- **SC-004**: Con las últimas unidades de una variante o de un cupón y varias compras simultáneas, nunca
  se vende más de lo disponible ni se usa un cupón más veces que sus usos máximos.
- **SC-005**: Un administrador crea un producto con 3 variantes en menos de 3 minutos y un cupón en menos
  de 1 minuto, siguiendo solo lo que ve en pantalla.
- **SC-006**: Un cambio de estado de un pedido se refleja en la campana del cliente en menos de 60 segundos
  sin recargar la página.
- **SC-007**: El comprobante de un pedido de hasta 10 productos distintos se imprime en una sola hoja A4,
  sin encabezado ni botones, y sus montos coinciden con los del pedido.
- **SC-008**: Todas las pantallas nuevas pasan la revisión automática de accesibilidad AA en tema claro y
  oscuro.
- **SC-009**: Todas las pruebas de las features 001 y 002 siguen pasando, y cada historia HU-43 a HU-53
  tiene al menos una prueba automática que la nombra.

## Assumptions

- Un producto puede tener 0 o más variantes; hasta 20 por producto. Un producto sin variantes se comporta
  como en la feature 001 (su precio y su stock son los suyos). Los atributos de variante son texto libre
  en tres campos fijos (color, almacenamiento y RAM); no hay catálogo de atributos.
- El administrador es único y viene de los datos de demostración, como en la 002.
- Los cupones no tienen límite por cliente, no exigen compra mínima y no se acumulan (uno por pedido); el
  descuento nunca se aplica al envío.
- Las reseñas no se editan ni se borran por el cliente en esta feature; la calificación no se muestra en
  las tarjetas del catálogo, solo en el detalle del producto.
- El nombre del cliente en la reseña es su primer nombre y la inicial del apellido.
- La hora de referencia para vigencias, fechas y relativas es la de Lima (UTC−5).
- No hay correos electrónicos: los avisos son solo dentro de la app (REQUISITOS §1). El contador se
  consulta periódicamente; no hay notificaciones en tiempo real ni del navegador.
- El comprobante no es una factura electrónica ni tiene valor tributario; se imprime con la función de
  impresión del navegador (que también permite guardar como PDF).
- Las direcciones no se validan contra un servicio externo ni exigen zona de delivery; la zona se elige en
  el checkout como en la 001.
- Los pedidos creados antes de esta feature no cambian; no se generan avisos ni cupones retroactivos.
- Fuera de alcance (REQUISITOS §1 o historias no incluidas): correos, facturación electrónica real,
  varios vendedores, pasarelas de pago reales, recuperación de contraseña por correo, aplicación móvil
  nativa, varios idiomas y varias monedas.
