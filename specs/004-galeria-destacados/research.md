# Research: Galería y destacados del producto (R Cube)

Decisiones técnicas de la feature 004. Todas parten del stack ya instalado (ver `plan.md`); no queda ningún
punto por aclarar. Formato: decisión, razón, alternativas descartadas.

## R1. Carrusel propio con `scroll-snap`, sin librería

- **Decisión**: un único componente `PhotoCarousel` con una pista horizontal de CSS (`overflow-x: auto`,
  `scroll-snap-type: x mandatory`, una foto por pantalla). El deslizar con el dedo lo hace el navegador; los
  botones, las miniaturas y el teclado llaman a `scrollTo` hacia la foto elegida. La foto activa se calcula
  con un `IntersectionObserver` sobre las diapositivas. La navegación circular (FR-003) es `scrollTo` a la
  primera o a la última. La pista no usa `touch-action: none`, así que el desplazamiento vertical de la
  página y el pellizco del navegador siguen funcionando (FR-002, FR-012).
- **Razón**: cumple deslizar, flechas, miniaturas y teclado con unas 80 líneas y sin dependencia nueva
  (principio I). El navegador ya resuelve la inercia, el eje de gesto y el desplazamiento vertical, que son
  lo difícil de un carrusel hecho con eventos de puntero.
- **Alternativas**: Embla o Swiper (descartadas: dependencia nueva y más peso para un caso simple);
  `translateX` con eventos de puntero propios (descartada: reimplementa gestos, inercia y conflictos con el
  desplazamiento vertical); mostrar una sola foto y cambiarla con estado, sin pista (descartada: no hay
  deslizar con el dedo, lo pide FR-002).

## R2. Vista ampliada con el `Dialog` de radix-ui, sin zoom propio

- **Decisión**: `PhotoViewer` es un `Dialog` de radix-ui a pantalla completa que contiene otro
  `PhotoCarousel` con `object-fit: contain`. Radix aporta el foco atrapado, Escape, el retorno del foco al
  control que abrió, el bloqueo del desplazamiento de fondo y `aria-modal` (FR-011). Abre en la foto activa y,
  al cerrar, la galería queda en la foto en que se quedó (el índice sube por `onIndexChange`). Sin zoom
  propio (clarificación 4): el pellizco nativo sigue permitido. Con reducir movimiento se usa
  `scroll-behavior: auto` y sin transiciones (FR-013).
- **Razón**: el `Dialog` ya existe en el panel (`ConfirmDialog`) y resuelve los casos de accesibilidad que
  más fallan al hacerlo a mano.
- **Alternativas**: etiqueta `<dialog>` nativa (descartada: el foco y el bloqueo de fondo varían entre
  navegadores y el proyecto ya estandariza radix); lightbox de terceros (descartada: dependencia nueva).

## R3. Semántica de accesibilidad de la galería

- **Decisión**: la galería es `role="region"` con `aria-roledescription="carrusel"` y nombre «Galería de
  fotos»; cada diapositiva es `role="group"` con `aria-roledescription="foto"` y nombre «Foto 2 de 5»; las
  diapositivas no activas llevan `inert` para que el lector de pantalla y Tab no entren en fotos ocultas; un
  texto solo visual para lectores con `aria-live="polite"` anuncia «Foto 2 de 5» al cambiar; las miniaturas
  son botones con nombre «Ver foto 2 de 5» y `aria-current="true"` en la activa. Las flechas izquierda y
  derecha del teclado actúan solo con el foco dentro de la galería o de la vista (FR-002). Controles con
  área táctil de 44 px y foco visible con el token `--focus`.
- **Razón**: sigue el patrón de carrusel de WAI-ARIA y es comprobable con axe y con pruebas de teclado.
- **Alternativas**: `tablist` para las miniaturas (descartada: no es un conjunto de paneles con pestañas
  sino una navegación entre fotos).

## R4. Frase y destacados como columnas del producto

- **Decisión**: `product.tagline` (`text not null default ''`, `CHECK char_length <= 90`) y
  `product.highlights` (`jsonb not null default '[]'`, `CHECK jsonb_typeof = 'array' and
  jsonb_array_length <= 5`), el mismo tipo que ya usa `specs`. La regla de límites y de normalización vive en
  `src/shared/highlights.ts` (`TAGLINE_MAX = 90`, `HIGHLIGHT_MAX = 60`, `HIGHLIGHTS_MAX = 5`,
  `normalizeHighlights()`: recorta espacios y descarta vacíos) y la usan el servidor y el formulario.
