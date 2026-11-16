# Feature Specification: Galería y destacados del producto (R Cube)

**Feature Branch**: `004-galeria-destacados`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Feature 004, Galería y destacados del producto, de R Cube. Pedido de Rodrigo: que cada producto tenga más imágenes, que al abrir un equipo se vea una galería con varias fotos llamativas y que haya una descripción breve y atractiva al estilo de AliExpress. Hoy cada producto de demostración tiene una sola foto (algunas poco llamativas), la galería del detalle solo muestra miniaturas pequeñas y la descripción es una sola frase. Historias nuevas HU-54 a HU-58 (y, con la ampliación, HU-59 y HU-60) en docs/requisitos/HISTORIAS-DE-USUARIO.md. Incluye: galería del detalle con foto grande, flechas, deslizar, contador y miniaturas; ampliar una foto a pantalla completa; frase corta y hasta 5 viñetas de destacados bajo el nombre; edición de esos textos desde el panel con auditoría; datos de demostración con de 3 a 6 fotos por producto (después ajustado a de 4 a 6), frase y destacados para los 37 productos activos; fotos extra de Wikimedia Commons con licencia libre y créditos visibles, completadas con tarjetas gráficas de características. Se construye sobre las features 001 a 003. Fuera: video, vista 360, lupa que sigue al cursor, imágenes generadas con IA que simulen fotos reales y cambios en carrito, checkout o pedidos. Ampliación del 2026-11-16 pedida por Rodrigo: más fotos nuevas con nivel de ficha de AliExpress (tarjetas gráficas de características, de destacados y de compra segura), tope de 8 fotos por producto y contacto por WhatsApp (botón en el producto, botón flotante en la tienda y botón del administrador hacia el cliente), con las historias HU-59 y HU-60."

**Fuentes**: `docs/requisitos/HISTORIAS-DE-USUARIO.md` (HU-54 a HU-60, agregadas en esta feature; HU-31 actualizada) y
`docs/requisitos/REQUISITOS.md` (RNF-01 a RNF-04, RNF-07, RNF-09, RN-06 y RN-07). Si esta spec y esas
fuentes difieren, mandan las fuentes. Esta feature se construye sobre las features 001 a 003 ya fusionadas:
reutiliza el catálogo y el detalle del producto, la foto propia de una variante (HU-44), las fotos que sube
el administrador desde el panel, con su límite (que esta feature sube de 6 a 8), su foto principal y su
orden (HU-31), la auditoría (HU-42), el número de WhatsApp de la configuración de la tienda (HU-41) y el
enlace `wa.me` del checkout (HU-20). No rehace nada de eso.

**Referencia visual**: no hay pantallas de Stitch para esta feature. Se reutilizan los tokens, las
tarjetas y los diálogos de las features anteriores, en tema claro y oscuro (`docs/diseno/`). La idea de la
frase llamativa y las viñetas de destacados se inspira en la forma de presentar un producto de AliExpress;
no se copian textos, imágenes ni marca de ningún sitio.

## Clarifications

### Session 2026-11-16

- Q: ¿Cómo se acreditan las fotos originales de `docs/fotos`, cuyo autor y licencia no están registrados?
  → A: Se agrupan en la página de créditos como «Fotos aportadas por el proyecto», sin autor individual, y
  el riesgo queda declarado en Assumptions; las fotos de Commons llevan crédito completo.
- Q: ¿Qué pasa con la foto original de un producto cuando no sirve como foto principal (cuatro iPhone en una
  sola foto, el MSI visto por debajo)? → A: Una foto mejor pasa a ser la principal; la original queda como
  foto posterior solo si muestra el equipo correcto, y se retira de la galería de ese producto si induce a
  error (varios equipos, parte inferior u otro modelo). El archivo siempre se conserva.
- Q: ¿En qué posición van las tarjetas gráficas dentro de la galería? → A: Siempre al final: las fotos
  reales abren la galería y las tarjetas cierran con la información de un vistazo (son tres, ver abajo).
- Q: ¿La vista ampliada permite acercar más la foto con gestos propios? → A: No: muestra la foto al mayor
  tamaño que quepa y no bloquea el pellizco nativo del navegador; el zoom propio queda fuera de alcance.
- Q: ¿La búsqueda del catálogo debe encontrar productos también por la frase y los destacados? → A: No: la
  búsqueda del catálogo y la del panel siguen igual (nombre, marca y descripción), porque los destacados
  resumen lo que ya dicen la descripción y las especificaciones.

### Session 2026-11-16 (ampliación pedida por Rodrigo)

- Q: ¿Cuántas fotos admite un producto y cuántas lleva la demostración? → A: El tope sube de 6 a 8 (HU-31
  actualizada) para dejar espacio a fotos nuevas; la demostración lleva de 4 a 6: de 1 a 3 fotos reales o
  del proyecto y exactamente 3 tarjetas gráficas al final, en este orden: características, destacados y
  compra segura.
