---
description: "Lista de tareas de la feature 004 Galería y destacados del producto"
---

# Tasks: Galería y destacados del producto (R Cube)

**Input**: Documentos de diseño en `specs/004-galeria-destacados/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Obligatorias por la constitución (principio VI). En cada historia la prueba va primero y
debe fallar antes de implementar. Cada título de prueba empieza con su HU.

**Organization**: Por historia de la spec (US1 a US5). Cada tarea nombra la HU, FR, RN o RNF que cubre.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mismo paquete que las features 001 a 003: `src/shared`, `src/db`, `src/worker`, `src/web`, `tests/unit`,
`tests/api`, `e2e`, `drizzle`; más `scripts/fotos/` (solo desarrollo) y `public/img/productos/galeria/`.

**Reglas de las fotos (valen para todas las tareas de fotos)**: cada foto elegida se mira con la herramienta
de lectura de imágenes antes de aceptarla; la primera foto de cada producto muestra un único equipo, completo
y reconocible; los archivos actuales de `public/img/productos/` y de `docs/fotos/` no se tocan (los pedidos de
demostración los referencian, FR-031, RN-07); las fotos nuevas van a `public/img/productos/galeria/` en
`.webp` de hasta 200 KB y 1 200 px; solo licencias CC0, dominio público, CC BY y CC BY-SA.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 [P] Agregar a `.gitignore` la caché de descargas `scripts/fotos/.cache/` y comprobar con
  `git check-ignore` que `public/img/productos/galeria/*.webp` NO está ignorada (FR-030)
- [X] T002 [P] Agregar a `package.json` los scripts `fotos:buscar`, `fotos:preparar` y `fotos:tarjetas`
  (`tsx scripts/fotos/buscar.ts`, `preparar.ts` y `tarjetas.ts`), sin dependencias nuevas (plan: Primary
  Dependencies; los archivos de los scripts se crean en la fase de US1) (FR-026, FR-030)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Propósito**: columnas, migración, reglas puras y manifiesto de la demostración que necesitan todas las
historias. Nada de la interfaz hasta terminar esta fase.

- [ ] T003 [P] Prueba unitaria `tests/unit/highlights.test.ts` (debe fallar): `TAGLINE_MAX` es 90,
  `HIGHLIGHT_MAX` 60 y `HIGHLIGHTS_MAX` 5; `normalizeHighlights(["  Pantalla de 120 Hz ", "", "   ",
  "Carga rápida"])` devuelve `["Pantalla de 120 Hz", "Carga rápida"]` (recorta espacios y descarta vacíos);
  no corta textos largos ni reordena; lista vacía devuelve `[]` (HU-56, HU-57, FR-014, FR-018)
- [ ] T004 [P] Prueba unitaria `tests/unit/photo-credit.test.ts` (debe fallar): `isAllowedLicense` acepta
  «CC0 1.0», «CC BY 4.0», «CC BY-SA 3.0», «CC BY-SA 4.0» y «Dominio público» y rechaza «CC BY-NC 4.0»,
  «CC BY-ND 4.0», «CC BY-NC-SA 4.0», «GFDL» y la cadena vacía; `licenseUrl("CC BY-SA 4.0")` devuelve
  `https://creativecommons.org/licenses/by-sa/4.0/`, `licenseUrl("CC0 1.0")` devuelve
  `https://creativecommons.org/publicdomain/zero/1.0/` y `licenseUrl("Dominio público")` devuelve `null`
  (HU-58, FR-021, FR-022)
- [ ] T005 [P] Prueba de API `tests/api/gallery-schema.test.ts` (debe fallar hasta aplicar la migración):
  insertar una `product_image` con `origin = 'externa'` y alguno de `credit_author`, `credit_license` o
  `credit_url` vacío falla por la restricción `CHECK (origin <> 'externa' or (credit_author <> '' and
  credit_license <> '' and credit_url <> ''))`; `origin = 'otra'` falla por `CHECK (origin in
  ('subida','proyecto','externa','tarjeta'))`; una foto insertada sin `origin` toma `'subida'`; un producto
  con `tagline` de 91 caracteres falla por `CHECK (char_length(tagline) <= 90)`; con 6 `highlights` falla
  por `CHECK (jsonb_typeof(highlights) = 'array' and jsonb_array_length(highlights) <= 5)`; un producto nuevo
  queda con `tagline = ''` y `highlights = '[]'` (FR-014, FR-021)
- [ ] T006 Implementar `src/shared/highlights.ts` (`TAGLINE_MAX = 90`, `HIGHLIGHT_MAX = 60`,
  `HIGHLIGHTS_MAX = 5`, `normalizeHighlights(list: string[]): string[]`) y `src/shared/photo-credit.ts`
  (`isAllowedLicense(name)` con las licencias admitidas CC0, dominio público, CC BY y CC BY-SA y
  `licenseUrl(name)`), hasta que pasen T003 y T004 (HU-56, HU-57, HU-58, FR-014, FR-021)
- [ ] T007 Agregar a `src/db/schema.ts`, exactamente como en data-model.md: en `product`, `tagline` `text`
  no nulo con `''` por defecto y `CHECK (char_length(tagline) <= 90)`, y `highlights` `jsonb` no nulo con
  `'[]'` por defecto (`$type<string[]>`) y `CHECK (jsonb_typeof(highlights) = 'array' and
  jsonb_array_length(highlights) <= 5)`; en `product_image`, `origin` `text` no nulo con `'subida'` por
  defecto y `CHECK (origin in ('subida','proyecto','externa','tarjeta'))`, `credit_author`,
  `credit_license` y `credit_url` `text` no nulos con `''` por defecto, y `CHECK (origin <> 'externa' or
  (credit_author <> '' and credit_license <> '' and credit_url <> ''))` (HU-56, HU-58, FR-014, FR-021)
- [ ] T008 Generar la migración con `npm run db:generate`, renombrarla `drizzle/0004_galeria_destacados.sql`
  (y su entrada en `drizzle/meta/_journal.json`), agregar al final `UPDATE product_image SET origin =
  'proyecto' WHERE r2_key IS NULL;` y aplicarla con `npm run db:migrate`; comprobar que T005 pasa y que las
  pruebas de las features 001 a 003 siguen en verde (RNF-10, FR-031, FR-033)
- [ ] T009 [P] Ampliar `src/shared/types.ts` según contracts/api.md: `ProductDetail.tagline: string` y
  `highlights: string[]`; tipo `PhotoCredits` con `external: { productName, productSlug, imageUrl, alt,
  author, license, licenseUrl: string | null, sourceUrl }[]` y `project: { productName, productSlug }[]`; y
  `src/shared/admin-types.ts`: `AdminProduct.tagline` y `highlights` (HU-54 a HU-58)
- [ ] T010 [P] Ampliar `tests/api/helpers.ts` con `makeImages(productId, defs)` que inserta filas de
  `product_image` con `origin`, `credit_*`, `url`, `alt` y `position` (para las pruebas de créditos y de
  fotos); `resetDb` no cambia porque `product_image` ya está en el `TRUNCATE` (HU-58)
- [ ] T011 Crear `src/db/gallery-data.ts` con los tipos `DemoPhoto` (`url` bajo `/img/`, `alt`, `origin`
  `proyecto | externa | tarjeta`, `source?`, `credit?: { author, license, url, title }`), `GalleryEntry`
  (`tagline`, `highlights`, `photos`) y `GALLERY: Record<slug, GalleryEntry>`, con un primer manifiesto que
  cubre los 38 productos del seed con su foto actual como única foto (`origin: "proyecto"`, `url`
  `/img/productos/<archivo>` o `/img/generico.svg`), `tagline: ""` y `highlights: []`; el producto inactivo
  conserva siempre este contenido (HU-54, FR-031, spec: Assumptions)
- [ ] T012 Exportar `PRODUCTS` en `src/db/seed-data.ts` y reemplazar en `runSeed` la inserción de una foto
  por producto por las filas de `GALLERY` (`id = img-<id del producto>-<n>`, `position = n - 1`, `origin` y
  `credit_*` del manifiesto, `r2_key` nulo); insertar `tagline` y `highlights` en `product`; en
  `seedVariants` quitar la fila especial `img-edge-azul` y dejar que `var-edge-256-azul` apunte a una foto de
  la galería del Edge (por ahora la primera); ajustar lo que use los ids antiguos de fotos (HU-54, HU-56,
  FR-032)
- [ ] T013 Revisar con `grep` que ninguna prueba existente suponga una sola foto por producto y ajustar
  `tests/api/seed.test.ts` (la foto de cada variante pertenece al mismo producto; todo producto tiene al
  menos una foto con posiciones 0 a n-1 y `origin` válido); confirmar con `npm run test` que las pruebas de
  las features 001 a 003 siguen en verde (SC-009)

**Checkpoint**: migración 0004 aplicada, reglas puras listas y seed funcionando con el manifiesto.

---

## Phase 3: User Story 1 - Ver varias fotos del producto en una galería (Priority: P1) 🎯 MVP

**Goal**: el detalle muestra una galería con foto grande, flechas, deslizar, contador y miniaturas, y cada
producto activo de demostración tiene de 3 a 5 fotos con la primera más llamativa (HU-54).

**Independent Test**: abrir el «Samsung Galaxy S23 256 GB», ver de 3 a 5 fotos, pasar de una a otra con la
flecha, con una miniatura, con el teclado y deslizando, y comprobar contador y miniatura activa.

### Tests for User Story 1 (escribir primero, deben fallar)

- [ ] T014 [P] [US1] Prueba unitaria `tests/unit/gallery-data.test.ts` (HU-54, FR-025 a FR-030): para cada
  producto activo de `PRODUCTS` existe su entrada en `GALLERY`; tiene de 3 a 5 fotos; los `alt` no están
  vacíos y son distintos entre sí dentro del producto; la tarjeta (`origin: "tarjeta"`), si existe, es la
  última y hay como máximo una; la primera foto no es tarjeta; cada foto `externa` trae `credit.author`,
  `credit.license` (aceptada por `isAllowedLicense`) y `credit.url`; cada `url` empieza con `/img/` y el
  archivo existe en `public/`; cada archivo `.webp` pesa como máximo 204 800 bytes y mide como máximo 1 200 px
  de lado mayor (leer ancho y alto de la cabecera WebP en el propio test)
- [ ] T015 [P] [US1] Pruebas de API en `tests/api/seed.test.ts` y `tests/api/catalog.test.ts` (HU-54,
  FR-025, FR-032, FR-034): los 37 productos activos tienen de 3 a 5 filas de `product_image`, posiciones 0 a
  n-1 sin huecos, y la foto de cada variante (`product_variant.image_id`) es de su mismo producto; con un
  producto de 3 fotos (`makeImages`) la tarjeta del catálogo, la línea del carrito y los favoritos usan la
  foto de posición 0, y al marcar otra como principal (`POST /admin/products/:id/images/:imageId/main`) pasan
  a usar esa; la línea de carrito de una variante con foto propia usa la de la variante (HU-44)
- [ ] T016 [P] [US1] Prueba e2e `e2e/galeria.spec.ts` (HU-54, FR-001 a FR-009): en
  `/producto/samsung-galaxy-s23-256-gb` el contador dice «1 de N» con N entre 3 y 5 y hay N miniaturas;
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

- [ ] T017 [US1] Crear `scripts/fotos/buscar.ts` (solo desarrollo): recibe una consulta (`npm run
  fotos:buscar -- "Samsung Galaxy S23"`), consulta la API de Wikimedia Commons (`action=query`,
  `generator=search`, `gsrnamespace=6`, `prop=imageinfo`, `iiprop=url|size|mime|extmetadata`,
  `iiextmetadatafilter=LicenseShortName|Artist`, `iiurlwidth=800`) con `User-Agent` genérico
  «RCubeLab/1.0 (proyecto educativo)», descarta las candidatas cuya licencia no cumpla `isAllowedLicense`,
  imprime título, autor sin HTML, licencia, tamaño y enlace de origen, y guarda las miniaturas en
  `scripts/fotos/.cache/candidatas/<consulta>/` para poder verlas (R7, FR-021)
- [ ] T018 [US1] Crear `scripts/fotos/preparar.ts` (solo desarrollo): lee `GALLERY`; para cada foto con
  `source` de Commons descarga la miniatura de 1 200 px (verifica que autor y licencia coincidan con el
  manifiesto y avisa si no); para cada foto del proyecto lee el archivo original de `public/img/productos/`
  sin modificarlo; abre Chromium con Playwright, la dibuja en un `canvas` a 1 200 px de lado mayor como
  máximo y la exporta con `toBlob("image/webp", calidad)` bajando la calidad de 0,86 a 0,5 y luego el tamaño
  hasta pesar 204 800 bytes o menos; escribe `public/img/productos/galeria/<slug>-<n>.webp` y falla con un
  mensaje claro si no logra el peso (R6, R8, FR-030, FR-031)
- [ ] T019 [US1] Crear `scripts/fotos/tarjetas.ts` (solo desarrollo): para cada producto de `PRODUCTS`
  renderiza con Playwright una plantilla HTML de 1 000 × 1 000 px con el logo de `public/img/logo.png`, la
  marca, el nombre y hasta 4 especificaciones del propio producto (etiqueta y valor tal como están en el
  seed), con los colores del tema (fondo `#0b0b0f` a `#17171c`, acento `#3b93ff`, texto `#f5f5f7`), sin
  ninguna foto de Commons dentro; la exporta a `.webp` de hasta 204 800 bytes con la misma rutina que
  `preparar.ts` y escribe el archivo que indica el manifiesto; el `alt` que se usa en el manifiesto es
  «Tarjeta de características de <nombre>: <etiqueta valor, …>» (R9, FR-027, FR-028)
- [ ] T020 [US1] Crear `src/web/components/PhotoCarousel.tsx`: pista horizontal con `overflow-x: auto`,
  `scroll-snap-type: x mandatory` y una foto por pantalla; props `photos: { url, alt }[]`, `index`,
  `onIndexChange` y `fit` (`cover` o `contain`); foto activa calculada con `IntersectionObserver`; `goTo(i)`
  circular con `scrollTo` (`behavior: "auto"` si `prefers-reduced-motion: reduce`); `role="region"` con
  `aria-roledescription="carrusel"` y nombre «Galería de fotos», diapositivas con `role="group"`,
  `aria-roledescription="foto"` y nombre «Foto 2 de 5», no activas con `inert`, texto solo para lectores con
  `aria-live="polite"` («Foto 2 de 5»); flechas izquierda y derecha del teclado solo con el foco dentro;
  primera foto con `fetchpriority="high"` y las demás `loading="lazy"`; sin `touch-action: none` (R1, R3, R12,
  FR-002 a FR-004, FR-008, FR-013)
- [ ] T021 [US1] Crear `src/web/components/ProductGallery.tsx`: usa `PhotoCarousel` en un contenedor de
  proporción fija (`aspect-square`) y muestra, solo con 2 o más fotos, el contador «N de M», los botones
  «Foto anterior» y «Foto siguiente» (áreas de 44 px, foco visible) y una franja desplazable de miniaturas
  (botones con nombre «Ver foto N de M» y `aria-current="true"` en la activa, `loading="lazy"`); con una foto
  muestra solo la foto y sin ninguna, la imagen genérica; una foto que falla se sustituye por
  `/img/generico.svg` sin romper la navegación; sin desborde horizontal desde 320 px (FR-001, FR-005, FR-008,
  FR-009)
- [ ] T022 [US1] Actualizar `src/web/pages/Product.tsx`: reemplazar la sección de fotos por
  `ProductGallery` con el índice controlado; al elegir una variante con foto propia el índice salta a esa
  foto y una navegación manual posterior prevalece; reiniciar la galería con `key={slug}` al cambiar de
  producto (FR-006, FR-007)
- [ ] T023 [US1] Fotos de **celulares** (13 productos activos: iPhone 15 Pro 256 GB, iPhone 13 Pro 128 GB,
  iPhone SE 64 GB, Samsung Galaxy S23 256 GB, Samsung Galaxy S22 Ultra 256 GB, Xiaomi Redmi Note 12 128 GB,
  Xiaomi 13T Pro 512 GB, Motorola Edge 60 Pro, Google Pixel 8 128 GB, Huawei P60, Sony Xperia Z5, OnePlus 13R
  y Nothing Phone (2)): por cada uno usar `npm run fotos:buscar`, mirar las candidatas con la herramienta de
  lectura de imágenes y aceptar solo las que muestran el equipo correcto y solo ese equipo; el iPhone 15 Pro
  pasa a tener una foto principal de un solo equipo (su foto original muestra cuatro) y esa original se retira
  de su galería; escribir las entradas en `src/db/gallery-data.ts` (`alt` en español que describa lo que se
  ve, `credit` completo, `source`) con la foto más llamativa primera, otras fotos reales de otros ángulos y la
  tarjeta al final (de 3 a 5 fotos); ejecutar `npm run fotos:preparar` y mirar los `.webp` resultantes (HU-54,
  FR-025, FR-026, FR-031)
- [ ] T024 [US1] Fotos de **laptops** (12 productos activos: MacBook Air M1 256 GB, MacBook Pro 16 M3 Pro,
  Dell XPS 13, Dell Inspiron 15, HP Pavilion 15, HP Spectre x360, Lenovo ThinkPad X1 Carbon, Asus Vivobook
  15, Asus Zenbook 14 OLED, Acer Swift Go 14, MSI Katana 15 Gaming y Microsoft Surface Laptop 5): mismo
  procedimiento que T023; la foto original de la MSI muestra la parte inferior, así que otra foto pasa a ser
  la principal y esa original se retira de su galería (HU-54, FR-025, FR-026, FR-031)
- [ ] T025 [US1] Fotos de **tablets** (4 productos activos: iPad 10.ª generación 64 GB, Samsung Galaxy Tab S9
  128 GB, Xiaomi Pad 6 128 GB y Lenovo Tab M10; hoy solo tienen la imagen genérica y no hay foto original):
  buscar y aceptar una foto principal de un solo equipo y al menos una adicional del mismo modelo; si no hay
  una foto libre buena del modelo exacto, usar una del mismo tipo de producto y dejarlo anotado en el `alt`;
  tarjeta al final; mismo procedimiento que T023 (HU-54, FR-025, FR-026)
- [ ] T026 [US1] Fotos de **accesorios y repuestos** (8 productos activos: batería para celular, batería para
  laptop de 6 celdas, cooler y disipador, Fairphone módulo de cámara, kit de herramientas de 32 en 1, pasta
  térmica de 4 g, memoria RAM DDR4 de 16 GB y SSD NVMe de 1 TB): mismo procedimiento que T023 con fotos del
  mismo tipo de producto cuando no exista una del modelo exacto, sin marcas de otro modelo a la vista como
  principal (HU-54, FR-025, FR-026)
- [ ] T027 [US1] Ejecutar `npm run fotos:tarjetas` para los 37 productos activos, mirar con la herramienta de
  lectura de imágenes al menos 10 tarjetas de las cuatro categorías (texto legible, sin cortes ni datos
  inventados), corregir la plantilla si hace falta y confirmar que cada producto queda con de 3 a 5 fotos; si
  algún producto no llega a 3, listarlo y resolver caso por caso con otra foto libre del mismo tipo (HU-54,
  FR-025, FR-027)
- [ ] T028 [US1] En `src/db/seed-data.ts` hacer que `var-edge-256-azul` apunte a la foto de la galería del
  Edge que mejor muestre el color azul (o, si ninguna lo hace, a una foto distinta de la principal) y
  confirmar que T015 pasa (HU-44, FR-006, FR-032)
- [ ] T029 [US1] Pasar T014, T015 y T016 en verde, volver a cargar los datos con `npm run db:seed`, abrir 5
  productos (uno por categoría y el iPhone 15 Pro y la MSI) en tema claro y oscuro y a 320 px, y confirmar que
  la galería se ve bien; commit por categoría de fotos y uno de cierre de fase (HU-54, SC-001, SC-002)

**Checkpoint**: US1 funcional: galería completa con fotos de demostración revisadas.

---

## Phase 4: User Story 2 - Ver una frase y destacados breves del producto (Priority: P1)

**Goal**: bajo el nombre del producto se ve una frase corta y de 3 a 5 viñetas; los 37 productos activos de
demostración los traen (HU-56).

**Independent Test**: abrir el «iPhone 13 Pro 128 GB» y ver la frase y las viñetas; abrir un producto sin
ellos y comprobar que no hay bloque ni hueco.

### Tests for User Story 2 (escribir primero, deben fallar)

- [ ] T030 [P] [US2] Prueba de API en `tests/api/catalog.test.ts` (HU-56, FR-014 a FR-017):
  `GET /catalog/products/:slug` devuelve `tagline` y `highlights` de un producto que los tiene (cargarlos por
  SQL en la prueba), `tagline: ""` y `highlights: []` en uno que no, y `images` sigue siendo `{ url, alt }[]`
  sin más campos (compatibilidad con `tests/api/admin/images.test.ts`); una búsqueda
  (`GET /catalog/products?q=`) con una palabra que solo está en la frase o en un destacado no devuelve el
  producto, y lo mismo con `GET /admin/products?q=` (clarificación 5)
- [ ] T031 [P] [US2] Prueba e2e `e2e/destacados.spec.ts` (HU-56, FR-015, FR-016): en
  `/producto/iphone-13-pro-128-gb` hay una frase y de 3 a 5 viñetas bajo el título y antes del precio (orden
  del DOM); un producto creado por la API del panel sin frase ni destacados no muestra el bloque ni deja un
  contenedor vacío; una frase con `<b>hola</b>` se ve como texto, sin negrita; la descripción y las
  especificaciones siguen visibles
- [ ] T032 [P] [US2] Ampliar `tests/unit/gallery-data.test.ts` (HU-56, FR-029): para cada producto activo
  `tagline` no vacía de hasta `TAGLINE_MAX` (90) caracteres; de 3 a 5 destacados de hasta `HIGHLIGHT_MAX` (60)
  caracteres, sin duplicados y sin `<` ni `>`; ninguna frase ni destacado usa mayúsculas sostenidas ni signos
  de exclamación repetidos; cada dato numérico de un destacado (por ejemplo «120 Hz», «256 GB») aparece, normalizando la coma
  decimal («6,1» y «6.1» son iguales) y los espacios, en las especificaciones o en la descripción del
  producto en `PRODUCTS` (no afirma nada que no esté respaldado)

### Implementation for User Story 2

- [ ] T033 [US2] En `src/worker/routes/catalog.ts` leer `tagline` y `highlights` del producto en el detalle y
  devolverlos en `ProductDetail`; sin cambios en las tarjetas del catálogo (HU-56, contracts/api.md)
- [ ] T034 [US2] Crear `src/web/components/Highlights.tsx` (frase en destacado y lista `<ul>` de viñetas con
  icono, todo como texto) y usarlo en `src/web/pages/Product.tsx` bajo el nombre y antes del precio; sin
  frase ni viñetas no renderiza nada; contraste AA en ambos temas con los tokens del tema (FR-015, FR-016)
- [ ] T035 [US2] Escribir en `src/db/gallery-data.ts` la frase y de 3 a 5 destacados de los 37 productos
  activos, en español de Perú, tono comercial y breve, basados únicamente en sus especificaciones y
  descripción del seed (por ejemplo, del iPhone 13 Pro: «Pantalla ProMotion de 120 Hz», «Triple cámara para
  foto y video»); el producto inactivo queda sin ellos; pasar T030 a T032 (HU-56, FR-029)
- [ ] T036 [US2] Volver a cargar con `npm run db:seed`, revisar 6 productos en la tienda (ambos temas y 320
  px) y commit de cierre de fase (HU-56, SC-002)

**Checkpoint**: US1 y US2 funcionan juntas; el detalle ya se ve completo.

---

## Phase 5: User Story 3 - Ampliar una foto a pantalla completa (Priority: P2)

**Goal**: tocar la foto grande abre una vista a pantalla completa navegable y accesible (HU-55).

**Independent Test**: en un producto con 4 fotos, abrir la vista, pasar a la foto 3 con el teclado, cerrar con
Escape y comprobar que el foco vuelve al control de origen y la galería queda en la foto 3.

### Tests for User Story 3 (escribir primero, deben fallar)

- [ ] T037 [P] [US3] Prueba e2e `e2e/galeria-ampliada.spec.ts` (HU-55, FR-010 a FR-013): tocar la foto grande
  o «Ampliar foto» abre un diálogo con nombre «Fotos de <producto>», contador, flechas y «Cerrar»; las
  flechas del teclado y los botones cambian de foto dentro de la vista; Tab 12 veces nunca saca el foco del
  diálogo; la página de fondo no se desplaza mientras está abierta; Escape y «Cerrar» la cierran, el foco
  vuelve al control que la abrió y la galería queda en la foto en que se quedó; con `reducedMotion: "reduce"`
  el estilo `scroll-behavior` de la pista es `auto`; la vista no deshabilita el pellizco (`touch-action` no es
  `none`)

### Implementation for User Story 3

- [ ] T038 [US3] Crear `src/web/components/PhotoViewer.tsx` con el `Dialog` de radix-ui a pantalla completa:
  título visible solo para lectores «Fotos de <producto>», botón «Cerrar» de 44 px, `PhotoCarousel` con
  `fit="contain"` abierto en la foto activa, contador y flechas; al cerrar entrega el índice final por
  `onIndexChange`; sin zoom propio ni `touch-action: none`; sin animaciones con reducir movimiento (R2, FR-010
  a FR-013)
- [ ] T039 [US3] En `src/web/components/ProductGallery.tsx` agregar el botón «Ampliar foto» sobre la foto y
  hacer que tocar la foto abra `PhotoViewer`; el foco vuelve al control que lo abrió y la foto activa se
  sincroniza al cerrar; pasar T037 (HU-55, FR-010, FR-011)
- [ ] T040 [US3] Commit de cierre de fase tras confirmar que T016 y T037 pasan juntas (HU-55)

**Checkpoint**: US1 a US3 completas para el cliente.

---

## Phase 6: User Story 4 - Editar la frase y los destacados desde el panel (Priority: P2)

**Goal**: el administrador edita la frase y los destacados en el formulario del producto, con validación y
auditoría (HU-57).

**Independent Test**: como administrador, escribir una frase de 70 caracteres y 3 destacados, guardar, ver el
cambio en la tienda y en la auditoría; probar los rechazos (91 caracteres, sexto destacado, 61 caracteres).

### Tests for User Story 4 (escribir primero, deben fallar)

- [ ] T041 [P] [US4] Prueba de API `tests/api/admin/product-highlights.test.ts` (HU-57, FR-014, FR-018 a
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
- [ ] T042 [P] [US4] Prueba e2e `e2e/admin-destacados.spec.ts` (HU-57, SC-005): en el panel abrir un producto,
  escribir una frase y 3 destacados, guardar y ver el cambio en la tienda al recargar; ver la entrada en
  Auditoría; una frase de 91 caracteres muestra «La frase no puede pasar de 90 caracteres» junto al campo; un
  sexto destacado y uno de 61 caracteres muestran su mensaje; quitar un destacado con el botón «Quitar»

### Implementation for User Story 4

- [ ] T043 [US4] En `src/worker/routes/admin/products.ts` ampliar `productBody` con `tagline:
  z.string().trim().max(90, "La frase no puede pasar de 90 caracteres").optional()` y `highlights:
  z.array(z.string()).transform(normalizeHighlights).pipe(z.array(z.string().max(60, "Cada destacado admite
  hasta 60 caracteres")).max(5, "Máximo 5 destacados")).optional()`; `POST` los guarda (vacíos por defecto),
  `PATCH` solo los actualiza si vienen en el cuerpo; `loadAdminProduct` los devuelve; auditoría según R5
  dentro de la misma transacción; pasar T041 (HU-57, FR-014, FR-018 a FR-020)
- [ ] T044 [US4] En `src/web/admin/pages/ProductForm.tsx` agregar el campo «Frase destacada» con contador de
  hasta 90 caracteres y una lista de hasta 5 «Destacado N» con `useFieldArray`, botones «Agregar destacado»
  (deshabilitado al llegar a 5) y «Quitar destacado N», contador de hasta 60 caracteres por fila y errores
  por campo (`tagline`, `highlights` y `highlights.N`) con el mismo manejo que `specs`; el formulario envía
  siempre ambos campos; pasar T042 (HU-57, FR-018)
- [ ] T045 [US4] Commit de cierre de fase tras confirmar que las pruebas de producto de la feature 002
  (`tests/api/admin/products.test.ts` y `e2e/admin.spec.ts`) siguen en verde (HU-57, SC-009)

**Checkpoint**: US1 a US4 completas.

---

## Phase 7: User Story 5 - Conocer el crédito de las fotos (Priority: P3)

**Goal**: página pública «Créditos de las fotos» con autor, licencia y enlace de origen, enlazada desde el
pie (HU-58).

**Independent Test**: abrir los créditos desde el pie y comprobar que cada foto externa aparece con producto,
autor, licencia y un enlace que abre la página de origen.

### Tests for User Story 5 (escribir primero, deben fallar)

- [ ] T046 [P] [US5] Prueba de API `tests/api/photo-credits.test.ts` (HU-58, FR-021 a FR-023):
  `GET /catalog/photo-credits` sin sesión responde 200; `external` incluye solo fotos `externa` de productos
  activos, con producto, `imageUrl`, `alt`, `author`, `license`, `licenseUrl` (el enlace de la licencia o
  `null` en dominio público) y `sourceUrl`, ordenadas por nombre de producto y posición; `project` lista una
  vez cada producto activo con fotos `proyecto`; las fotos `subida` y `tarjeta` no aparecen; un producto
  inactivo no aparece; sin créditos responde `{ external: [], project: [] }`
- [ ] T047 [P] [US5] Prueba e2e `e2e/creditos.spec.ts` (HU-58, FR-022 a FR-024): desde el pie de la tienda
  «Créditos de las fotos» abre `/creditos-fotos`; la página tiene título, una fila por foto externa con
  producto (enlace al detalle), autor, licencia y enlace de origen con `target="_blank"` y `rel` con
  `noopener`; el grupo «Fotos aportadas por el proyecto»; el aviso de que las tarjetas son de R Cube; en
  CC BY-SA la nota de que las fotos pueden estar reducidas de tamaño

### Implementation for User Story 5

- [ ] T048 [US5] En `src/worker/routes/catalog.ts` agregar `GET /photo-credits` (pública, una consulta sobre
  `product_image` unido a `product` activo) que arma `external` con `licenseUrl` desde `photo-credit.ts` y
  `project` agrupado por producto, según contracts/api.md; pasar T046 (HU-58, FR-022, FR-023)
- [ ] T049 [US5] Crear `src/web/pages/PhotoCredits.tsx` (estados de carga, vacío y error; lista por producto
  con miniatura, autor, licencia con su enlace y enlace de origen en pestaña nueva con `rel="noopener
  noreferrer"`; grupo del proyecto y aviso de las tarjetas), registrar `/creditos-fotos` en
  `src/web/router.tsx` y agregar el enlace «Créditos de las fotos» al pie de `src/web/components/Layout.tsx`;
  pasar T047 (HU-58, FR-022 a FR-024)
- [ ] T050 [US5] Commit de cierre de fase (HU-58, SC-004)

**Checkpoint**: las cinco historias completas.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T051 [P] Ampliar `e2e/accesibilidad.spec.ts` (RNF-03, FR-035, SC-006, SC-007): agregar a `PAGES` el
  detalle con galería (`/producto/samsung-galaxy-s23-256-gb`) y `/creditos-fotos`; una prueba en ambos temas
  que abre la vista ampliada y pasa axe AA con el diálogo abierto; una prueba de teclado que recorre la
  galería y la vista ampliada sin ratón; y la comprobación de no desborde horizontal a 320 px en el detalle,
  la vista ampliada y los créditos (ampliando la que ya existe para las páginas del cliente)
- [ ] T052 [P] Actualizar `DESPLIEGUE.md`: aplicar la migración `0004` antes de publicar, que las fotos de
  `public/img/productos/galeria/` viajan con el build, cargar los datos de demostración con el seed (que
  reemplaza las fotos) y la nota de que las fotos de Commons exigen mantener visible la página de créditos
  (FR-021, RNF-10)
- [ ] T053 [P] Actualizar `README.md` y `specs/README.md`: la fila de la 003 pasa a «Cerrada: fusionada en
  `main`» (hoy dice «En implementación»), nueva fila y sección de la 004 con sus artefactos, historias HU-54
  a HU-58, los scripts `fotos:*` y el riesgo declarado de las fotos originales de `docs/fotos` sin autor
  registrado (FR-023, spec: Assumptions)
- [ ] T054 [P] Verificar la migración `0004` sobre una base temporal que ya tenga datos de la 003: aplicar
  `0000` a `0003`, insertar productos y fotos estáticas y una foto con `r2_key`, aplicar `0004` y comprobar
  que las estáticas quedan en `origin = 'proyecto'`, la de R2 en `'subida'` y los productos con `tagline = ''`
  y `highlights = '[]'` (RNF-10, FR-031)
- [ ] T055 Revisión de seguridad en `research.md` (R14): texto de la frase y los destacados siempre como
  texto (sin HTML), validación y normalización en el servidor, `rel="noopener noreferrer"` en los enlaces de
  origen, la ruta pública de créditos no expone datos personales ni de productos inactivos, los scripts no
  guardan credenciales y usan un `User-Agent` genérico, y las licencias admitidas; corregir lo que aparezca
  (RNF-05)
- [ ] T056 Ejecutar el recorrido completo de `quickstart.md` en tema claro y oscuro y a 320 px, y la revisión
  guiada de las 37 fotos principales (SC-003): anotar los productos con problemas, corregirlos en
  `src/db/gallery-data.ts` y repetir hasta que los 37 cumplan; confirmar también que todo texto nuevo de la
  interfaz está en español de Perú (FR-036, SC-001 a SC-008)
- [ ] T057 Correr `npm run check`, `npm run db:seed` y `npm run test:e2e` completos: tipos, lint, contraste,
  unitarias, API y e2e de las features 001 a 004 en verde, con cada historia HU-54 a HU-58 nombrada en al
  menos una prueba, y comprobar con `git diff --stat main -- public/img/productos docs/fotos
  ':!public/img/productos/galeria'` que los archivos actuales no cambiaron (SC-009, RNF-08, RNF-09, FR-031)
- [ ] T058 Marcar las tareas, cerrar la feature con la convención de `CLAUDE.md` (commit de lo pendiente,
  pruebas, `merge --no-ff` a `main` con el mensaje «Merge feature 004: Galería y destacados del producto»,
  borrar la rama local y la remota, subir `main` y mostrar `git log --oneline --graph -10`) y comprobar que
  el CI de `main` queda en verde (RNF-08, SC-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → historias.
- **US1 (Phase 3)** depende de Foundational. **US2 (Phase 4)** depende de US1 (comparte `Product.tsx`,
  `gallery-data.ts` y el seed con fotos). **US3 (Phase 5)** depende de US1 (la vista ampliada vive en la
  galería). **US4 (Phase 6)** depende de Foundational y de US2 (usa los campos y el detalle). **US5 (Phase 7)**
  depende de Foundational y de las fotos con crédito de US1.
- **Polish (Phase 8)** depende de todas las historias.

### Within Each User Story

- La prueba va primero y debe fallar; luego la ruta o el script; luego la pantalla; al final los datos de
  demostración. Las tareas que tocan el mismo archivo (`gallery-data.ts`, `Product.tsx`, `catalog.ts`,
  `ProductGallery.tsx`, `seed-data.ts`) se ejecutan en serie. Las tareas de fotos T023 a T026 escriben en
  `gallery-data.ts` y van en serie (una categoría por vez).

### Parallel Opportunities

- Phase 1: T001 y T002 en paralelo. Phase 2: T003, T004 y T005 en paralelo; T009 y T010 en paralelo.
- US1: T014, T015 y T016 en paralelo; T017, T018 y T019 (archivos distintos de `scripts/fotos/`) se pueden
  hacer en paralelo con T020 y T021.
- US2: T030, T031 y T032 en paralelo. US4: T041 y T042 en paralelo. US5: T046 y T047 en paralelo.
- Phase 8: T051, T052, T053 y T054 en paralelo.

### Parallel Example: Phase 2

```text
T003 tests/unit/highlights.test.ts  |  T004 tests/unit/photo-credit.test.ts  |  T005 tests/api/gallery-schema.test.ts
```

---

## Implementation Strategy

### MVP First

1. Phase 1 y 2 (esquema, migración, reglas puras y manifiesto).
2. US1: galería y fotos de demostración (HU-54). **Parar y validar**: abrir 5 productos y recorrer la galería.
3. US2: frase y destacados (HU-56), el resto de P1.

### Incremental Delivery

4. US3 y US4 (P2): vista ampliada y edición desde el panel; validar cada una con su prueba.
5. US5 (P3): créditos de las fotos.
6. Phase 8: regresión completa, e2e, accesibilidad, documentación, revisión de seguridad y cierre.

### Commits

Un commit al cerrar cada fase (y uno por categoría de fotos en US1), con el formato `feat(004): …`,
`test(004): …` o `docs(004): …`, sin firmas de IA. Todas las pruebas de las features 001 a 003 deben seguir
en verde en cada commit (SC-009).