- **Razón**: se leen siempre junto con el producto (sin consulta extra); son pocos y se reemplazan enteros
  (principio I). La longitud de cada viñeta la valida Zod en el servidor (`CHECK` de la base solo protege
  la cantidad y la frase, porque validar el texto de cada elemento exige una función).
- **Alternativas**: tabla `product_highlight` con una fila por viñeta (descartada: orden y relaciones sin
  beneficio para 5 textos); `text[]` (descartada: `specs` ya es `jsonb` y el formulario ya maneja listas).

## R5. Validación, mensajes y auditoría

- **Decisión**: el cuerpo de `POST` y `PATCH /api/admin/products` suma `tagline` y `highlights`
  (opcionales, por defecto vacíos). Los errores salen por campo con las claves que ya produce
  `validationHook` (`tagline`, `highlights` y `highlights.N`): «La frase no puede pasar de 90 caracteres»,
  «Máximo 5 destacados» y «Cada destacado admite hasta 60 caracteres». Un cambio de frase o de destacados se
  audita dentro de la misma transacción de la edición, con `before` y `after`: si es lo único que cambió
  reemplaza al texto genérico («Frase y destacados de X actualizados»); si cambió también el precio, se
  agrega una segunda entrada. Es la acción existente `producto_editado`; no hay acción nueva.
- **Razón**: reutiliza `productBody`, `validationHook` y `audit()` (HU-42); una sola entrada por cambio
  relevante evita ruido en la auditoría.
- **Alternativas**: acción de auditoría nueva `destacados` (descartada: el panel y las pruebas de la 002
  ya muestran `producto_editado`; un valor nuevo obliga a tocar etiquetas y filtros sin beneficio).

## R6. Las fotos se preparan fuera de línea

- **Decisión**: tres scripts de desarrollo en `scripts/fotos/` (`buscar.ts`, `preparar.ts`, `tarjetas.ts`)
  producen los archivos `.webp` de `public/img/productos/galeria/` y un manifiesto tipado,
  `src/db/gallery-data.ts`, que dice qué fotos tiene cada producto, en qué orden, con qué texto alternativo
  y qué crédito, y su frase y destacados. El manifiesto se escribe a mano (los textos los revisa una
  persona) y el seed lo lee. El Worker nunca descarga ni procesa imágenes.
- **Razón**: principio VIII (nada de red ni archivos en ejecución) y reproducibilidad: cualquiera puede ver
  de dónde salió cada foto y regenerar los archivos.
- **Alternativas**: procesar al subir o al servir (descartada: añade cómputo y módulos al Worker); guardar
  las fotos sin manifiesto (descartada: no habría crédito verificable).

## R7. Fuente de las fotos extra: Wikimedia Commons

- **Decisión**: la API de Commons (`action=query`, `generator=search`, `prop=imageinfo` con
  `extmetadata`) devuelve autor (`Artist`), licencia (`LicenseShortName`), página de origen y miniaturas;
  se comprobó con «Samsung Galaxy S23» (resultados CC BY-SA 4.0 y CC BY 4.0). `buscar.ts` solo lista
  candidatas con licencia admitida (CC0, dominio público, CC BY y CC BY-SA, nunca NC ni ND); cada foto
  elegida se mira a mano (herramienta de lectura de imágenes) y se acepta solo si muestra el equipo correcto.
  Se usa un `User-Agent` genérico de proyecto educativo, sin datos personales. En la demostración cada
  producto lleva de 4 a 6 fotos (de 1 a 3 reales y 3 tarjetas), lo que deja 2 lugares libres del tope de 8 para
  las fotos del panel.
- **Razón**: es la fuente que ya usan las fotos originales del proyecto y expone licencia y autor como
  datos, lo que permite cumplir FR-021 de forma comprobable.
- **Alternativas**: sitios de fotos de stock (descartadas: licencias propias y sin API uniforme de
  atribución); fotos de fabricantes (descartadas: no son libres).
- **Riesgos**: no todo producto tendrá buenas fotos libres (por ejemplo, las 4 tablets no tienen foto
  propia hoy). Mitigación: foto del mismo tipo de producto y tarjeta de características; la tarea de
  verificación lista los productos con menos de 3 fotos y se decide caso por caso.

## R8. Optimización a WebP con Playwright