- Q: ¿Qué incluye «contactar por WhatsApp»? → A: Para el cliente, un botón «Consultar por WhatsApp» en el
  detalle con un mensaje que nombra el producto, la variante elegida y el enlace, y un botón flotante
  «Escríbenos por WhatsApp» en la tienda (salvo checkout, comprobante y panel). Para el administrador, un
  botón «Escribir por WhatsApp» al cliente en el detalle del pedido y en el del cliente. El número de la
  tienda sale de la configuración (HU-41); no hay chat integrado ni API de WhatsApp Business.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver varias fotos del producto en una galería (Priority: P1)

Un cliente o visitante abre un producto y ve su foto principal en grande. Debajo o al costado ve miniaturas
de las demás fotos y un contador («2 de 5»). Puede pasar de una foto a otra con flechas, con las miniaturas,
con el teclado o deslizando con el dedo. Los datos de demostración dejan de tener una sola foto por
producto: cada producto activo tiene entre 4 y 6 (de 1 a 3 fotos reales y 3 tarjetas gráficas), y la
primera es la más llamativa.

**Why this priority**: Es el pedido principal. Sin una galería cómoda las fotos adicionales no se aprovechan,
y sin fotos adicionales la galería no tiene qué mostrar. Es una historia imprescindible (A, HU-54).

**Independent Test**: Con los datos de demostración, abrir el «Samsung Galaxy S23», ver que tiene entre 4 y
6 fotos, pasar de una a otra con la flecha, con una miniatura, con las flechas del teclado y (en un teléfono)
deslizando, y comprobar que el contador cambia a «2 de N» y que la miniatura activa queda marcada.

**Acceptance Scenarios**:

1. **Given** un producto con 4 fotos, **When** el cliente abre su detalle, **Then** ve la primera foto en
   grande, el contador «1 de 4», 4 miniaturas con la primera marcada y los botones «Foto anterior» y
   «Foto siguiente».
2. **Given** la foto 1 de 4 a la vista, **When** pulsa «Foto siguiente» o la flecha derecha del teclado con
   el foco en la galería, **Then** ve la foto 2, el contador dice «2 de 4», su miniatura queda marcada y un
   lector de pantalla anuncia «Foto 2 de 4».
3. **Given** la última foto, **When** pulsa «Foto siguiente», **Then** vuelve a la primera (la navegación es
   circular), y desde la primera «Foto anterior» lleva a la última.
4. **Given** un teléfono, **When** el cliente desliza horizontalmente sobre la foto, **Then** cambia de foto;
   **And** el desplazamiento vertical de la página sigue funcionando con normalidad.
5. **Given** un producto con variantes cuya variante tiene foto propia, **When** el cliente elige esa
   variante, **Then** la galería muestra esa foto (HU-44 sigue funcionando); **And** si después navega a
   mano, se respeta su elección.
6. **Given** un producto con una sola foto, **When** abre el detalle, **Then** ve la foto sin flechas,
   contador ni miniaturas.
7. **Given** una foto que no carga, **When** se muestra, **Then** aparece la imagen genérica con el texto
   alternativo del producto y la galería sigue siendo navegable.
8. **Given** los datos de demostración, **When** se abre cualquiera de los 37 productos activos, **Then** ve
   entre 4 y 6 fotos y la primera muestra un solo equipo completo y reconocible (no una foto con varios
   equipos, ni de la parte inferior, ni de un componente interno).

---

### User Story 2 - Ver una frase y destacados breves del producto (Priority: P1)

Bajo el nombre del producto, el cliente lee una frase corta y llamativa y hasta 5 viñetas con lo más
atractivo del equipo, al estilo de las fichas de AliExpress. La descripción larga y las especificaciones
siguen donde estaban: los destacados las complementan, no las reemplazan. Los 37 productos activos de
demostración traen su frase y sus destacados.

**Why this priority**: Es la segunda parte del pedido y lo que hace que un producto «llame la atención» de
un vistazo. Es una historia imprescindible (A, HU-56).

**Independent Test**: Abrir el «iPhone 13 Pro 128 GB» de la demostración y ver bajo el nombre una frase y de
3 a 5 viñetas. Abrir un producto sin frase ni destacados (creado desde el panel sin llenarlos) y comprobar
que no aparece el bloque ni queda un hueco.

**Acceptance Scenarios**:

1. **Given** un producto con frase y 4 destacados, **When** el cliente abre su detalle, **Then** ve la
   frase y las 4 viñetas bajo el nombre, antes de las opciones de compra.
2. **Given** un producto sin frase ni destacados, **When** abre el detalle, **Then** no se muestra el bloque
   ni queda espacio vacío, y la descripción larga y las especificaciones se ven como siempre.
3. **Given** un producto con frase pero sin viñetas (o con viñetas pero sin frase), **When** abre el
   detalle, **Then** ve solo lo que existe.
4. **Given** una frase o una viñeta que contiene símbolos de HTML (por ejemplo `<b>`), **When** se muestra,
   **Then** aparece como texto tal cual, sin interpretarse.
5. **Given** los temas claro y oscuro, **When** se ve el bloque, **Then** el texto cumple el contraste AA.

