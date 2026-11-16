# Data Model: Galería y destacados del producto (R Cube)

Cambios sobre el modelo de las features 001 a 003. No hay tablas nuevas: la frase y los destacados viven en
`product` y el crédito en `product_image`. Todo el cambio de esquema es la migración
`drizzle/0004_galeria_destacados.sql` (generada con `drizzle-kit generate` y completada a mano con la
copia de `origin`). Decisiones en [research.md](research.md) R4 y R10.

## `product` (columnas nuevas)

| Columna | Tipo | Regla |
|---|---|---|
| `tagline` | `text not null default ''` | Frase corta y llamativa. `CHECK (char_length(tagline) <= 90)` (FR-014) |
| `highlights` | `jsonb not null default '[]'` | Lista ordenada de 0 a 5 textos de hasta 60 caracteres (FR-014). `CHECK (jsonb_typeof(highlights) = 'array' and jsonb_array_length(highlights) <= 5)` |

- El servidor normaliza antes de guardar (`normalizeHighlights`): recorta espacios y descarta vacíos; Zod
  valida que cada texto tenga 60 caracteres o menos y que haya como máximo 5.
- Los productos existentes quedan con `tagline = ''` y `highlights = []` (no se muestra el bloque, FR-015).
- Los valores son texto plano: la interfaz los pinta como texto (FR-016).
- La búsqueda no los considera: `search_text` sigue construido con nombre, marca y descripción (FR-017).

## `product_image` (columnas nuevas)

| Columna | Tipo | Regla |
|---|---|---|
| `origin` | `text not null default 'subida'` | `subida` (la subió el administrador, tiene `r2_key`), `proyecto` (foto aportada por el proyecto), `externa` (foto de una fuente libre) o `tarjeta` (tarjeta gráfica de R Cube). `CHECK (origin in ('subida','proyecto','externa','tarjeta'))` |
| `credit_author` | `text not null default ''` | Autor de la foto externa |
| `credit_license` | `text not null default ''` | Nombre corto de la licencia (por ejemplo «CC BY-SA 4.0») |
| `credit_url` | `text not null default ''` | Enlace a la página de origen de la foto |

- `CHECK (origin <> 'externa' or (credit_author <> '' and credit_license <> '' and credit_url <> ''))`: una
  foto externa sin autor, licencia y enlace no puede existir (FR-021). La licencia admitida (CC0, dominio
  público, CC BY o CC BY-SA) la verifica una prueba sobre el manifiesto, porque listar valores en la base
  haría la migración frágil.
- Las fotos `proyecto`, `subida` y `tarjeta` dejan los tres campos de crédito vacíos.
- Migración de los datos existentes: `UPDATE product_image SET origin = 'proyecto' WHERE r2_key IS NULL`.
  Las filas con `r2_key` quedan en `subida` por el valor por defecto.
- Las demás columnas (`url`, `alt`, `position`, `r2_key`) no cambian. La foto principal sigue siendo la de
  `position` más baja; la subida del panel sigue sin enviar `origin` y toma `subida`.
- Las fotos de demostración usan `r2_key = null` y una ruta estática `/img/productos/galeria/<slug>-<n>.webp`.

## Reglas e invariantes

1. **Tope de fotos**: el máximo de 6 por producto de la feature 002 sigue valiendo para todas las
   `origin`. La demostración usa de 3 a 5 por producto para dejar sitio al administrador.
2. **Orden de la demostración**: la posición 0 es una foto que muestra un único equipo (FR-025) y, si hay
   tarjeta, es la de mayor posición (FR-027, clarificación 3).
3. **Variantes**: la foto propia de una variante (`product_variant.image_id`) apunta a una de las fotos de
   la galería de su producto (FR-032); no se crea una fila aparte.
4. **Fotos existentes**: los archivos de `public/img/productos/*.{jpg,png}` no se modifican ni se borran;
   los pedidos de demostración guardan su ruta en `order_item.image_url` (FR-031, RN-07). Las fotos nuevas
   van en `public/img/productos/galeria/`.
5. **Borrado**: eliminar una foto desde el panel borra su fila (y con ella su crédito); los archivos
   estáticos de demostración no se tocan, como en la feature 002.
6. **Datos de demostración**: los 37 productos activos tienen de 3 a 5 fotos, `tagline` y de 3 a 5
   `highlights`; el producto inactivo conserva su foto única y sus campos vacíos (supuesto de la spec).

## Manifiesto de la demostración (`src/db/gallery-data.ts`)

Datos versionados, no una tabla. Por cada producto (clave: su `slug`):

```text
{
  tagline: string,                 // ≤ 90 caracteres
  highlights: string[],            // 3 a 5 textos de ≤ 60 caracteres
  photos: [                        // 3 a 5, en el orden de la galería
    { file: "galeria/<slug>-1.webp", alt: string, origin: "proyecto" | "externa" | "tarjeta",
      source?: "<nombre del archivo original, en public/img/productos o en docs/fotos>",
      credit?: { author, license, url, title } }   // obligatorio si origin = "externa"
  ]
}
```

- El seed convierte cada entrada en una fila de `product_image` (`id = img-<slug>-<n>`, `position = n - 1`).
- Las pruebas unitarias garantizan la integridad del manifiesto (ver [research.md](research.md) R13).

## Entidades de la spec y su correspondencia

| Entidad de la spec | Dónde vive |
|---|---|
| Foto de producto | `product_image` (existente) |
| Crédito de foto | columnas `credit_*` y `origin` de `product_image` |
| Destacados del producto | columnas `tagline` y `highlights` de `product` |
| Entrada de auditoría | `audit_log` (existente), acción `producto_editado` con `before` y `after` |