- **Decisión**: `preparar.ts` abre Chromium con Playwright, dibuja cada imagen en un `canvas` reducida a
  1 200 px de lado mayor como máximo y la exporta con `toBlob("image/webp", calidad)`, bajando la calidad
  (0,86 → 0,5) y luego el tamaño hasta pesar 200 KB o menos. Se midió con fotos reales del proyecto:
  `laptop-dell-inspiron.png` pasa de 1,3 MB a 65 KB y `laptop-msi-gaming.png` de 933 KB a 70 KB con
  calidad 0,8. Los archivos nuevos van a `public/img/productos/galeria/<slug>-<n>.webp`; **los archivos
  actuales de `public/img/productos/` no se tocan**, porque los pedidos de demostración los referencian
  (FR-031, RN-07).
- **Razón**: no agrega dependencia (Playwright ya está) y conserva el transparente de los PNG; el WebP lo
  soportan todos los navegadores actuales.
- **Alternativas**: `sharp` (descartada: módulo nativo y dependencia nueva); reducir con miniaturas de
  Commons (descartada: los PNG siguen pesando más de 200 KB).

## R9. Tres tarjetas gráficas por producto

- **Decisión**: `tarjetas.ts` renderiza con Playwright, a partir de plantillas HTML de 1 000 × 1 000 px con
  los tokens de R Cube (fondo oscuro con degradado, acento `#3b93ff`, texto `#f5f5f7`, el logo de
  `public/img/logo.png` y una tipografía sans de sistema), **tres tarjetas por producto**, siempre al final de
  su galería y en este orden: (1) **características**: marca, nombre y hasta 4 especificaciones del propio
  producto, cada una con un icono vectorial según su etiqueta (pantalla, almacenamiento, cámara, batería,
  RAM, procesador, y una marca de verificación por defecto); (2) **destacados**: la frase en grande y los
  destacados con marcas de verificación; (3) **compra segura**: las 4 formas de pago (tarjeta, Yape o Plin,
  transferencia y WhatsApp), la entrega por zona o el recojo en tienda, el IGV incluido y la atención por
  WhatsApp. Ningún texto afirma precios, plazos ni garantías que el sistema no tenga. Todas son imágenes
  fijas con buen contraste propio; sus textos alternativos listan lo que muestran (FR-027, FR-028). Las
  tarjetas **no** incluyen fotos de Commons: así ninguna foto con licencia de compartir igual queda mezclada
  dentro de otra imagen. Cada una es una fila de `product_image` con `origin = 'tarjeta'`; el manifiesto las
  distingue con `card: "caracteristicas" | "destacados" | "compra"`.
- **Razón**: replica lo que hacen las fichas de AliExpress (varias imágenes de información además de las
  fotos) con contenido verídico y propio; y no depende de la calidad de las fotos libres, que varía.
- **Alternativas**: imágenes generadas con IA (fuera de alcance); composiciones con la foto del producto sobre
  un degradado (descartada: modificaría las fotos de Commons y complica la licencia); una sola tarjeta
  (descartada: no alcanza el nivel de detalle que se pidió).
- **Limitación declarada**: las tarjetas se generan una vez; si el administrador cambia especificaciones,
  frase, destacados o métodos de pago, hay que volver a ejecutar `npm run fotos:tarjetas` y el seed.

## R10. Crédito en `product_image`

- **Decisión**: columnas nuevas en `product_image`: `origin text not null default 'subida'` con valores
  `subida`, `proyecto`, `externa` y `tarjeta`; `credit_author`, `credit_license` y `credit_url`
  (`text not null default ''`). Restricción `CHECK (origin <> 'externa' or (credit_author <> '' and
  credit_license <> '' and credit_url <> ''))`: una foto externa sin crédito no puede existir (FR-021). La
  migración deja `proyecto` en las fotos estáticas actuales (`r2_key is null`) y `subida` en las de R2. La
  subida del panel no cambia: inserta con el valor por defecto `subida`. La licencia se muestra con su
  enlace (mapa en `src/shared/photo-credit.ts` de «CC BY 4.0», «CC BY-SA 4.0», «CC0 1.0»…); en las fotos
  CC BY-SA la página aclara que pueden estar reducidas de tamaño y siguen bajo la misma licencia.
- **Razón**: una sola fuente de verdad junto a la foto; si el administrador borra la foto, desaparece su
  crédito; la base impide el dato incompleto.
- **Alternativas**: tabla `photo_credit` 1:1 (descartada: un join sin beneficio); crédito solo en un archivo
  JSON estático (descartada: se desincroniza al borrar o reordenar fotos).

## R11. API y página de créditos