---

### User Story 3 - Ampliar una foto a pantalla completa (Priority: P2)

El cliente toca la foto grande (o el botón «Ampliar foto») y se abre una vista a pantalla completa con la
foto en el mayor tamaño posible. Allí puede pasar a las demás fotos y cerrarla con un botón o con la tecla
Escape, y vuelve exactamente a donde estaba.

**Why this priority**: Mejora mucho la inspección de un equipo, pero la galería de la historia 1 ya entrega
valor sin ella (M, HU-55).

**Independent Test**: En un producto con 4 fotos, abrir la vista ampliada tocando la foto, pasar a la foto 3
con las flechas del teclado, cerrar con Escape y comprobar que el foco vuelve al control que la abrió y que
la galería quedó en la foto 3.

**Acceptance Scenarios**:

1. **Given** el detalle de un producto, **When** el cliente toca la foto grande o pulsa «Ampliar foto»,
   **Then** se abre una vista a pantalla completa con esa foto, el contador, las flechas y el botón
   «Cerrar».
2. **Given** la vista ampliada abierta, **When** pulsa Escape o «Cerrar», **Then** se cierra y el foco
   vuelve al control que la abrió, y la galería queda en la foto en que se quedó la vista ampliada.
3. **Given** la vista ampliada, **When** usa las flechas del teclado, los botones o desliza con el dedo,
   **Then** cambia de foto como en la galería.
4. **Given** la vista ampliada abierta, **When** el cliente presiona Tab, **Then** el foco circula solo
   entre los controles de la vista y la página de fondo no se desplaza ni recibe foco.
5. **Given** una persona que pidió reducir el movimiento, **When** abre o cierra la vista o cambia de foto,
   **Then** no hay animaciones.

---

### User Story 4 - Editar la frase y los destacados desde el panel (Priority: P2)

El administrador edita la frase y los destacados de un producto en el mismo formulario donde ya edita su
nombre, precio y fotos. El servidor valida los límites y el cambio queda en el registro de auditoría.

**Why this priority**: Sin edición los textos de demostración serían los únicos posibles, pero la tienda ya
se ve bien sin esta historia (M, HU-57).

**Independent Test**: Como administrador, abrir un producto, escribir una frase de 70 caracteres y 3
destacados, guardar, ver el cambio en la tienda y ver la entrada en la auditoría; intentar guardar una
frase de 91 caracteres y ver el rechazo sin que se guarde nada.

**Acceptance Scenarios**:

1. **Given** el formulario de un producto, **When** el administrador escribe una frase de 70 caracteres y 3
   destacados y guarda, **Then** el detalle en la tienda los muestra y la auditoría registra quién, cuándo,
   el producto y el cambio con su valor anterior y nuevo.
2. **Given** una frase de 91 caracteres, **When** intenta guardar, **Then** se rechaza con «La frase no
   puede pasar de 90 caracteres» y no se guarda nada.
3. **Given** un sexto destacado, **When** intenta agregarlo o guardarlo, **Then** se rechaza con «Máximo 5
   destacados»; **And** un destacado de 61 caracteres se rechaza con «Cada destacado admite hasta 60
   caracteres».
4. **Given** destacados con espacios sobrantes o vacíos, **When** guarda, **Then** se recortan los espacios
   y se descartan los vacíos.
5. **Given** un cliente, un visitante o un administrador sin sesión que envía el cambio directamente al
   servidor, **When** se procesa, **Then** se rechaza (sin sesión 401, sin permiso 403) y nada cambia.
6. **Given** un producto existente sin frase ni destacados, **When** el administrador lo abre, **Then** los
   campos aparecen vacíos y puede guardarlo sin llenarlos.

---

### User Story 5 - Conocer el crédito de las fotos (Priority: P3)

Las fotos adicionales de los datos de demostración provienen de una fuente libre (Wikimedia Commons), cuyas
licencias exigen reconocer al autor. La tienda tiene una página pública «Créditos de las fotos», enlazada
desde el pie de página, con el autor, la licencia y el enlace de origen de cada foto con crédito.

**Why this priority**: Es una obligación de las licencias libres y de buena práctica, pero no cambia lo que
el cliente compra (M, HU-58).

**Independent Test**: Abrir la página «Créditos de las fotos» desde el pie de página y comprobar que cada
foto de Commons de un producto de demostración aparece con producto, autor, licencia y un enlace que abre
la página de origen.

**Acceptance Scenarios**:

1. **Given** el pie de página, **When** el visitante pulsa «Créditos de las fotos», **Then** abre la página
   con la lista de fotos con crédito: producto (con enlace a su detalle), autor, licencia y enlace al origen.
2. **Given** una foto de demostración tomada de una fuente externa, **When** se revisan los datos de
   demostración, **Then** tiene autor, licencia y enlace de origen; no puede existir una foto externa sin
   esos tres datos.
3. **Given** una foto subida por el administrador o una de las tarjetas gráficas generadas por R Cube, **When** se
   abre la página de créditos, **Then** no aparece en la lista (la página aclara que las tarjetas son de
   R Cube).
