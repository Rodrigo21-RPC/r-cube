---
description: "Lista de tareas de la feature 004 Galería y destacados del producto"
---

# Tasks: Galería y destacados del producto (R Cube)

**Input**: Documentos de diseño en `specs/004-galeria-destacados/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Obligatorias por la constitución (principio VI). En cada historia la prueba va primero y
debe fallar antes de implementar. Cada título de prueba empieza con su HU.

**Organization**: Por historia de la spec (US1 a US7). Cada tarea nombra la HU, FR, RN o RNF que cubre.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mismo paquete que las features 001 a 003: `src/shared`, `src/db`, `src/worker`, `src/web`, `tests/unit`,
`tests/api`, `e2e`, `drizzle`; más `scripts/fotos/` (solo desarrollo) y `public/img/productos/galeria/`.

**Reglas de las fotos (valen para todas las tareas de fotos)**: cada foto elegida se mira con la herramienta
de lectura de imágenes antes de aceptarla; la primera foto de cada producto muestra un único equipo, completo
y reconocible; los archivos actuales de `public/img/productos/` y de `docs/fotos/` no se tocan (los pedidos de
demostración los referencian, FR-031, RN-07); las fotos nuevas van a `public/img/productos/galeria/` en
`.webp` de hasta 200 KB y 1 200 px; solo licencias CC0, dominio público, CC BY y CC BY-SA; cada producto
activo queda con de 4 a 6 fotos: de 1 a 3 reales o del proyecto y, al final, exactamente 3 tarjetas
(características, destacados y compra segura) con un acabado de ficha profesional (FR-025 a FR-027).

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Agregar a `.gitignore` la caché de descargas `scripts/fotos/.cache/` y comprobar con
  `git check-ignore` que `public/img/productos/galeria/*.webp` NO está ignorada (FR-030)
- [X] T002 [P] Agregar a `package.json` los scripts `fotos:buscar`, `fotos:preparar` y `fotos:tarjetas`
  (`tsx scripts/fotos/buscar.ts`, `preparar.ts` y `tarjetas.ts`), sin dependencias nuevas (plan: Primary
  Dependencies; los archivos de los scripts se crean en la fase de US1) (FR-026, FR-030)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Propósito**: columnas, migración, reglas puras, manifiesto y textos de la demostración que necesitan todas las
historias. Nada de la interfaz hasta terminar esta fase.

- [X] T003 [P] Prueba unitaria `tests/unit/highlights.test.ts` (debe fallar): `TAGLINE_MAX` es 90,
  `HIGHLIGHT_MAX` 60 y `HIGHLIGHTS_MAX` 5; `normalizeHighlights(["  Pantalla de 120 Hz ", "", "   ",
  "Carga rápida"])` devuelve `["Pantalla de 120 Hz", "Carga rápida"]` (recorta espacios y descarta vacíos);
  no corta textos largos ni reordena; lista vacía devuelve `[]` (HU-56, HU-57, FR-014, FR-018)
- [X] T004 [P] Prueba unitaria `tests/unit/photo-credit.test.ts` (debe fallar): `isAllowedLicense` acepta
  «CC0 1.0», «CC BY 4.0», «CC BY-SA 3.0», «CC BY-SA 4.0» y «Dominio público» y rechaza «CC BY-NC 4.0»,
  «CC BY-ND 4.0», «CC BY-NC-SA 4.0», «GFDL» y la cadena vacía; `licenseUrl("CC BY-SA 4.0")` devuelve
  `https://creativecommons.org/licenses/by-sa/4.0/`, `licenseUrl("CC0 1.0")` devuelve
  `https://creativecommons.org/publicdomain/zero/1.0/` y `licenseUrl("Dominio público")` devuelve `null`
  (HU-58, FR-021, FR-022)
- [X] T005 [P] Prueba de API `tests/api/gallery-schema.test.ts` (debe fallar hasta aplicar la migración):
  insertar una `product_image` con `origin = 'externa'` y alguno de `credit_author`, `credit_license` o
  `credit_url` vacío falla por la restricción `CHECK (origin <> 'externa' or (credit_author <> '' and
  credit_license <> '' and credit_url <> ''))`; `origin = 'otra'` falla por `CHECK (origin in
  ('subida','proyecto','externa','tarjeta'))`; una foto insertada sin `origin` toma `'subida'`; un producto
  con `tagline` de 91 caracteres falla por `CHECK (char_length(tagline) <= 90)`; con 6 `highlights` falla
  por `CHECK (jsonb_typeof(highlights) = 'array' and jsonb_array_length(highlights) <= 5)`; un producto nuevo
  queda con `tagline = ''` y `highlights = '[]'` (FR-014, FR-021)
- [X] T006 [P] Ampliar `tests/unit/whatsapp.test.ts` (debe fallar) con las funciones de `src/shared/whatsapp.ts`
  (HU-59, HU-60, FR-037, FR-038, FR-040): `peruvianWhatsappNumber` devuelve `51987654321` para
  `"987654321"`, `"987 654 321"`, `"987-654-321"`, `"+51 987 654 321"`, `"(51) 987654321"` y `"51987654321"`, y
  `null` para `""`, `"98765432"` (8 dígitos), `"187654321"` (no empieza con 9), `"+1 305 555 0100"`,
  `"0987654321"` y letras; `productInquiryUrl("51987000111", { name, variantLabel, url })` arma
  `https://wa.me/51987000111?text=` con el mensaje «Hola R Cube, quiero información de <nombre>
  (<variante>). <url>» codificado con `encodeURIComponent` (sin la parte de la variante cuando no hay) y un
  nombre con tildes, comillas, `&` y `#` se decodifica idéntico; `generalInquiryUrl` usa «Hola R Cube, tengo
  una consulta.»; `customerWhatsappUrl("987654321", { name: "Mateo Quispe", orderNumber: "RC-000001" })` usa
  «Hola Mateo Quispe, te escribimos de R Cube por tu pedido RC-000001.» y sin número de pedido «Hola Mateo
  Quispe, te escribimos de R Cube.»; con celular inválido devuelve `null`; un número de tienda con `+`,
  espacios o guiones se reduce a dígitos; sin número de tienda las funciones de la tienda
  devuelven `null`
- [X] T007 [P] Prueba unitaria `tests/unit/gallery-data.test.ts` con las reglas de los textos (debe fallar): para
  cada producto activo de `PRODUCTS` existe su entrada en `GALLERY`; `tagline` no vacía de hasta
  `TAGLINE_MAX` (90) caracteres; de 3 a 5 destacados de hasta `HIGHLIGHT_MAX` (60) caracteres, sin duplicados y
  sin `<` ni `>`; ninguna frase ni destacado usa mayúsculas sostenidas ni signos de exclamación repetidos;
  cada dato numérico de un destacado (por ejemplo «120 Hz», «256 GB») aparece, normalizando la coma decimal
  («6,1» y «6.1» son iguales) y los espacios, en las especificaciones o en la descripción del producto en
  `PRODUCTS` (no afirma nada que no esté respaldado) (HU-56, FR-014, FR-029)
- [X] T008 Implementar `src/shared/highlights.ts` (`TAGLINE_MAX = 90`, `HIGHLIGHT_MAX = 60`,
  `HIGHLIGHTS_MAX = 5`, `normalizeHighlights(list: string[]): string[]`), `src/shared/photo-credit.ts`
  (`isAllowedLicense(name)` con las licencias admitidas CC0, dominio público, CC BY y CC BY-SA y
  `licenseUrl(name)`) y las funciones nuevas de `src/shared/whatsapp.ts` (`peruvianWhatsappNumber`,
  `productInquiryUrl`, `generalInquiryUrl`, `customerWhatsappUrl`, research R14) sin romper
  `whatsappUrl` del checkout, hasta que pasen T003, T004 y T006 (HU-56 a HU-60, FR-014, FR-021, FR-040)
- [X] T009 Agregar a `src/db/schema.ts`, exactamente como en data-model.md: en `product`, `tagline` `text`
  no nulo con `''` por defecto y `CHECK (char_length(tagline) <= 90)`, y `highlights` `jsonb` no nulo con
  `'[]'` por defecto (`$type<string[]>`) y `CHECK (jsonb_typeof(highlights) = 'array' and
  jsonb_array_length(highlights) <= 5)`; en `product_image`, `origin` `text` no nulo con `'subida'` por
  defecto y `CHECK (origin in ('subida','proyecto','externa','tarjeta'))`, `credit_author`,
  `credit_license` y `credit_url` `text` no nulos con `''` por defecto, y `CHECK (origin <> 'externa' or
  (credit_author <> '' and credit_license <> '' and credit_url <> ''))` (HU-56, HU-58, FR-014, FR-021)
- [X] T010 Generar la migración con `npm run db:generate`, renombrarla `drizzle/0004_galeria_destacados.sql`
  (y su entrada en `drizzle/meta/_journal.json`), agregar al final `UPDATE product_image SET origin =
  'proyecto' WHERE r2_key IS NULL;` y aplicarla con `npm run db:migrate`; comprobar que T005 pasa y que las
  pruebas de las features 001 a 003 siguen en verde (RNF-10, FR-031, FR-033)
- [X] T011 [P] Ampliar `src/shared/types.ts` según contracts/api.md con el tipo `PhotoCredits` (`external: {
  productName, productSlug, imageUrl, alt, author, license, licenseUrl: string | null, sourceUrl }[]` y
  `project: { productName, productSlug }[]`) y el tipo `StoreContact { name: string; whatsappNumber: string }`;
  los campos `tagline` y `highlights` de `ProductDetail` y de `AdminProduct` se agregan junto con el código que
  los llena (T037 y T046) para que los tipos compilen en cada commit (HU-58, HU-59)
- [X] T012 [P] Ampliar `tests/api/helpers.ts` con `makeImages(productId, defs)` que inserta filas de
  `product_image` con `origin`, `credit_*`, `url`, `alt` y `position` (para las pruebas de créditos y de
  fotos); `resetDb` no cambia porque `product_image` ya está en el `TRUNCATE` (HU-58)
- [X] T013 Crear `src/db/gallery-data.ts` con los tipos `DemoPhoto` (`url` bajo `/img/`, `alt`, `origin`
  `proyecto | externa | tarjeta`, `card?: "caracteristicas" | "destacados" | "compra"`, `source?`,
  `credit?: { author, license, url, title }`), `GalleryEntry` (`tagline`, `highlights`, `photos`) y
  `GALLERY: Record<slug, GalleryEntry>`, con un primer manifiesto que cubre los 38 productos del seed con su
  foto actual como única foto (`origin: "proyecto"`, `url` `/img/productos/<archivo>` o `/img/generico.svg`),
  `tagline: ""` y `highlights: []`; el producto inactivo conserva siempre este contenido (HU-54, FR-031, spec:
  Assumptions)
- [X] T014 Exportar `PRODUCTS` en `src/db/seed-data.ts` y reemplazar en `runSeed` la inserción de una foto
  por producto por las filas de `GALLERY` (`id = img-<id del producto>-<n>`, `position = n - 1`, `origin` y
  `credit_*` del manifiesto, `r2_key` nulo); insertar `tagline` y `highlights` en `product`; en
  `seedVariants` quitar la fila especial `img-edge-azul` y dejar que `var-edge-256-azul` apunte a una foto de
  la galería del Edge (por ahora la primera); ajustar lo que use los ids antiguos de fotos (HU-54, HU-56,
  FR-032)
- [X] T015 Revisar con `grep` que ninguna prueba existente suponga una sola foto por producto y ajustar
  `tests/api/seed.test.ts` (la foto de cada variante pertenece al mismo producto; todo producto tiene al
  menos una foto con posiciones 0 a n-1 y `origin` válido); confirmar con `npm run test` que las pruebas de
  las features 001 a 003 siguen en verde (SC-009)
- [X] T016 Escribir en `src/db/gallery-data.ts` la frase y de 3 a 5 destacados de los 37 productos activos,
  en español de Perú, tono comercial y breve al estilo de las fichas de AliExpress (frase que llame la
  atención y destacados con beneficios concretos), basados únicamente en sus especificaciones y descripción
  del seed (por ejemplo, del iPhone 13 Pro: «Pantalla ProMotion de 120 Hz», «Triple cámara para foto y
  video»); el producto inactivo queda sin ellos; pasar T007 (HU-56, FR-029)
- [X] T017 [P] Prueba de API en `tests/api/admin/images.test.ts` (debe fallar; HU-31, FR-033, R15): se aceptan
  8 fotos por producto y la 9.ª responde 409 `MAX_IMAGES` con «Máximo 8 fotos por producto»; actualizar donde
  hoy se espere «Máximo 6 fotos por producto» (también en `e2e/admin.spec.ts` si aparece)
- [X] T018 Cambiar `MAX_IMAGES` de 6 a 8 y su mensaje en `src/worker/services/images.ts`, y el texto de ayuda
  del panel si menciona 6 (`src/web/admin/pages/ProductImages.tsx`); pasar T017 y confirmar que
  `tests/api/admin/images.test.ts` de la feature 002 sigue en verde con el nuevo tope (HU-31, FR-033)

**Checkpoint**: migración 0004 aplicada, reglas puras listas, seed con manifiesto y textos de los 37 productos.

---

## Phase 3: User Story 1 - Ver varias fotos del producto en una galería (Priority: P1) 🎯 MVP

**Goal**: el detalle muestra una galería con foto grande, flechas, deslizar, contador y miniaturas, y cada
producto activo de demostración tiene de 4 a 6 fotos con la primera más llamativa y 3 tarjetas profesionales
al final (HU-54).

**Independent Test**: abrir el «Samsung Galaxy S23 256 GB», ver de 4 a 6 fotos, pasar de una a otra con la
flecha, con una miniatura, con el teclado y deslizando, y comprobar contador y miniatura activa.

### Tests for User Story 1 (escribir primero, deben fallar)

- [X] T019 [P] [US1] Ampliar `tests/unit/gallery-data.test.ts` con la integridad de las fotos (HU-54, FR-025 a
  FR-030): cada producto activo tiene de 4 a 6 fotos; la primera es real o del proyecto (no tarjeta); hay de 1
  a 3 fotos reales o del proyecto y exactamente 3 tarjetas, al final y en el orden características, destacados
  y compra segura (`card`); los `alt` no están vacíos y son distintos entre sí dentro del producto; cada foto
  `externa` trae `credit.author`, `credit.license` (aceptada por `isAllowedLicense`) y `credit.url`; cada `url`
  empieza con `/img/` y el archivo existe en `public/`; cada archivo `.webp` pesa como máximo 204 800 bytes y
  mide como máximo 1 200 px de lado mayor (leer ancho y alto de la cabecera WebP en el propio test); el
  producto inactivo no se valida
- [X] T020 [P] [US1] Pruebas de API en `tests/api/seed.test.ts` y `tests/api/main-photo.test.ts` (HU-54,
  FR-025, FR-032, FR-034): los 37 productos activos tienen de 4 a 6 filas de `product_image`, posiciones 0 a
  n-1 sin huecos, exactamente 3 con `origin = 'tarjeta'` y la foto de cada variante
  (`product_variant.image_id`) es de su mismo producto; con un producto de 3 fotos (`makeImages`) la tarjeta
  del catálogo, la línea del carrito y los favoritos usan la foto de posición 0, y al marcar otra como
  principal (`POST /admin/products/:id/images/:imageId/main`) pasan a usar esa; la línea de carrito de una
  variante con foto propia usa la de la variante (HU-44)
- [X] T021 [P] [US1] Prueba e2e `e2e/galeria.spec.ts` (HU-54, FR-001 a FR-009): en
  `/producto/samsung-galaxy-s23-256-gb` el contador dice «1 de N» con N entre 4 y 6 y hay N miniaturas;
  «Foto siguiente» da «2 de N» y marca la miniatura con `aria-current`; con el foco en la galería la flecha
  derecha del teclado avanza y la izquierda retrocede; en la última, «Foto siguiente» vuelve a la primera y en
  la primera «Foto anterior» va a la última; desplazar la pista (`scrollLeft`) cambia el contador; un anuncio
  `aria-live` dice «Foto 2 de N»; con el foco fuera de la galería (por ejemplo en «Agregar al carrito») las
  flechas no cambian la foto; un producto creado por la API del panel sin fotos muestra la imagen genérica y
  ninguna flecha, contador ni miniatura; en `/producto/motorola-edge-60-pro` elegir «256 GB» y «Azul» lleva
  a la foto de esa variante y una elección manual posterior se respeta; una foto que falla (interceptar la
  petición) se sustituye por la imagen genérica sin romper la navegación; el contenedor de la foto grande
  conserva su alto al cargar (sin saltos); «Foto anterior», «Foto siguiente» y las miniaturas miden al menos
  44 × 44 px (`boundingBox`, FR-009); desde la última foto se llega a cualquier otra con una sola
  pulsación de miniatura (SC-001); al abrir otro producto desde «Productos relacionados» la galería empieza en
  «1 de N» (FR-007)

### Implementation for User Story 1

- [X] T022 [P] [US1] Crear `scripts/fotos/buscar.ts` (solo desarrollo): recibe una consulta (`npm run
  fotos:buscar -- "Samsung Galaxy S23"`), consulta la API de Wikimedia Commons (`action=query`,
  `generator=search`, `gsrnamespace=6`, `prop=imageinfo`, `iiprop=url|size|mime|extmetadata`,
  `iiextmetadatafilter=LicenseShortName|Artist`, `iiurlwidth=800`) con `User-Agent` genérico
  «RCubeLab/1.0 (proyecto educativo)», descarta las candidatas cuya licencia no cumpla `isAllowedLicense`,
  imprime título, autor sin HTML, licencia, tamaño y enlace de origen, y guarda las miniaturas en
  `scripts/fotos/.cache/candidatas/<consulta>/` para poder verlas (R7, FR-021)
- [X] T023 [P] [US1] Crear `scripts/fotos/preparar.ts` (solo desarrollo): lee `GALLERY`; para cada foto con
  `source` de Commons descarga la miniatura de 1 200 px (verifica que autor y licencia coincidan con el
  manifiesto y avisa si no); para cada foto del proyecto lee el archivo original de `public/img/productos/`
  sin modificarlo; abre Chromium con Playwright, la dibuja en un `canvas` a 1 200 px de lado mayor como
  máximo y la exporta con `toBlob("image/webp", calidad)` bajando la calidad de 0,86 a 0,5 y luego el tamaño
  hasta pesar 204 800 bytes o menos; escribe `public/img/productos/galeria/<slug>-<n>.webp` y falla con un
  mensaje claro si no logra el peso (R6, R8, FR-030, FR-031)
- [X] T024 [P] [US1] Crear `scripts/fotos/tarjetas.ts` (solo desarrollo): para cada producto de `PRODUCTS` y de
  `GALLERY` renderiza con Playwright **tres tarjetas** de 1 000 × 1 000 px con un acabado de ficha profesional
  (R9): fondo oscuro con degradado suave a `#0b0b0f`/`#17171c`, acento `#3b93ff`, texto `#f5f5f7`, el logo de
  `public/img/logo.png`, tipografía sans de sistema con jerarquía clara (título grande, datos medianos,
  etiquetas pequeñas) y márgenes amplios; (1) **características**: marca, nombre y hasta 4 especificaciones
  del producto con un icono SVG por etiqueta (pantalla, almacenamiento, cámara, batería, RAM, procesador y
  marca de verificación por defecto); (2) **destacados**: la frase en grande y los destacados con marcas de
  verificación; (3) **compra segura**: las 4 formas de pago (tarjeta, Yape o Plin, transferencia y WhatsApp), la
  entrega por zona o el recojo en tienda, el IGV incluido y la atención por WhatsApp, sin precios, plazos ni
  garantías; sin ninguna foto de Commons dentro; las exporta a `.webp` de hasta 204 800 bytes con la misma
  rutina que `preparar.ts`, en el archivo que indica el manifiesto, con el `alt` «Tarjeta de características
  de <nombre>: <etiqueta valor, …>», «Tarjeta de destacados de <nombre>: <frase y destacados>» y «Tarjeta de
  compra segura de <nombre>: …» (R9, FR-027, FR-028)
- [X] T025 [US1] Crear `src/web/components/PhotoCarousel.tsx`: pista horizontal con `overflow-x: auto`,
  `scroll-snap-type: x mandatory` y una foto por pantalla; props `photos: { url, alt }[]`, `index`,
  `onIndexChange` y `fit` (`cover` o `contain`); foto activa calculada con `IntersectionObserver`; `goTo(i)`
  circular con `scrollTo` (`behavior: "auto"` si `prefers-reduced-motion: reduce`); `role="region"` con
  `aria-roledescription="carrusel"` y nombre «Galería de fotos», diapositivas con `role="group"`,
  `aria-roledescription="foto"` y nombre «Foto 2 de 5», no activas con `inert`, texto solo para lectores con
  `aria-live="polite"` («Foto 2 de 5»); flechas izquierda y derecha del teclado solo con el foco dentro;
  primera foto con `fetchpriority="high"` y las demás `loading="lazy"`; sin `touch-action: none` (R1, R3, R12,
  FR-002 a FR-004, FR-008, FR-013)
- [X] T026 [US1] Crear `src/web/components/ProductGallery.tsx`: usa `PhotoCarousel` en un contenedor de
  proporción fija (`aspect-square`) con un acabado cuidado (esquinas redondeadas, fondo `bg-surface`, foto con
  `object-contain`) y muestra, solo con 2 o más fotos, el contador «N de M», los botones «Foto anterior» y
  «Foto siguiente» (áreas de 44 px, foco visible) y una franja desplazable de miniaturas (botones con nombre
  «Ver foto N de M» y `aria-current="true"` en la activa, `loading="lazy"`, la activa con borde de acento);
  con una foto muestra solo la foto y sin ninguna, la imagen genérica; una foto que falla se sustituye por
  `/img/generico.svg` sin romper la navegación; sin desborde horizontal desde 320 px (FR-001, FR-005, FR-008,
  FR-009)
- [X] T027 [US1] Actualizar `src/web/pages/Product.tsx`: reemplazar la sección de fotos por
  `ProductGallery` con el índice controlado; al elegir una variante con foto propia el índice salta a esa
  foto y una navegación manual posterior prevalece; reiniciar la galería con `key={slug}` al cambiar de
  producto (FR-006, FR-007)
- [X] T028 [US1] Fotos de **celulares** (13 productos activos: iPhone 15 Pro 256 GB, iPhone 13 Pro 128 GB,
  iPhone SE 64 GB, Samsung Galaxy S23 256 GB, Samsung Galaxy S22 Ultra 256 GB, Xiaomi Redmi Note 12 128 GB,
  Xiaomi 13T Pro 512 GB, Motorola Edge 60 Pro, Google Pixel 8 128 GB, Huawei P60, Sony Xperia Z5, OnePlus 13R
  y Nothing Phone (2)): por cada uno usar `npm run fotos:buscar`, mirar las candidatas con la herramienta de
  lectura de imágenes y aceptar solo las que muestran el equipo correcto y solo ese equipo, con buena luz y
  sin marcas de agua; el iPhone 15 Pro pasa a tener una foto principal de un solo equipo (su foto original
  muestra cuatro) y esa original se retira de su galería; escribir las entradas en `src/db/gallery-data.ts`
  (`alt` en español que describa lo que se ve, `credit` completo, `source`) con la foto más llamativa primera
  y hasta 2 fotos reales más de otros ángulos (de 1 a 3 reales o del proyecto), dejando los 3 lugares
  finales para las tarjetas; ejecutar `npm run fotos:preparar` y mirar los `.webp` resultantes (HU-54,
  FR-025, FR-026, FR-031)
- [X] T029 [US1] Fotos de **laptops** (12 productos activos: MacBook Air M1 256 GB, MacBook Pro 16 M3 Pro,
  Dell XPS 13, Dell Inspiron 15, HP Pavilion 15, HP Spectre x360, Lenovo ThinkPad X1 Carbon, Asus Vivobook
  15, Asus Zenbook 14 OLED, Acer Swift Go 14, MSI Katana 15 Gaming y Microsoft Surface Laptop 5): mismo
  procedimiento que T028; la foto original de la MSI muestra la parte inferior, así que otra foto pasa a ser
  la principal y esa original se retira de su galería (HU-54, FR-025, FR-026, FR-031)
- [X] T030 [US1] Fotos de **tablets** (4 productos activos: iPad 10.ª generación 64 GB, Samsung Galaxy Tab S9
  128 GB, Xiaomi Pad 6 128 GB y Lenovo Tab M10; hoy solo tienen la imagen genérica y no hay foto original):
  buscar y aceptar una foto principal de un solo equipo y, si las hay, hasta 2 adicionales del mismo modelo;
  si no hay una foto libre buena del modelo exacto, usar una del mismo tipo de producto y dejarlo anotado en
  el `alt`; mismo procedimiento que T028 (HU-54, FR-025, FR-026)
- [X] T031 [US1] Fotos de **accesorios y repuestos** (8 productos activos: batería para celular, batería para
  laptop de 6 celdas, cooler y disipador, Fairphone módulo de cámara, kit de herramientas de 32 en 1, pasta
  térmica de 4 g, memoria RAM DDR4 de 16 GB y SSD NVMe de 1 TB): mismo procedimiento que T028 con fotos del
  mismo tipo de producto cuando no exista una del modelo exacto, sin marcas de otro modelo a la vista como
  principal (HU-54, FR-025, FR-026)
- [X] T032 [US1] Completar los manifiestos con las 3 tarjetas de cada uno de los 37 productos activos
  (`card` y `alt`), ejecutar `npm run fotos:tarjetas` y mirar con la herramienta de lectura de imágenes al
  menos 12 tarjetas (las tres plantillas y las cuatro categorías): texto legible a tamaño de móvil, sin
  cortes, jerarquía clara y aspecto de ficha profesional; pulir la plantilla hasta lograrlo y volver a
  generar todo; confirmar que cada producto queda con de 4 a 6 fotos y listar cualquiera que no llegue
  para resolverlo caso por caso con otra foto libre del mismo tipo (HU-54, FR-025, FR-027)
- [X] T033 [US1] En `src/db/seed-data.ts` hacer que `var-edge-256-azul` apunte a la foto de la galería del
  Edge que mejor muestre el color azul (o, si ninguna lo hace, a una foto distinta de la principal) y
  confirmar que T020 pasa; como Commons no tiene una foto libre del Edge en azul, la variante usa la foto principal (HU-44, FR-006, FR-032)
- [X] T034 [US1] Pasar T019, T020 y T021 en verde, volver a cargar los datos con `npm run db:seed`, abrir 6
  productos (uno por categoría, el iPhone 15 Pro y la MSI) en tema claro y oscuro y a 320 px, y confirmar que
  la galería se ve bien; commit por categoría de fotos y uno de cierre de fase (HU-54, SC-001, SC-002)

**Checkpoint**: US1 funcional: galería completa con fotos de demostración revisadas.

---

## Phase 4: User Story 2 - Ver una frase y destacados breves del producto (Priority: P1)

**Goal**: bajo el nombre del producto se ve una frase corta y de 3 a 5 viñetas; los 37 productos activos de
demostración los traen (HU-56; los textos ya están escritos en T016).

**Independent Test**: abrir el «iPhone 13 Pro 128 GB» y ver la frase y las viñetas; abrir un producto sin
ellos y comprobar que no hay bloque ni hueco.

### Tests for User Story 2 (escribir primero, deben fallar)

- [X] T035 [P] [US2] Prueba de API en `tests/api/catalog.test.ts` (HU-56, FR-014 a FR-017):
  `GET /catalog/products/:slug` devuelve `tagline` y `highlights` de un producto que los tiene (cargarlos por
  SQL en la prueba), `tagline: ""` y `highlights: []` en uno que no, y `images` sigue siendo `{ url, alt }[]`
  sin más campos (compatibilidad con `tests/api/admin/images.test.ts`); una búsqueda
  (`GET /catalog/products?q=`) con una palabra que solo está en la frase o en un destacado no devuelve el
  producto, y lo mismo con `GET /admin/products?q=` (clarificación 5)
- [X] T036 [P] [US2] Prueba e2e `e2e/destacados.spec.ts` (HU-56, FR-015, FR-016): en
  `/producto/iphone-13-pro-128-gb` hay una frase y de 3 a 5 viñetas bajo el título y antes del precio (orden
  del DOM); un producto creado por la API del panel sin frase ni destacados no muestra el bloque ni deja un
  contenedor vacío; una frase con `<b>hola</b>` se ve como texto, sin negrita; la descripción y las
  especificaciones siguen visibles

### Implementation for User Story 2

- [X] T037 [US2] Agregar `tagline: string` y `highlights: string[]` a `ProductDetail` en `src/shared/types.ts` y,
  en `src/worker/routes/catalog.ts`, leerlos del producto en el detalle y devolverlos; sin cambios en las tarjetas del catálogo (HU-56, contracts/api.md)
- [X] T038 [US2] Crear `src/web/components/Highlights.tsx` (frase en destacado y lista `<ul>` de viñetas con
  icono, todo como texto) y usarlo en `src/web/pages/Product.tsx` bajo el nombre y antes del precio; sin
  frase ni viñetas no renderiza nada; contraste AA en ambos temas con los tokens del tema; pasar T035 y T036
  (FR-015, FR-016)
- [X] T039 [US2] Revisar 6 productos en la tienda (ambos temas y 320 px) y commit de cierre de fase (HU-56,
  SC-002)

**Checkpoint**: US1 y US2 funcionan juntas; el detalle ya se ve completo.

---

## Phase 5: User Story 3 - Ampliar una foto a pantalla completa (Priority: P2)

**Goal**: tocar la foto grande abre una vista a pantalla completa navegable y accesible (HU-55).

**Independent Test**: en un producto con 4 fotos, abrir la vista, pasar a la foto 3 con el teclado, cerrar con
Escape y comprobar que el foco vuelve al control de origen y la galería queda en la foto 3.

### Tests for User Story 3 (escribir primero, deben fallar)

- [X] T040 [P] [US3] Prueba e2e `e2e/galeria-ampliada.spec.ts` (HU-55, FR-010 a FR-013): tocar la foto grande
  o «Ampliar foto» abre un diálogo con nombre «Fotos de <producto>», contador, flechas y «Cerrar»; las
  flechas del teclado y los botones cambian de foto dentro de la vista; Tab 12 veces nunca saca el foco del
  diálogo; la página de fondo no se desplaza mientras está abierta; Escape y «Cerrar» la cierran, el foco
  vuelve al control que la abrió y la galería queda en la foto en que se quedó; con `reducedMotion: "reduce"`
  el estilo `scroll-behavior` de la pista es `auto`; la vista no deshabilita el pellizco (`touch-action` no es
  `none`)

### Implementation for User Story 3

- [X] T041 [US3] Crear `src/web/components/PhotoViewer.tsx` con el `Dialog` de radix-ui a pantalla completa:
  título visible solo para lectores «Fotos de <producto>», botón «Cerrar» de 44 px, `PhotoCarousel` con
  `fit="contain"` abierto en la foto activa, contador y flechas; al cerrar entrega el índice final por
  `onIndexChange`; sin zoom propio ni `touch-action: none`; sin animaciones con reducir movimiento (R2, FR-010
  a FR-013)
- [X] T042 [US3] En `src/web/components/ProductGallery.tsx` agregar el botón «Ampliar foto» sobre la foto y
  hacer que tocar la foto abra `PhotoViewer`; el foco vuelve al control que lo abrió y la foto activa se
  sincroniza al cerrar; pasar T040 (HU-55, FR-010, FR-011)
- [X] T043 [US3] Commit de cierre de fase tras confirmar que T021 y T040 pasan juntas (HU-55)

**Checkpoint**: US1 a US3 completas para el cliente.

---

## Phase 6: User Story 4 - Editar la frase y los destacados desde el panel (Priority: P2)

**Goal**: el administrador edita la frase y los destacados en el formulario del producto, con validación y
auditoría (HU-57).

**Independent Test**: como administrador, escribir una frase de 70 caracteres y 3 destacados, guardar, ver el
cambio en la tienda y en la auditoría; probar los rechazos (91 caracteres, sexto destacado, 61 caracteres).

### Tests for User Story 4 (escribir primero, deben fallar)

- [X] T044 [P] [US4] Prueba de API `tests/api/admin/product-highlights.test.ts` (HU-57, FR-014, FR-017 a
  FR-020): `POST /products` con frase y destacados responde 201 con `tagline` y `highlights`; `PATCH` los
  cambia y escribe en la misma transacción una entrada `producto_editado` con detalle «Frase y destacados de
  <nombre> actualizados» y `before`/`after` con `{ tagline, highlights }`; si cambian también el precio hay
  dos entradas (`precio_cambiado` y `producto_editado`); un `PATCH` que omite los campos los conserva y un
  `POST` que los omite los deja vacíos; se recortan los espacios y se descartan los vacíos (6 elementos con 1
  vacío se aceptan); una frase de 91 caracteres responde 400 con `fields.tagline` «La frase no puede pasar de
  90 caracteres»; 6 destacados reales responden 400 con `fields.highlights` «Máximo 5 destacados»; un
  destacado de 61 caracteres responde 400 con `fields["highlights.N"]` «Cada destacado admite hasta 60
  caracteres»; con cualquier error no cambia nada; un texto con `<b>` se guarda tal cual; la columna
  `search_text` del producto no cambia al editar la frase o los destacados (FR-017); 401 sin sesión y 403 con
  cliente sin cambiar datos
- [ ] T045 [P] [US4] Prueba e2e `e2e/admin-destacados.spec.ts` (HU-57, SC-005): en el panel abrir un producto,
  escribir una frase y 3 destacados, guardar y ver el cambio en la tienda al recargar; ver la entrada en
  Auditoría; una frase de 91 caracteres muestra «La frase no puede pasar de 90 caracteres» junto al campo; un
  sexto destacado y uno de 61 caracteres muestran su mensaje; quitar un destacado con el botón «Quitar»

### Implementation for User Story 4

- [X] T046 [US4] Agregar `tagline` y `highlights` a `AdminProduct` en `src/shared/admin-types.ts` y, en
  `src/worker/routes/admin/products.ts`, ampliar `productBody` con `tagline:
  z.string().trim().max(90, "La frase no puede pasar de 90 caracteres").optional()` y `highlights:
  z.array(z.string()).transform(normalizeHighlights).pipe(z.array(z.string().max(60, "Cada destacado admite
  hasta 60 caracteres")).max(5, "Máximo 5 destacados")).optional()`; `POST` los guarda (vacíos por defecto),
  `PATCH` solo los actualiza si vienen en el cuerpo; `loadAdminProduct` los devuelve; auditoría según R5
  dentro de la misma transacción; pasar T044 (HU-57, FR-014, FR-018 a FR-020)
- [ ] T047 [US4] En `src/web/admin/pages/ProductForm.tsx` agregar el campo «Frase destacada» con contador de
  hasta 90 caracteres y una lista de hasta 5 «Destacado N» con `useFieldArray`, botones «Agregar destacado»
  (deshabilitado al llegar a 5) y «Quitar destacado N», contador de hasta 60 caracteres por fila y errores
  por campo (`tagline`, `highlights` y `highlights.N`) con el mismo manejo que `specs`; el formulario envía
  siempre ambos campos; pasar T045 (HU-57, FR-018)
- [ ] T048 [US4] Commit de cierre de fase tras confirmar que las pruebas de producto de la feature 002
  (`tests/api/admin/products.test.ts` y `e2e/admin.spec.ts`) siguen en verde (HU-57, SC-009)

**Checkpoint**: US1 a US4 completas.

---

## Phase 7: User Story 5 - Conocer el crédito de las fotos (Priority: P3)

**Goal**: página pública «Créditos de las fotos» con autor, licencia y enlace de origen, enlazada desde el
pie (HU-58).

**Independent Test**: abrir los créditos desde el pie y comprobar que cada foto externa aparece con producto,
autor, licencia y un enlace que abre la página de origen.

### Tests for User Story 5 (escribir primero, deben fallar)

- [ ] T049 [P] [US5] Prueba de API `tests/api/photo-credits.test.ts` (HU-58, FR-021 a FR-023):
  `GET /catalog/photo-credits` sin sesión responde 200; `external` incluye solo fotos `externa` de productos
  activos, con producto, `imageUrl`, `alt`, `author`, `license`, `licenseUrl` (el enlace de la licencia o
  `null` en dominio público) y `sourceUrl`, ordenadas por nombre de producto y posición; `project` lista una
  vez cada producto activo con fotos `proyecto`; las fotos `subida` y `tarjeta` no aparecen; un producto
  inactivo no aparece; sin créditos responde `{ external: [], project: [] }`
- [ ] T050 [P] [US5] Prueba e2e `e2e/creditos.spec.ts` (HU-58, FR-022 a FR-024): desde el pie de la tienda
  «Créditos de las fotos» abre `/creditos-fotos`; la página tiene título, una fila por foto externa con
  producto (enlace al detalle), autor, licencia y enlace de origen con `target="_blank"` y `rel` con
  `noopener`; el grupo «Fotos aportadas por el proyecto»; el aviso de que las tarjetas son de R Cube; en
  CC BY-SA la nota de que las fotos pueden estar reducidas de tamaño

### Implementation for User Story 5

- [ ] T051 [US5] En `src/worker/routes/catalog.ts` agregar `GET /photo-credits` (pública, una consulta sobre
  `product_image` unido a `product` activo) que arma `external` con `licenseUrl` desde `photo-credit.ts` y
  `project` agrupado por producto, según contracts/api.md; pasar T049 (HU-58, FR-022, FR-023)
- [ ] T052 [US5] Crear `src/web/pages/PhotoCredits.tsx` (estados de carga, vacío y error; lista por producto
  con miniatura, autor, licencia con su enlace y enlace de origen en pestaña nueva con `rel="noopener
  noreferrer"`; grupo del proyecto y aviso de las tarjetas), registrar `/creditos-fotos` en
  `src/web/router.tsx` y agregar el enlace «Créditos de las fotos» al pie de `src/web/components/Layout.tsx`;
  pasar T050 (HU-58, FR-022 a FR-024)
- [ ] T053 [US5] Commit de cierre de fase (HU-58, SC-004)

**Checkpoint**: HU-54 a HU-58 completas.

---

## Phase 8: User Story 6 - Contactar a la tienda por WhatsApp (Priority: P2)

**Goal**: el cliente consulta por WhatsApp desde el detalle del producto y desde un botón flotante en toda la
tienda, con el número de la configuración (HU-59).

**Independent Test**: abrir el «Samsung Galaxy S23 256 GB», pulsar «Consultar por WhatsApp» y ver que se abre
`wa.me` con el número de la tienda y el mensaje con el producto; abrir el catálogo y ver el botón flotante.

### Tests for User Story 6 (escribir primero, deben fallar)

- [ ] T054 [P] [US6] Prueba de API `tests/api/store-contact.test.ts` (HU-59, FR-039): `GET
  /catalog/contact` sin sesión responde 200 con `{ name: "R Cube", whatsappNumber }` solo con dígitos (por
  ejemplo `51987000111` si en la configuración está «+51 987 000 111»); después de cambiar el número desde
  `PUT /admin/settings` la consulta devuelve el nuevo; sin número devuelve `""`; la respuesta solo tiene esas
  dos claves (ningún dato de pago ni de cuentas)
- [ ] T055 [P] [US6] Prueba e2e `e2e/whatsapp.spec.ts` (HU-59, FR-037 a FR-039, FR-041, SC-010): en
  `/producto/samsung-galaxy-s23-256-gb` el enlace «Consultar por WhatsApp» tiene `href` que empieza con
  `https://wa.me/<número de la configuración>?text=` y, decodificado, nombra el producto y su enlace, con
  `target="_blank"` y `rel` con `noopener`; en `/producto/motorola-edge-60-pro` el mensaje incluye la variante
  elegida; el botón flotante «Escríbenos por WhatsApp» existe en `/`, `/catalogo` y en un producto, abre
  «Hola R Cube, tengo una consulta.» y no existe en `/checkout`, en el comprobante ni en `/admin`; el pie
  trae el enlace «WhatsApp»; con la respuesta de `/api/catalog/contact` interceptada con `whatsappNumber: ""`
  no hay ningún botón ni enlace de WhatsApp y la página no muestra errores; a 320 px el botón flotante no
  se superpone con «Agregar al carrito» ni con el botón «Ir a pagar» del carrito (comparar `boundingBox`) y no
  produce desborde horizontal; la vista ampliada de fotos abierta queda por encima del botón flotante

### Implementation for User Story 6

- [ ] T056 [US6] En `src/worker/routes/catalog.ts` agregar `GET /contact` (pública) que lee `store_settings` y
  devuelve `{ name: "R Cube", whatsappNumber: <solo dígitos> }` con `""` si no hay número, según
  contracts/api.md; pasar T054 (HU-59, FR-039)
- [ ] T057 [US6] Crear `src/web/hooks/useStoreContact.ts` (TanStack Query a `/catalog/contact`, `staleTime` de
  5 minutos, sin reintentos ruidosos), `src/web/components/WhatsAppButton.tsx` (botón «Consultar por
  WhatsApp» con icono `MessageCircle` y nombre accesible, usa `productInquiryUrl` con la variante elegida,
  enlace `target="_blank"` `rel="noopener noreferrer"`) y `src/web/components/WhatsAppFloat.tsx` (botón fijo
  de 56 px con margen de 16 px abajo a la derecha, `aria-label` «Escríbenos por WhatsApp», texto visible desde
  `md`, `print:hidden`, `z-index` por debajo del `Dialog`); agregar los tokens `--whatsapp` y `--on-whatsapp`
  a `src/web/styles.css` (claro y oscuro, contraste ≥ 4.5) y su par a `scripts/contrast.ts`; sin número no
  renderizan nada (R14, FR-035, FR-037 a FR-039)
- [ ] T058 [US6] Integrar: `WhatsAppButton` en `src/web/pages/Product.tsx` bajo «Agregar al carrito»;
  `WhatsAppFloat` en `src/web/components/Layout.tsx` salvo en `/checkout`, el comprobante (`/pedidos/:number/
  comprobante`) y el panel; enlace «WhatsApp» en el pie; pasar T055 (HU-59, FR-037, FR-038)
- [ ] T059 [US6] Commit de cierre de fase (HU-59, SC-010)

**Checkpoint**: la tienda ya ofrece contacto por WhatsApp.

---

## Phase 9: User Story 7 - Escribir al cliente por WhatsApp desde el panel (Priority: P3)

**Goal**: el administrador abre WhatsApp con el cliente desde el detalle de un pedido y desde su ficha (HU-60).

**Independent Test**: como administrador abrir el pedido de un cliente con celular y pulsar el botón: se abre
`wa.me` con 51 más el celular y el saludo con el número del pedido.

### Tests for User Story 7 (escribir primero, deben fallar)

- [ ] T060 [P] [US7] Prueba e2e `e2e/admin-whatsapp.spec.ts` (HU-60, FR-040, SC-011): como administrador, en el
  detalle de un pedido de `mateo@demo.pe` el botón «Escribir por WhatsApp» tiene `href` `https://wa.me/51<celular>?text=` (51 más el celular de la demostración, `987654321`) con el saludo «Hola Mateo Quispe, te escribimos de R Cube por
  tu pedido RC-…», y en su ficha de cliente el saludo sin número de pedido; con la respuesta del detalle
  interceptada con `phone: ""` o `phone: "12345"` el botón aparece deshabilitado con «Sin celular válido» y no
  tiene `href`; con `phone: "+51 987-654 321"` usa `51987654321`; los botones abren en pestaña nueva con
  `rel` con `noopener`

### Implementation for User Story 7

- [ ] T061 [US7] Crear `src/web/admin/components/WhatsAppLink.tsx` (botón «Escribir por WhatsApp» que usa
  `customerWhatsappUrl`; sin celular válido es un botón deshabilitado con el texto «Sin celular válido» y
  `aria-disabled`) y usarlo en `src/web/admin/pages/OrderDetail.tsx` (con el número de pedido) y en
  `src/web/admin/pages/CustomerDetail.tsx`; pasar T060 (HU-60, FR-040)
- [ ] T062 [US7] Commit de cierre de fase tras confirmar que `e2e/admin.spec.ts` sigue en verde (HU-60,
  SC-011)

**Checkpoint**: las siete historias completas.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T063 [P] Ampliar `e2e/accesibilidad.spec.ts` (RNF-03, FR-035, SC-006, SC-007): agregar a `PAGES` el
  detalle con galería (`/producto/samsung-galaxy-s23-256-gb`) y `/creditos-fotos` (la tienda ya trae el botón
  flotante de WhatsApp en todas); una prueba en ambos temas que abre la vista ampliada y pasa axe AA con el
  diálogo abierto; una prueba de teclado que recorre la galería, el botón de WhatsApp y la vista ampliada sin
  ratón; y la comprobación de no desborde horizontal a 320 px en el detalle, la vista ampliada, los créditos y
  la portada con el botón flotante (ampliando la que ya existe para las páginas del cliente)
- [ ] T064 [P] Actualizar `DESPLIEGUE.md`: aplicar la migración `0004` antes de publicar, que las fotos de
  `public/img/productos/galeria/` viajan con el build, cargar los datos de demostración con el seed (que
  reemplaza las fotos), que el número de WhatsApp se configura en el panel (Configuración) y que el botón de
  la tienda lo toma de ahí, y la nota de que las fotos de Commons exigen mantener visible la página de créditos
  (FR-021, FR-039, RNF-10)
- [ ] T065 [P] Actualizar `README.md` y `specs/README.md`: la fila de la 003 pasa a «Cerrada: fusionada en
  `main`» (hoy dice «En implementación»), nueva fila y sección de la 004 con sus artefactos, historias HU-54
  a HU-60, los scripts `fotos:*`, el contacto por WhatsApp y el riesgo declarado de las fotos originales de
  `docs/fotos` sin autor registrado (FR-023, spec: Assumptions)
- [ ] T066 [P] Verificar la migración `0004` sobre una base temporal que ya tenga datos de la 003: aplicar
  `0000` a `0003`, insertar productos y fotos estáticas y una foto con `r2_key`, aplicar `0004` y comprobar
  que las estáticas quedan en `origin = 'proyecto'`, la de R2 en `'subida'` y los productos con `tagline = ''`
  y `highlights = '[]'` (RNF-10, FR-031)
- [ ] T067 Auditoría de completitud de la tienda y del panel (todas las features): crear
  `tests/unit/traceability.test.ts` que lee las historias de `docs/requisitos/HISTORIAS-DE-USUARIO.md` (menos
  las marcadas como retiradas) y exige que cada `HU-NN` aparezca en el título de al menos una prueba de
  `tests/` o `e2e/`; para cada HU que falte, escribir la prueba que la cubre (o, si la historia no está
  implementada, implementarla con su prueba primero y avisar) hasta que el test pase (RNF-08, RNF-09, SC-009)
- [ ] T068 Revisión visual de la experiencia de usuario de la tienda y del panel: con Playwright tomar
  capturas (en la carpeta temporal de la sesión, sin versionarlas) de portada, catálogo, detalle con
  galería y destacados, carrito, checkout, mi cuenta, mis pedidos, favoritos y créditos; y del panel: resumen,
  productos, formulario de producto, pedidos, detalle de pedido, clientes y configuración, en tema claro y
  oscuro, móvil (Pixel 7) y escritorio; mirarlas con la herramienta de lectura de imágenes, listar
  problemas de alineación, contraste, textos cortados, estados vacíos, y corregir los pequeños (los que
  exijan una feature nueva se anotan en `specs/README.md` como pendientes) (RNF-02, RNF-03, principio IX)
- [ ] T069 Verificar la base de datos desde cero: crear una base vacía temporal, aplicar las migraciones
  `0000` a `0004` con `npm run db:migrate`, cargar `npm run db:seed` y pasar `tests/api/seed.test.ts`;
  comprobar con `npm run db:generate` que no propone ningún cambio pendiente (esquema y migraciones
  alineados) y que `.env.example` lista todas las variables necesarias sin valores (RNF-10, principio V y VII)
- [ ] T070 Revisión de seguridad en `research.md` (R16): texto de la frase y los destacados siempre como
  texto (sin HTML), validación y normalización en el servidor, `rel="noopener noreferrer"` en todos los enlaces
  externos (créditos y WhatsApp), `GET /catalog/photo-credits` y `GET /catalog/contact` sin datos personales ni
  de productos inactivos, mensajes de WhatsApp codificados (sin inyección en la URL), la ruta de contacto
  solo expone el número que el administrador ya publica, los scripts no guardan credenciales y usan un
  `User-Agent` genérico, y las licencias admitidas; corregir lo que aparezca (RNF-05)
- [ ] T071 Ejecutar el recorrido completo de `quickstart.md` en tema claro y oscuro y a 320 px, y la revisión
  guiada de las 37 fotos principales (SC-003): anotar los productos con problemas, corregirlos en
  `src/db/gallery-data.ts` y repetir hasta que los 37 cumplan; confirmar también que todo texto nuevo de la
  interfaz está en español de Perú (FR-036, SC-001 a SC-011)
- [ ] T072 Correr `npm run check`, `npm run db:seed` y `npm run test:e2e` completos: tipos, lint, contraste,
  unitarias, API y e2e de las features 001 a 004 en verde, con cada historia HU-54 a HU-60 nombrada en al
  menos una prueba, y comprobar con `git diff --stat main -- public/img/productos docs/fotos
  ':!public/img/productos/galeria'` que los archivos actuales no cambiaron (SC-009, RNF-08, RNF-09, FR-031)
- [ ] T073 Marcar las tareas, publicar todo en GitHub con la convención de `CLAUDE.md` (subir la rama, commit
  de lo pendiente, pruebas, `merge --no-ff` a `main` con el mensaje «Merge feature 004: Galería y destacados
  del producto», borrar la rama local y la remota, subir `main` y mostrar `git log --oneline --graph -10`),
  comprobar que el CI de `main` queda en verde y que en GitHub (`gh repo view`) el README, `specs/` y
  `docs/` quedan al día, sin secretos ni firmas de IA (RNF-08, SC-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → historias.
- **US1 (Phase 3)** depende de Foundational (necesita los textos de T016 para las tarjetas de destacados).
  **US2 (Phase 4)** depende de US1 (comparte `Product.tsx`, `gallery-data.ts` y el seed). **US3 (Phase 5)**
  depende de US1 (la vista ampliada vive en la galería). **US4 (Phase 6)** depende de Foundational y de US2
  (usa los campos y el detalle). **US5 (Phase 7)** depende de Foundational y de las fotos con crédito de US1.
  **US6 (Phase 8)** depende de Foundational (T008 y T011) y de `Product.tsx` y `Layout.tsx` (en serie con US2 y
  US5). **US7 (Phase 9)** depende de Foundational (T008) y de US6 solo por el patrón del botón.
- **Polish (Phase 10)** depende de todas las historias.

### Within Each User Story

- La prueba va primero y debe fallar; luego la ruta o el script; luego la pantalla; al final los datos de
  demostración. Las tareas que tocan el mismo archivo (`gallery-data.ts`, `Product.tsx`, `catalog.ts`,
  `ProductGallery.tsx`, `Layout.tsx`, `seed-data.ts`) se ejecutan en serie. Las tareas de fotos T028 a T031
  escriben en `gallery-data.ts` y van en serie (una categoría por vez).

### Parallel Opportunities

- Phase 1: T001 y T002 en paralelo. Phase 2: T003 a T007 en paralelo; T011 y T012 en paralelo; T017 en
  paralelo con T009 a T016.
- US1: T019, T020 y T021 en paralelo; T022, T023 y T024 (archivos distintos de `scripts/fotos/`) se pueden
  hacer en paralelo con T025 y T026.
- US2: T035 y T036 en paralelo. US4: T044 y T045 en paralelo. US5: T049 y T050 en paralelo. US6: T054 y T055 en
  paralelo.
- Phase 10: T063, T064, T065 y T066 en paralelo.

### Parallel Example: Phase 2

```text
T003 tests/unit/highlights.test.ts | T004 tests/unit/photo-credit.test.ts | T005 tests/api/gallery-schema.test.ts | T006 tests/unit/whatsapp.test.ts | T007 tests/unit/gallery-data.test.ts
```

---

## Implementation Strategy

### MVP First

1. Phase 1 y 2 (esquema, migración, reglas puras, manifiesto, textos y tope de 8 fotos).
2. US1: galería y fotos de demostración (HU-54). **Parar y validar**: abrir 6 productos y recorrer la galería.
3. US2: frase y destacados (HU-56), el resto de P1.

### Incremental Delivery

4. US3, US4 y US6 (P2): vista ampliada, edición desde el panel y WhatsApp del cliente; validar cada una.
5. US5 y US7 (P3): créditos de las fotos y WhatsApp del administrador.
6. Phase 10: regresión completa, e2e, accesibilidad, auditoría de completitud y revisión visual de tienda y
   panel, verificación de la base de datos, documentación, revisión de seguridad y publicación en GitHub.

### Commits

Un commit al cerrar cada fase (y uno por categoría de fotos en US1), con el formato `feat(004): …`,
`test(004): …` o `docs(004): …`, sin firmas de IA. Todas las pruebas de las features 001 a 003 deben seguir
en verde en cada commit (SC-009). Subir la rama a GitHub al cerrar cada fase mayor.