- **Decisión**: `GET /api/catalog/photo-credits` (público, sin sesión) devuelve `external` (foto, producto,
  autor, licencia, enlace de origen) y `project` (productos con fotos aportadas por el proyecto). La página
  `/creditos-fotos` la muestra agrupada por producto, con estado de carga, vacío y error, enlaces de origen
  con `target="_blank"` y `rel="noopener noreferrer"` y un aviso de que las tarjetas son de R Cube. El pie
  de página (`Layout`) gana el enlace «Créditos de las fotos». Sin paginación: son unas 100 filas.
- **Razón**: cumple FR-022 a FR-024 sin estado de servidor nuevo; reutiliza el patrón de las rutas públicas
  de `catalog.ts`.
- **Alternativas**: un modal o una sección dentro del detalle (descartada: HU-58 pide una página enlazada
  desde el pie).

## R12. Rendimiento de carga

- **Decisión**: la primera foto del detalle lleva `fetchpriority="high"` y el resto `loading="lazy"`; el
  contenedor de la foto grande reserva su espacio con proporción fija (sin saltos de diseño); las miniaturas
  usan los mismos archivos (con `loading="lazy"` y ya ≤ 200 KB); una foto que falla se reemplaza por la
  imagen genérica sin romper la navegación. Cota: 6 fotos × 200 KB = 1,2 MB (SC-008).
- **Razón**: cumple RNF-04 sin generar un segundo tamaño de cada foto (principio I).
- **Alternativas**: miniaturas aparte de 120 px (descartada: duplica archivos por una mejora pequeña).

## R13. Estrategia de pruebas

- **Decisión**: unitarias (`highlights`, `photo-credit`, `whatsapp` y la integridad del manifiesto: cada
  producto activo con 4 a 6 fotos, de 1 a 3 reales y 3 tarjetas al final en orden, textos alternativos
  distintos, frase ≤ 90, de 3 a 5 destacados ≤ 60, cada archivo existe, pesa ≤ 200 KB y mide ≤ 1 200 px,
  cada foto externa trae autor, licencia admitida y enlace); de API (editar frase y destacados con límites, normalización, auditoría, permisos 401 y 403,
  detalle con los campos nuevos, `photo-credits`, copia de `origin` y la restricción del crédito); e2e
  (galería con flechas, miniaturas, teclado y desplazamiento de la pista; vista ampliada con Escape y retorno
  del foco; edición en el panel; créditos desde el pie; WhatsApp en el producto, flotante y en el panel con el
  enlace `wa.me` esperado) y accesibilidad ampliada (detalle con galería, vista
  abierta y créditos, ambos temas, sin desborde a 320 px). El deslizar con el dedo se prueba desplazando la
  pista (`scrollLeft`), porque Playwright no tiene un gesto de deslizar.
- **Razón**: una prueba por regla (principio VI) y la revisión humana de la calidad visual en el
  quickstart.

## R14. Contacto por WhatsApp con enlaces `wa.me`

- **Decisión**: todo es del lado del navegador, sin chat ni API de WhatsApp Business. `GET
  /api/catalog/contact` (pública) devuelve `{ name, whatsappNumber }` leídos de `store_settings`, con el número
  solo en dígitos (`""` si no hay). El hook `useStoreContact` (TanStack Query, `staleTime` de 5 minutos) lo
  pide una sola vez para toda la tienda. `src/shared/whatsapp.ts` suma funciones puras y con prueba
  unitaria: `productInquiryUrl(number, { name, variantLabel?, url })` (mensaje «Hola R Cube, quiero
  información de <nombre> (<variante>). <enlace>»), `generalInquiryUrl(number)` («Hola R Cube, tengo una
  consulta.»), `peruvianWhatsappNumber(phone)` (quita espacios, guiones y paréntesis; acepta `987654321`,
  `51987654321` y `+51 987 654 321`; devuelve `51` más 9 dígitos que empiezan con 9, o `null`) y
  `customerWhatsappUrl(phone, { name, orderNumber? })` (saludo «Hola <nombre>, te escribimos de R Cube por tu
  pedido RC-000001.»). Todo texto va con `encodeURIComponent`. Componentes: `WhatsAppButton` (detalle del
  producto, con la variante elegida), `WhatsAppFloat` (botón flotante dentro de `Layout`, oculto en
  `/checkout`, en el comprobante y al imprimir, y con `z-index` por debajo del `Dialog` de fotos) y un enlace
  «WhatsApp» en el pie. En el panel, `OrderDetail` y `CustomerDetail` reutilizan `customerWhatsappUrl` con el
  celular que esas pantallas ya reciben (`customer.phone`); sin celular válido el botón queda deshabilitado
  con «Sin celular válido». Los enlaces abren en pestaña nueva con `rel="noopener noreferrer"`.