4. **Given** una base sin ninguna foto con crédito, **When** se abre la página, **Then** muestra un estado
   vacío claro en lugar de una lista vacía.
5. **Given** el enlace de origen de una foto, **When** el visitante lo abre, **Then** se abre en una pestaña
   nueva sin dar acceso a la página de la tienda.

---

### User Story 6 - Contactar a la tienda por WhatsApp (Priority: P2)

Un cliente o visitante con una duda sobre un producto pulsa «Consultar por WhatsApp» en el detalle y se abre
WhatsApp con un mensaje listo que nombra el producto (con la variante elegida y el enlace). Además, un botón
flotante «Escríbenos por WhatsApp» queda disponible en la tienda para consultas generales. El número es el
de la tienda, configurado en el panel.

**Why this priority**: Una consulta rápida convierte dudas en compras y la tienda ya coordina pedidos por
WhatsApp (HU-20). Es una historia importante (M, HU-59).

**Independent Test**: Abrir el «Samsung Galaxy S23 256 GB», pulsar «Consultar por WhatsApp» y ver que se abre
`wa.me` con el número de la tienda y un mensaje con el nombre del producto y su enlace; abrir el catálogo y
ver el botón flotante.

**Acceptance Scenarios**:

1. **Given** un producto sin variantes y un número de WhatsApp configurado, **When** el cliente pulsa
   «Consultar por WhatsApp», **Then** se abre en una pestaña nueva el enlace de WhatsApp con el número de la
   tienda y el mensaje «Hola R Cube, quiero información de <nombre del producto>. <enlace al producto>».
2. **Given** un producto con variantes y una variante elegida, **When** pulsa el botón, **Then** el mensaje
   incluye el nombre de la variante (por ejemplo «… Motorola Edge 60 Pro (256 GB · Azul)…»).
3. **Given** cualquier pantalla de la tienda salvo el checkout, el comprobante y el panel, **When** se
   muestra, **Then** aparece el botón flotante «Escríbenos por WhatsApp», que abre WhatsApp con el mensaje
   «Hola R Cube, tengo una consulta.», y el pie de página trae el enlace «WhatsApp».
4. **Given** una tienda sin número de WhatsApp configurado, **When** se abre cualquier pantalla, **Then** no
   se muestra ningún botón ni enlace de WhatsApp y no hay errores.
5. **Given** que el administrador cambia el número en la configuración, **When** el cliente recarga la
   tienda, **Then** los botones usan el número nuevo sin publicar de nuevo.
6. **Given** un producto cuyo nombre lleva tildes, comillas o el símbolo &, **When** se abre WhatsApp,
   **Then** el mensaje llega completo y sin caracteres rotos.

---

### User Story 7 - Escribir al cliente por WhatsApp desde el panel (Priority: P3)

El administrador, desde el detalle de un pedido o de un cliente, pulsa «Escribir por WhatsApp» y se abre
WhatsApp con el celular del cliente y un saludo listo (con el número de pedido si lo hace desde el pedido).

**Why this priority**: La tienda confirma pagos de Yape, Plin y transferencia y coordina por WhatsApp
(HU-36); escribir al cliente desde el mismo panel ahorra copiar números (M, HU-60).

**Independent Test**: Como administrador abrir el pedido de un cliente con celular y pulsar el botón: se
abre `wa.me` con 51 más el celular y el saludo con el número del pedido; en un cliente sin celular el botón
aparece deshabilitado con el aviso «Sin celular válido».

**Acceptance Scenarios**:

1. **Given** un pedido de un cliente con celular de 9 dígitos, **When** el administrador pulsa «Escribir por
   WhatsApp», **Then** se abre WhatsApp con el número 51 más el celular y el mensaje «Hola <nombre>, te
   escribimos de R Cube por tu pedido RC-000001.».
2. **Given** el detalle de un cliente, **When** el administrador pulsa el botón, **Then** el mensaje es «Hola
   <nombre>, te escribimos de R Cube.».
3. **Given** un cliente sin celular o con un celular que no es peruano de 9 dígitos que empiece con 9,
   **When** el administrador abre su pedido o su ficha, **Then** el botón aparece deshabilitado con «Sin
   celular válido» y no abre nada.
4. **Given** un celular escrito con espacios, guiones o el prefijo +51 (por ejemplo «+51 987-654 321»),
   **When** se pulsa el botón, **Then** se usa el número normalizado 51987654321.

---

### Edge Cases

- **Producto con el máximo de 8 fotos y variantes con foto propia**: las fotos de las variantes forman
  parte de las 8 del producto (límite que esta feature sube de 6 a 8); no hay un conjunto aparte.
- **Pantalla de 320 px de ancho**: la galería, las miniaturas, la vista ampliada, el bloque de destacados y
  la página de créditos no producen desplazamiento horizontal de la página; las miniaturas se desplazan
  dentro de su propia franja.
- **Navegar de un producto a otro** (por ejemplo desde «Productos relacionados»): la galería del nuevo
  producto empieza en su primera foto.
