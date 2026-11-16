# Implementation Plan: Galería y destacados del producto (R Cube)

**Branch**: `004-galeria-destacados` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-galeria-destacados/spec.md`

## Summary

Con las features 001 a 003 fusionadas, esta feature mejora cómo se presenta un producto sin rehacer nada:
una galería de fotos con foto grande, flechas, deslizar, contador y miniaturas (HU-54), una vista ampliada a
pantalla completa (HU-55), una frase corta y hasta 5 destacados bajo el nombre (HU-56) que el administrador
edita en el formulario del producto (HU-57), una página pública de créditos de las fotos (HU-58) y contacto
por WhatsApp para el cliente (HU-59) y para el administrador (HU-60). Además los datos de demostración pasan
de una foto por producto a entre 4 y 6 (de 1 a 3 fotos reales y 3 tarjetas gráficas de nivel «ficha de
AliExpress»: características, destacados y compra segura), con frase y destacados para los 37 productos
activos, y el tope de fotos por producto sube de 6 a 8.

El enfoque técnico mantiene el mismo Worker y la misma SPA y **no agrega dependencias de ejecución**. La
galería es un carrusel propio con `scroll-snap` de CSS (el deslizar con el dedo lo hace el navegador), un
único componente `PhotoCarousel` que reutilizan la galería del detalle y la vista ampliada, que es el
`Dialog` de radix-ui que ya usa el panel. La frase y los destacados son dos columnas nuevas de `product`;
el crédito de las fotos son cuatro columnas nuevas de `product_image` (origen, autor, licencia y enlace), con
una restricción que impide una foto externa sin esos datos. Las fotos extra y las tarjetas de características
se preparan **una sola vez, fuera de la aplicación**, con scripts de desarrollo que usan la API de Wikimedia
Commons y Playwright (ya instalado), y el resultado (archivos `.webp` y un manifiesto con textos y créditos)
se versiona en el repositorio; el Worker solo sirve archivos estáticos. El contacto por WhatsApp son enlaces
`wa.me` armados en el navegador con el número de la tienda, que una consulta pública nueva
(`GET /api/catalog/contact`) lee de la configuración existente; no hay chat ni API de WhatsApp Business.

## Technical Context

**Language/Version**: TypeScript 6.0 estricto (Node 24 en desarrollo y CI)

**Primary Dependencies**: las de la 001 a 003 (Hono, React 19, React Router 8, TanStack Query 5, React Hook
Form, Zod 4, Tailwind 4, radix-ui, Drizzle 0.45, postgres.js, Better Auth 1.7); **sin dependencias nuevas**.
`Dialog` de radix-ui ya forma parte del paquete instalado. Los scripts de preparación de fotos usan
`@playwright/test` (devDependency existente) y `fetch` de Node; no se agrega ninguna librería de imágenes.

**Storage**: PostgreSQL con migración versionada `0004_galeria_destacados.sql` (columnas `tagline` y
`highlights` en `product`; `origin`, `credit_author`, `credit_license` y `credit_url` en `product_image`, con
copia de `origin` para las fotos existentes; el tope de 8 fotos es una constante, no una columna). Archivos: `public/img/productos/galeria/*.webp` (estáticos,
versionados); las fotos del panel siguen en R2.

**Testing**: Vitest (proyecto `unit` en Node y proyecto `api` con `@cloudflare/vitest-plugin`) y Playwright
(e2e y accesibilidad AA con axe, tema claro y oscuro, móvil y escritorio). Pruebas primero, una por regla.

**Target Platform**: Cloudflare Workers (assets estáticos + `/api/*`) con Hyperdrive; sin módulos nativos ni
sistema de archivos en ejecución. Los scripts de preparación corren solo en desarrollo.

**Project Type**: aplicación web (SPA React + API Hono en un solo Worker), ya existente.

**Performance Goals**: el detalle no suma consultas (la frase y los destacados viajan en la fila del
producto); la página de créditos es una sola consulta; la primera foto se pide con prioridad y las demás de
forma diferida; cada foto pesa como máximo 200 KB (un producto con 6 fotos descarga como máximo 1.2 MB).

**Constraints**: foto del servidor siempre desde la propia tienda (nada de enlazar a sitios externos);
`origin = externa` exige autor, licencia y enlace a nivel de base de datos; textos de frase y destacados
siempre como texto plano; el servidor valida los límites (90, 5 y 60); respeta reducir movimiento; no se
bloquea el pellizco del navegador; sin desbordar horizontalmente desde 320 px.

**Scale/Scope**: 7 historias (HU-54 a HU-60), 2 rutas públicas nuevas (créditos y contacto), 3 rutas
ampliadas, 1 pantalla nueva (créditos), 6 componentes nuevos (carrusel, galería, vista ampliada, destacados y
dos de WhatsApp), 37 productos con 4 a 6 fotos cada uno (unas 190 fotos, la mitad tarjetas generadas), 3
scripts de preparación y 1 migración.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple el plan | Estado |
|---|---|---|
| I. Simplicidad | Sin dependencias nuevas; un solo carrusel para galería y vista ampliada; destacados en columnas del producto y crédito en columnas de la foto (sin tablas nuevas); el navegador hace el deslizar | Cumple |
| II. Idioma y mercado | Todo texto en español de Perú, incluidos los mensajes de error y los textos alternativos | Cumple |
| III. Cero alcance fantasma | Cada ruta, columna y pantalla se rastrea a HU-54 a HU-60 (agregadas a `docs/requisitos/`); sin video, 360, lupa, chat integrado, WhatsApp Business API, cambio de foto al pasar el cursor ni búsqueda por destacados | Cumple |
| IV. Verificable sin código | `quickstart.md` recorre las 7 historias con los datos de demostración y una lista de revisión de las 37 fotos principales | Cumple |
| V. Datos y pagos con respeto | Sin datos personales nuevos; ningún secreto nuevo; los scripts no guardan credenciales; pagos no cambian | Cumple |
| VI. Pruebas primero | Cada regla (límites, normalización, licencias admitidas, integridad de los datos de demostración, auditoría, permisos) tiene prueba unitaria o de API antes de implementarla; la galería tiene e2e | Cumple |
| VII. Integridad de datos | Migración versionada; restricciones `CHECK` en la base para los límites y para el crédito; el cambio de producto y su auditoría van en una sola transacción | Cumple |
| VIII. Publicable en Cloudflare | En ejecución solo hay archivos estáticos y consultas; los scripts de preparación (red, archivos, Playwright) son de desarrollo y no entran al Worker | Cumple |
| IX. Experiencia cuidada | Estados de carga, vacío y error en la página de créditos; foto que falla usa la imagen genérica; teclado, lector de pantalla y áreas táctiles de 44 px | Cumple |
| X. Tema claro y oscuro | Mismos tokens; las tarjetas de características son imágenes fijas con buen contraste propio | Cumple |
| XI. Trazabilidad | Pruebas y tareas con HU-xx | Cumple |

Re-check tras la Fase 1: sin violaciones; ver [research.md](research.md) para las decisiones que sostienen
la tabla.

## Project Structure

### Documentation (this feature)

```text
specs/004-galeria-destacados/
├── spec.md
├── plan.md              # este archivo
├── research.md          # decisiones R1 a R15 (R16, revisión de seguridad, se agrega al cerrar la feature)
├── data-model.md        # columnas, reglas e invariantes
├── quickstart.md        # recorrido de validación con los datos de demostración
├── contracts/
│   └── api.md           # rutas ampliadas y nueva
├── checklists/
│   └── requirements.md
└── tasks.md             # lo genera /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── schema.ts                    # + product.tagline/highlights; product_image.origin/credit_*
│   ├── gallery-data.ts              # NUEVO: manifiesto de la demostración (fotos, créditos, frase, destacados)
│   └── seed-data.ts                 # usa gallery-data; exporta PRODUCTS; variante azul con foto de su galería
├── shared/
│   ├── highlights.ts                # NUEVO: límites y normalizeHighlights() puros
│   ├── photo-credit.ts              # NUEVO: licencias admitidas y enlace de licencia
│   ├── whatsapp.ts                  # + peruvianWhatsappNumber(), consulta de producto y saludo al cliente
│   ├── types.ts                     # + tagline/highlights en ProductDetail; PhotoCredits
│   └── admin-types.ts               # + tagline/highlights en AdminProduct
├── worker/
│   ├── services/images.ts           # MAX_IMAGES 6 → 8 y su mensaje
│   └── routes/
│       ├── catalog.ts               # + tagline/highlights en el detalle; GET /photo-credits; GET /contact
│       └── admin/products.ts        # + tagline/highlights en el cuerpo, la lectura y la auditoría
└── web/
    ├── components/                  # NUEVO: PhotoCarousel, ProductGallery, PhotoViewer, Highlights, WhatsAppButton, WhatsAppFloat
    ├── hooks/useStoreContact.ts     # NUEVO: número de WhatsApp de la tienda (consulta pública)
    ├── pages/                       # NUEVO: PhotoCredits; Product usa la galería, los destacados y el botón de WhatsApp
    ├── components/Layout.tsx        # + enlaces «Créditos de las fotos» y «WhatsApp» en el pie; botón flotante
    ├── router.tsx                   # + /creditos-fotos
    └── admin/pages/                 # ProductForm (frase y hasta 5 destacados); OrderDetail y CustomerDetail («Escribir por WhatsApp»)

public/img/productos/galeria/        # NUEVO: fotos y tarjetas .webp (≤ 200 KB, ≤ 1 200 px)

scripts/fotos/                       # NUEVO (solo desarrollo)
├── buscar.ts                        # lista candidatas de Commons con licencia admitida
├── preparar.ts                      # descarga, reduce a .webp y escribe a public/img/productos/galeria
└── tarjetas.ts                      # genera las 3 tarjetas por producto (características, destacados, compra segura)

drizzle/
└── 0004_galeria_destacados.sql      # generada con drizzle-kit + copia de origin

tests/
├── unit/                            # highlights, photo-credit, whatsapp, gallery-data
└── api/                             # gallery-schema, product-highlights (admin), photo-credits, store-contact, catalog (detalle y búsqueda), images (tope de 8), seed

e2e/                                 # galeria, galeria-ampliada, destacados, admin-destacados, creditos, whatsapp; accesibilidad ampliada
```

**Structure Decision**: se mantiene el único proyecto web con Worker y SPA de las features anteriores. La
lógica de límites vive en `src/shared/` para que el servidor y el formulario usen la misma regla; los
componentes nuevos son de presentación; las fotos y su manifiesto son datos de demostración versionados que
generan scripts de desarrollo, no código de la aplicación.

## Complexity Tracking

Sin violaciones de la constitución. Las dos decisiones que se apartan de «lo más directo» se justifican en
`research.md`: usar un carrusel propio con `scroll-snap` en lugar de una librería (R1), y preparar las fotos
fuera de línea con scripts de desarrollo en lugar de procesarlas al subirlas o al servirlas (R6).