- **Razón**: la tienda ya usa `wa.me` en el checkout (HU-20); un enlace no requiere servidor, ni cuentas, ni
  costos, ni guarda datos (principio I, V).
- **Alternativas**: WhatsApp Business API o un chat integrado (fuera de alcance: costo, cuentas y
  verificación); leer el número desde `checkout/options` (descartada: exige sesión y trae datos de pago);
  incluir el número en el HTML al compilar (descartada: no reflejaría el cambio del panel sin publicar).
- **Riesgo**: un botón flotante puede tapar contenido en móvil. Mitigación: tamaño de 56 px con margen de
  16 px, oculto en checkout y comprobante, sin tapar «Agregar al carrito» (que no es fijo) y comprobado en
  las e2e a 320 px.

## R15. Tope de 8 fotos por producto

- **Decisión**: `MAX_IMAGES` de `src/worker/services/images.ts` pasa de 6 a 8 y el mensaje a «Máximo 8 fotos
  por producto». No cambia el esquema. Se actualizan las pruebas de la feature 002 que esperan 6 y el
  criterio de HU-31 en `docs/requisitos/` (la spec de la 002 queda como registro histórico y esta spec lo
  declara en FR-033).
- **Razón**: la demostración usa hasta 6 fotos y debe quedar espacio para las que suba el administrador; 8 es
  un valor habitual en las fichas de este tipo de tiendas.
- **Alternativas**: mantener 6 (descartada: una demostración con 6 deja al administrador sin espacio);
  sin tope (descartada: sin límite de almacenamiento en R2 ni de carga de la galería).

## R16. Revisión de seguridad

- **Decisión**: se revisó cada punto de entrada y de salida de la feature (RNF-05) y se dejó una prueba o una
  comprobación para cada uno.
  - *Frase y destacados*: se muestran siempre como texto de React (el código no usa `dangerouslySetInnerHTML` ni
    `innerHTML`); el servidor recorta, descarta los vacíos y valida los límites (90 y 60 caracteres, 5
    destacados) y la base los refuerza con `CHECK`. Cubierto por `tests/api/admin/product-highlights.test.ts`
    y `e2e/destacados.spec.ts`.
  - *Enlaces externos*: todos los que abren fuera de la tienda (créditos, WhatsApp de la tienda, del pie y del
    panel) llevan `target="_blank"` y `rel="noopener noreferrer"`; el checkout usa `window.open(..., "noopener")`.
  - *WhatsApp*: el mensaje se codifica con `encodeURIComponent` y el número se reduce a dígitos antes de armar el
    enlace `https://wa.me/…`; un celular que no es peruano válido no genera enlace (FR-040).
  - *`GET /catalog/contact`*: devuelve solo el nombre de la tienda y el número que el administrador ya publica en
    el pie y en el checkout; sin datos de clientes ni de pago.
  - *`GET /catalog/photo-credits`*: solo trae fotos `externa` y `proyecto` de productos que la tienda muestra.
    La revisión encontró que filtraba por producto activo pero no por marca o categoría activa, de modo que
    podía listar el nombre de un producto oculto; se corrigió con las mismas condiciones del catálogo y una
    prueba en `tests/api/photo-credits.test.ts`.
  - *Origen y crédito de las fotos*: ningún endpoint permite escribir el crédito; las fotos que sube el
    administrador entran como `subida` y las externas solo llegan por el seed desde el manifiesto, con las
    licencias admitidas (`isAllowedLicense`, comprobado en `tests/unit/gallery-data.test.ts`); un `CHECK` de la base
    exige autor, licencia y enlace en toda foto externa.
  - *Scripts de fotos*: son de desarrollo, no se despliegan, no leen ni guardan credenciales y llaman a la API
    pública de Wikimedia Commons con un `User-Agent` genérico, sin correo ni datos del equipo.
  - *Carrusel y vista ampliada*: sin `iframe`, sin carga de código externo; las fotos se sirven desde el mismo
    origen, de modo que la política de contenido (`Content-Security-Policy`) no cambia.
- **Razón**: la feature agrega texto que escribe el administrador, enlaces a terceros y dos rutas públicas;
  son los tres lugares donde pueden aparecer inyección, fuga de datos y reverse tabnabbing.
- **Riesgo residual**: el enlace de origen de una foto externa no se valida como `https` en la base (solo llega
  del manifiesto del repositorio). Si algún día se permitiera cargar créditos desde el panel, habría que
  validarlo en el esquema de entrada.