- **El cliente elige una variante con foto propia y luego navega a mano**: se respeta la última acción del
  cliente.
- **Las flechas del teclado con el foco fuera de la galería** (por ejemplo, en el selector de variante o en
  la cantidad): no cambian la foto; solo actúan con el foco dentro de la galería o de la vista ampliada.
- **Conexión lenta**: la primera foto se pide con prioridad y las demás se cargan cuando se necesitan; el
  espacio de la foto grande está reservado, así que el diseño no salta al cargarla.
- **El administrador deja un producto con 0 fotos**: se muestra la imagen genérica; con 1 foto no hay
  controles; el mínimo de 4 fotos solo se exige a los datos de demostración, no a los productos que crea el
  administrador.
- **El administrador sube una foto nueva** (feature 002): aparece al final de la galería y pasa a ser la
  principal solo si él la marca.
- **Fotos antiguas en pedidos, carrito y favoritos**: estas pantallas siguen usando la foto principal del
  producto; los archivos de las fotos de demostración que ya existen no se borran porque los pedidos
  anteriores los referencian (RN-06, RN-07).
- **Frase o viñetas con caracteres especiales o muy anchos** (por ejemplo una palabra larga sin espacios): se
  ajustan a la línea siguiente sin desbordar.
- **La fuente externa deja de estar disponible**: la tienda no se ve afectada, porque las fotos se sirven
  desde la propia tienda; el enlace de origen puede dejar de abrir, pero el crédito sigue visible.
- **Las tarjetas gráficas y el administrador cambia las especificaciones, la frase o los destacados del
  producto**: las tarjetas no se vuelven a generar solas; siguen mostrando los datos con que se crearon
  (limitación declarada en Assumptions).
- **WhatsApp sin número configurado o con un número vacío**: la tienda no muestra botones ni enlaces de
  WhatsApp y no falla; el panel no se ve afectado.
- **El botón flotante de WhatsApp en pantallas pequeñas**: no tapa «Agregar al carrito», los totales ni los
  botones de pago; deja margen a los bordes, no aparece al imprimir y la vista ampliada de fotos queda por
  encima de él.
- **Celular del cliente con otro formato** (fijo, con menos de 9 dígitos, o de otro país): el botón del
  panel aparece deshabilitado; nunca se abre WhatsApp con un número inventado.

## Requirements *(mandatory)*

### Functional Requirements

**Galería (HU-54)**

- **FR-001**: El detalle del producto MUST mostrar todas sus fotos en orden, con la primera como foto
  principal en grande. Cuando el producto tiene 2 o más fotos MUST mostrar además el contador «N de M»,
  las miniaturas con la activa marcada y los botones «Foto anterior» y «Foto siguiente».
- **FR-002**: El cliente MUST poder cambiar de foto con los botones, con las miniaturas, con las flechas
  izquierda y derecha del teclado cuando el foco está dentro de la galería y, en pantallas táctiles,
  deslizando horizontalmente sobre la foto sin bloquear el desplazamiento vertical de la página.
- **FR-003**: La navegación MUST ser circular: «Foto siguiente» en la última lleva a la primera y «Foto
  anterior» en la primera lleva a la última.
- **FR-004**: La galería MUST ser operable con lector de pantalla: región con nombre «Galería de fotos»,
  botones con nombre accesible, miniaturas que indican cuál está seleccionada («Ver foto 2 de 5») y un
  anuncio del cambio de foto («Foto 2 de 5»). El texto alternativo de cada foto describe lo que se ve.
- **FR-005**: Con una sola foto el detalle MUST mostrarla sin flechas, contador ni miniaturas; sin ninguna
  foto MUST mostrar la imagen genérica.
- **FR-006**: Al elegir una variante con foto propia la galería MUST mostrar esa foto (HU-44); una elección
  manual posterior del cliente MUST prevalecer.
- **FR-007**: Al pasar de un producto a otro la galería MUST empezar en la primera foto del nuevo producto.
- **FR-008**: La foto grande MUST reservar su espacio para no mover el diseño al cargar; la primera foto MUST
  pedirse con prioridad y las demás cuando se necesiten; una foto que no carga MUST sustituirse por la imagen
  genérica sin romper la navegación (RNF-04).
- **FR-009**: Los controles de la galería MUST tener un área táctil de al menos 44 px y foco visible, y la
  galería MUST NOT producir desplazamiento horizontal de la página desde 320 px de ancho (RNF-02, RNF-03).

**Vista ampliada (HU-55)**

- **FR-010**: Tocar o pulsar la foto grande, o el botón «Ampliar foto», MUST abrir una vista a pantalla
  completa con la foto activa en el mayor tamaño que quepa, el contador, los botones «Foto anterior» y «Foto
  siguiente» (si hay más de una foto) y el botón «Cerrar».
- **FR-011**: La vista ampliada MUST cerrarse con Escape o con «Cerrar»; al cerrarse el foco MUST volver al
  control que la abrió y la galería MUST quedar en la foto en que se quedó la vista. Mientras está abierta,
  el foco MUST permanecer dentro de ella y la página de fondo MUST NOT desplazarse. Tiene nombre accesible.
