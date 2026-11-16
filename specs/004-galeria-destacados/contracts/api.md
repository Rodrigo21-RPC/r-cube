# Contrato de la API de la feature 004

Todas las rutas son JSON bajo `/api`. Errores con la forma de las features anteriores:
`{ error: { code, message, fields?, ...extra } }`. Autorización: **P** pública, **A** administrador (401
`UNAUTHENTICATED` sin sesión, 403 `FORBIDDEN` con otro rol, sin datos). Toda acción del panel que cambia
datos escribe la auditoría en la misma transacción. Esta feature no cambia las rutas de carrito, checkout,
pedidos, favoritos ni las de fotos del panel (`/admin/products/:id/images…`).

## Catálogo (HU-54, HU-56, HU-58, HU-59)

- **P** `GET /catalog/products/:slug` → `ProductDetail` agrega:
  - `tagline: string` (frase corta; `""` si no tiene).
  - `highlights: string[]` (0 a 5 destacados; `[]` si no tiene).
  - `images` **no cambia**: `{ url, alt }[]` en el orden de la galería (la primera es la principal); sin
    fotos devuelve la imagen genérica, como hoy.
- **P** `GET /catalog/photo-credits` → `PhotoCredits`:

  ```text
  {
    external: [{ productName, productSlug, imageUrl, alt, author, license, licenseUrl|null, sourceUrl }],
    project:  [{ productName, productSlug }]
  }
  ```

  - `external`: fotos con `origin = 'externa'`, de productos activos, ordenadas por nombre de producto y por
    posición. `licenseUrl` es el enlace de la licencia cuando existe (por ejemplo CC BY-SA 4.0); `null` en
    dominio público.
  - `project`: un elemento por producto activo que tiene al menos una foto con `origin = 'proyecto'`,
    ordenados por nombre (se muestran juntos como «Fotos aportadas por el proyecto»).
  - Las fotos con `origin = 'subida'` o `'tarjeta'` no aparecen. Sin créditos devuelve
    `{ external: [], project: [] }` con 200.
- **P** `GET /catalog/contact` → `{ name: string, whatsappNumber: string }` (HU-59, FR-039): el nombre y el
  número de WhatsApp de la tienda tomados de `store_settings`, el número solo con dígitos y `""` si no está
  configurado. No devuelve ningún otro dato de la configuración (ni métodos de pago ni cuentas).
- Sin cambios en `GET /catalog/products`, `/catalog/home` ni `/catalog/products/:slug/related`: las tarjetas
  siguen mostrando solo la foto principal (`imageUrl`).

## Administración (A) bajo `/api/admin`

- **A** `GET /products/:id` → `AdminProduct` agrega `tagline: string` y `highlights: string[]`.
- **A** `POST /products` y `PATCH /products/:id` (cuerpo de la feature 002) agregan, ambos opcionales:
  - `tagline: string`: se recorta; hasta 90 caracteres; por defecto `""`.
  - `highlights: string[]`: se recortan, se descartan los vacíos y quedan hasta 5 de hasta 60 caracteres
    cada uno; por defecto `[]`.
  - Respuesta: `AdminProduct` completo (201 al crear).
  - Si el cuerpo no trae estos campos: `POST` deja la frase y los destacados vacíos, y `PATCH` conserva los
    valores actuales (el formulario del panel siempre los envía, así que quitarlos desde allí sí los
    vacía).
  - Auditoría (acción `producto_editado`, misma transacción): si cambió la frase o los destacados, entrada
    «Frase y destacados de X actualizados» con `before` y `after` (`{ tagline, highlights }`). Si ese es el
    único cambio reemplaza a la entrada genérica «Datos de X actualizados»; si cambió también el precio se
    registran las dos entradas (`precio_cambiado` y `producto_editado`).
- `POST /products/:id/images` (HU-31, FR-033): el tope pasa de 6 a 8 fotos por producto; al superarlo
  responde 409 `MAX_IMAGES` «Máximo 8 fotos por producto». Una foto subida entra con `origin = 'subida'` y
  sin crédito; la validación de tipo y peso y las demás rutas de fotos son las de la 002.
- Sin cambios de ruta para HU-60: `GET /orders/:number` del panel ya devuelve `customer.phone` y `GET
  /customers/:id` devuelve `phone`; el enlace `wa.me` se arma en el navegador.

## Errores de validación (400 `VALIDATION`, `fields` por campo)

| Campo (`fields`) | Mensaje | Cuándo |
|---|---|---|
| `tagline` | La frase no puede pasar de 90 caracteres | más de 90 caracteres tras recortar |
| `highlights` | Máximo 5 destacados | más de 5 textos tras descartar vacíos |
| `highlights.N` | Cada destacado admite hasta 60 caracteres | el texto en la posición `N` (desde 0) pasa de 60 |

Nada se guarda cuando hay un error. Las rutas de administración responden 401 sin sesión y 403 a un
cliente, sin cambiar datos (FR-020).

## Rutas de la SPA nuevas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/creditos-fotos` | Créditos de las fotos (HU-58), enlazada desde el pie de página | pública |

El detalle `/producto/:slug` (HU-54 a HU-56) y el formulario del panel `/admin/productos/:id` (HU-57) ganan
la galería, la vista ampliada, los destacados y los campos de frase y destacados.