- **FR-012**: Dentro de la vista ampliada el cliente MUST poder cambiar de foto con las flechas del teclado,
  los botones y, en pantallas táctiles, deslizando. La vista MUST NOT ofrecer zoom propio (doble toque o
  arrastre) ni bloquear el pellizco nativo del navegador.
- **FR-013**: Las aperturas, cierres y cambios de foto MUST respetar la preferencia de reducir el movimiento
  (sin animaciones).

**Frase y destacados (HU-56, HU-57)**

- **FR-014**: Un producto MUST poder tener una frase corta (opcional, hasta 90 caracteres) y de 0 a 5
  destacados (hasta 60 caracteres cada uno), todo en texto plano.
- **FR-015**: El detalle MUST mostrar bajo el nombre del producto la frase y los destacados que existan,
  antes de las opciones de compra; si no hay ninguno MUST NOT mostrar el bloque ni dejar espacio vacío.
- **FR-016**: La frase y los destacados MUST mostrarse siempre como texto, aunque contengan símbolos de HTML.
- **FR-017**: La descripción larga y las especificaciones del producto MUST NOT cambiar: los destacados las
  complementan y no las reemplazan. La búsqueda del catálogo y la del panel MUST seguir igual (nombre, marca
  y descripción) y MUST NOT considerar la frase ni los destacados.
- **FR-018**: El administrador MUST poder escribir, editar y quitar la frase y los destacados en el
  formulario del producto, al crear y al editar. El servidor MUST validar los límites del FR-014, recortar
  espacios, descartar los destacados vacíos y responder con mensajes por campo: «La frase no puede pasar de
  90 caracteres», «Máximo 5 destacados» y «Cada destacado admite hasta 60 caracteres».
- **FR-019**: Todo cambio de frase o destacados MUST quedar en la auditoría con quién, cuándo, producto y
  valor anterior y nuevo (HU-42).
- **FR-020**: Solo el administrador MUST poder cambiar la frase y los destacados; las solicitudes de un
  visitante MUST responder 401 y las de un cliente 403, sin cambiar nada (RN-08).

**Créditos (HU-58)**

- **FR-021**: Toda foto de demostración tomada de una fuente externa MUST tener registrados su autor, el
  nombre de su licencia y el enlace de su página de origen; las licencias admitidas son dominio público,
  CC0, CC BY y CC BY-SA (no se admiten licencias NC ni ND). Una foto externa sin esos datos MUST NOT
  incluirse en los datos de demostración.
- **FR-022**: La tienda MUST ofrecer una página pública «Créditos de las fotos», enlazada desde el pie de
  página, que liste cada foto con crédito: producto (con enlace a su detalle), autor, licencia y enlace al
  origen, con un estado vacío cuando no haya ninguna. Las fotos originales aportadas por el proyecto, que no
  tienen autor registrado, MUST aparecer juntas en un grupo «Fotos aportadas por el proyecto» con los
  productos a los que pertenecen, sin autor ni licencia individual.
- **FR-023**: Las fotos subidas por el administrador y las tarjetas gráficas MUST NOT aparecer en la lista
  de créditos; la página MUST aclarar que las tarjetas de características son de R Cube.
- **FR-024**: Los enlaces de origen MUST abrirse en una pestaña nueva sin dar acceso a la página de la
  tienda, y la página de créditos MUST ser legible en tema claro y oscuro y cumplir el contraste AA.

**Datos de demostración**

- **FR-025**: Cada uno de los 37 productos activos de demostración MUST tener entre 4 y 6 fotos. La primera
  MUST mostrar un único equipo, completo y reconocible; MUST NOT ser una foto con varios equipos, de la
  parte inferior del equipo, de un componente interno ni de otro modelo.
- **FR-026**: Cada producto activo de demostración MUST tener de 1 a 3 fotos reales o del proyecto (la
  primera es la principal) y MUST completarse con exactamente 3 tarjetas gráficas al final. Las fotos reales
  adicionales MUST ser, siempre que exista una buena foto con licencia libre, fotos del mismo modelo o del
  mismo tipo de producto desde otros ángulos (frente, parte trasera, lateral, en uso).
- **FR-027**: Las tarjetas gráficas MUST ser tres por producto y ocupar las últimas posiciones de su galería
  en este orden: **características** (marca, nombre y hasta 4 especificaciones del producto),
  **destacados** (la frase y los destacados del producto) y **compra segura** (las 4 formas de pago, la
  entrega por zona o el recojo en tienda, el IGV incluido y la atención por WhatsApp). MUST generarse con
  el estilo de R Cube (colores y tipografía de la tienda, con un diseño cuidado de ficha de producto),
  mostrar solo datos que el producto o la tienda ya tienen (sin precios, plazos ni garantías inventados),
  MUST NOT imitar una foto real, y su texto alternativo MUST listar los datos que muestran.
- **FR-028**: Cada foto de demostración MUST tener un texto alternativo en español que describa lo que se
  ve, distinto de las demás fotos del mismo producto.
- **FR-029**: Cada producto activo de demostración MUST tener una frase y entre 3 y 5 destacados en español
  de Perú, de tono comercial y breve, y MUST NOT afirmar nada que no esté respaldado por las
  especificaciones o la descripción del propio producto.
- **FR-030**: Cada foto de demostración que se muestre en la galería MUST pesar como máximo 200 KB y medir
  como máximo 1,200 px de lado mayor, y MUST servirse desde la propia tienda (no desde un sitio externo).
- **FR-031**: Los archivos de las fotos de demostración que ya existen MUST conservarse (los pedidos
  anteriores los referencian); pueden optimizarse sin cambiar su dirección. Una foto original que no sirve
  como principal MUST ceder el primer lugar a una foto mejor; MUST quedar como foto posterior solo si
  muestra el equipo correcto, y MUST retirarse de la galería de ese producto (sin borrar su archivo) si
  induce a error: varios equipos, parte inferior o interna, u otro modelo.
- **FR-032**: En los productos con variantes, las fotos propias de las variantes MUST contarse dentro del
  rango de 4 a 6 fotos.

**Contacto por WhatsApp (HU-59, HU-60)**

- **FR-037**: El detalle del producto MUST mostrar el botón «Consultar por WhatsApp», que abre `wa.me` en una
  pestaña nueva (sin dar acceso a la página de la tienda) con el número de la tienda y un mensaje que
  nombra el producto, la variante elegida si la hay y el enlace al producto, correctamente codificado.
- **FR-038**: Todas las pantallas de la tienda, salvo el checkout, el comprobante y el panel, MUST mostrar un
  botón flotante «Escríbenos por WhatsApp» con el mensaje «Hola R Cube, tengo una consulta.»; el pie de
  página MUST incluir el enlace «WhatsApp». El botón flotante MUST NOT aparecer al imprimir, MUST NOT tapar
  los controles principales de las pantallas de la tienda y MUST quedar por debajo de la vista ampliada de
  fotos.
- **FR-039**: El número MUST salir de la configuración de la tienda (HU-41) mediante una consulta pública que
  devuelve solo el nombre y el número de WhatsApp de la tienda; si no hay número configurado, la tienda MUST
  NOT mostrar ningún botón ni enlace de WhatsApp. Un cambio del número MUST reflejarse sin publicar de nuevo.
- **FR-040**: El detalle de un pedido y el de un cliente en el panel MUST ofrecer el botón «Escribir por
  WhatsApp», que abre `wa.me` con el celular del cliente (51 más 9 dígitos que empiezan con 9) y un saludo
  con su nombre, y con el número de pedido cuando se usa desde el pedido. Los celulares se normalizan
  (espacios, guiones y prefijo +51). Si no hay un celular válido, el botón MUST aparecer deshabilitado con
  «Sin celular válido» y MUST NOT abrir nada.
- **FR-041**: Los botones de WhatsApp MUST NOT registrar nada en el servidor ni integrar un chat: solo abren
  el enlace `wa.me`.

**Compatibilidad y calidad**

- **FR-033**: Las fotos que el administrador sube desde el panel MUST seguir funcionando como en la feature
  002 pero con un tope de 8 fotos por producto (antes 6; el mensaje al superarlo es «Máximo 8 fotos por
  producto»), JPG, PNG o WebP de hasta 2 MB, foto principal, orden y borrado, y aparecer en la galería; el
  mínimo de 4 fotos MUST NOT exigirse a los productos que crea el administrador.
- **FR-034**: El carrito, el checkout, los pedidos y los favoritos MUST seguir usando la foto principal del
  producto (o la foto propia de la variante elegida, como en la feature 003) sin cambios de comportamiento.
- **FR-035**: La galería, la vista ampliada, el bloque de destacados, el formulario de destacados, la
  página de créditos y los botones de WhatsApp MUST cumplir WCAG 2.2 AA en tema claro y oscuro, con foco visible y uso completo con
  teclado (RNF-03).
- **FR-036**: Todo texto nuevo MUST estar en español de Perú (RNF-01).

### Key Entities *(include if feature involves data)*

- **Foto de producto** (existente): imagen de un producto con dirección, texto alternativo y posición; la
  primera es la principal. Ahora puede llevar un **crédito** opcional (autor, licencia y enlace de origen).
  Una foto puede ser una fotografía o una de las tres tarjetas gráficas (características, destacados y
  compra segura).
- **Crédito de foto**: autor, nombre de la licencia y enlace de origen de una foto tomada de una fuente
  libre. Se muestra en la página de créditos.
- **Destacados del producto**: frase corta opcional y lista ordenada de 0 a 5 viñetas de un producto, en
  texto plano.
- **Contacto de WhatsApp de la tienda** (existente en la configuración, HU-41): nombre y número de la tienda,
  ahora consultables de forma pública (solo esos dos datos) para armar los botones de WhatsApp.
- **Entrada de auditoría** (existente): ahora también registra los cambios de frase y destacados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En un producto de 5 fotos, un cliente llega a cualquiera de ellas en 4 gestos o menos (tocar
  una miniatura, o tocar o deslizar una vez por foto) y en todo momento sabe en cuál está gracias al
  contador.
- **SC-002**: El 100 % de los 37 productos activos de demostración tiene de 4 a 6 fotos (con sus 3
  tarjetas), una frase y de 3 a 5 destacados.
- **SC-003**: Una persona no técnica que revisa los 37 productos de demostración confirma que la primera
  foto de cada uno muestra un único equipo reconocible (revisión guiada con la lista de `quickstart.md`).
- **SC-004**: El 100 % de las fotos de demostración tomadas de una fuente externa aparece en la página de
  créditos con autor, licencia y un enlace de origen que abre.
- **SC-005**: Un administrador cambia la frase y los destacados de un producto en menos de 1 minuto y el
  cambio se ve en la tienda al recargar, con su entrada en la auditoría.
- **SC-006**: Todo el recorrido de la galería y de la vista ampliada se completa solo con el teclado, y el
  foco nunca se pierde: al cerrar con Escape vuelve al control que abrió la vista.
- **SC-007**: Ninguna pantalla nueva o modificada produce desplazamiento horizontal a 320 px de ancho, y
  todas pasan la revisión automática de accesibilidad AA en tema claro y oscuro.
- **SC-008**: Un producto de demostración con 6 fotos descarga como máximo 1.2 MB de fotos en total aunque
  el cliente las vea todas, y su primera foto aparece sin que el diseño se mueva.
- **SC-009**: Todas las pruebas de las features 001 a 003 siguen pasando, y cada historia HU-54 a HU-60
  tiene al menos una prueba automática que la nombra.
- **SC-010**: Un visitante abre una consulta por WhatsApp sobre el producto que está viendo en 2 acciones
  o menos (ver el producto y pulsar el botón), y el mensaje nombra ese producto y su variante.
- **SC-011**: Un administrador abre WhatsApp con el cliente de un pedido en 2 acciones o menos (abrir el
  pedido y pulsar el botón), con el número de pedido en el saludo.

## Assumptions

- Los formatos (JPG, PNG o WebP), el peso máximo de 2 MB al subir y la foto principal con orden son los de
  la feature 002 y no cambian; el tope de fotos por producto sube de 6 a 8 (HU-31 actualizada).
- Los datos de demostración usan de 4 a 6 fotos por producto (1 a 3 reales o del proyecto y 3 tarjetas), lo
  que deja al menos 2 lugares libres del tope de 8 a las fotos que suba el administrador.
- La frase y los destacados son texto plano en un solo idioma (español de Perú); no admiten formato, enlaces
  ni emojis obligatorios. No se reordenan: el orden es el que escribe el administrador.
- La navegación de la galería es circular (FR-003); es una decisión de diseño por defecto, no una
  clarificación pendiente.
- Las fotos adicionales de demostración se descargan una sola vez de Wikimedia Commons al preparar los datos
  de demostración y se guardan junto a la tienda; la tienda no depende de ese sitio mientras funciona.
- Las tarjetas gráficas se generan una vez como parte de los datos de demostración, con los datos del
  producto y de la tienda en ese momento (por ejemplo, las formas de pago activas de la configuración
  inicial); no se regeneran solas si el administrador cambia las especificaciones, la frase, los destacados
  o los métodos de pago después. Las fotos de Commons nunca se mezclan dentro de las tarjetas.
- Las fotos originales de `docs/fotos` las aportó el equipo del proyecto y su autor y licencia no están
  registrados (clarificación 2026-11-16): la página de créditos las agrupa como «Fotos aportadas por el
  proyecto» y queda como riesgo declarado confirmar su origen antes de publicar la tienda.
- Los 37 productos activos son los de los datos de demostración (3 de ellos tienen variantes, de la
  feature 003); el producto inactivo de demostración no necesita fotos nuevas, frase ni destacados.
- Las tarjetas del catálogo siguen mostrando solo la foto principal; no hay cambio de foto al pasar el
  cursor ni se agrega la calificación (decisión de alcance).
- La frase y los destacados se escriben una vez por producto y no por variante.
- Los pedidos creados antes de esta feature no cambian.
- El contacto por WhatsApp usa solo enlaces `wa.me` (sin API de WhatsApp Business, sin chat integrado y sin
  mensajes automáticos); el número de la tienda es el de la configuración (HU-41) y el celular del cliente
  es el de su cuenta (cliente peruano: 51 más 9 dígitos que empiezan con 9).
- Fuera de alcance (REQUISITOS §1 o pedido del cliente): video, vista 360, lupa que sigue al cursor,
  imágenes generadas con IA que simulen fotos reales de un equipo, cambios en carrito, checkout o pedidos,
  chat integrado o WhatsApp Business API, correos, facturación electrónica real, varios vendedores, pasarelas de pago reales, aplicación móvil
  nativa, varios idiomas y varias monedas.
