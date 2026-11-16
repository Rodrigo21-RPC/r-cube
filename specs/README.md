# Estado del producto R Cube

| Feature | Historias | Estado |
|---|---|---|
| 001 Tienda y compra | HU-01 a HU-25 (HU-19 retirada) | Cerrada: fusionada en `main` |
| 002 Administración | HU-26 a HU-42 | Cerrada: fusionada en `main` |
| 003 Experiencia avanzada | HU-43 a HU-53 | Cerrada: fusionada en `main` |
| 004 Galería y destacados | HU-54 a HU-60 | Cerrada: fusionada en `main` |

## Feature 001

- Artefactos: `specs/001-tienda-compra/` (spec, plan, research, data-model, contrato, quickstart, tasks).
- Pruebas: 119 unitarias y de API (`npm run check`) y e2e de catálogo, tema y compra (`npm run test:e2e`).
- Decisiones tomadas durante la implementación: ver `research.md` (R2, R2b) y `data-model.md`
  (`cart_item.seen_price_cents`).

## Feature 002

- Artefactos: `specs/002-administracion/` (spec con clarificaciones, plan, research, data-model,
  contrato de la API de administración, quickstart y tasks).
- Panel en `/admin` protegido por rol: resumen, productos con fotos en R2, categorías y marcas, stock
  con historial, pedidos con transiciones válidas, pagos por confirmar, clientes (con bloqueo),
  configuración de la tienda, exportación a CSV y auditoría de solo lectura.
- Pruebas: `tests/api/admin/` (API) y `e2e/admin.spec.ts` (recorrido del panel); las páginas del panel
  también pasan accesibilidad AA en tema claro y oscuro (`e2e/accesibilidad.spec.ts`).
- Las pruebas e2e del panel leen `SEED_ADMIN_PASSWORD` de `.env` (en CI, del entorno).

## Feature 003

- Artefactos: `specs/003-experiencia-avanzada/` (spec con 5 clarificaciones, plan, research R1 a R14,
  data-model, contrato de la API, quickstart y tasks de 66 tareas).
- Variantes (HU-43, HU-44), favoritos (HU-45), reseñas y su moderación (HU-46, HU-47), varias direcciones
  (HU-48), cupones del cliente y su administración (HU-49, HU-50), productos relacionados (HU-51),
  comprobante imprimible (HU-52) y avisos dentro de la app (HU-53).
- Decisión de diseño: el producto conserva su precio y stock como resumen derivado de las variantes
  (`research.md` R1); el canje de cupones y el descuento de stock son `UPDATE` condicionales dentro de la
  transacción del pedido.
- Los datos de demostración incluyen 2 reseñas (una oculta): los 8 pedidos de la 001 son fijos y solo hay 3
  productos entregados.

## Feature 004

- Artefactos: `specs/004-galeria-destacados/` (spec con clarificaciones, plan, research, data-model,
  contrato de la API, quickstart y tasks de 73 tareas).
- Galería de hasta 8 fotos por producto con carrusel, miniaturas y vista ampliada (HU-54, HU-55), frase y
  destacados bajo el nombre (HU-56) editables desde el panel con auditoría (HU-57), créditos públicos de las
  fotos externas (HU-58), contacto por WhatsApp desde la tienda (HU-59) y desde el panel hacia el cliente
  (HU-60).
- Decisiones de diseño: las fotos de demostración son de Wikimedia Commons (CC0, dominio público, CC BY o
  CC BY-SA) más 3 tarjetas gráficas de R Cube por producto; cuando no hay foto libre del modelo exacto se usa
  una de la misma familia y el texto alternativo lo aclara. WhatsApp se resuelve solo con enlaces `wa.me`.
- Scripts de desarrollo para las fotos: `npm run fotos:buscar`, `fotos:agregar`, `fotos:preparar` y
  `fotos:tarjetas` (`scripts/fotos/`).
- Riesgo declarado: las fotos originales del proyecto (`docs/fotos`) no tienen autor registrado y se agrupan
  en «Fotos aportadas por el proyecto».
- Revisión visual y de las fotos principales (T068, T071): se corrigieron la tira de miniaturas que ensanchaba
  la página a 320 px, el botón flotante de WhatsApp que tapaba parte de «Consultar por WhatsApp» en
  escritorio (ahora es un círculo con el icono), la pista del carrusel que no se podía enfocar con el teclado
  y las fotos principales del kit de herramientas y del Surface Laptop 5. Pendiente, sin cambio de
  alcance: las fotos principales de Dell Inspiron 15 (solo el teclado), Xiaomi 13T Pro (recortada) y Sony
  Xperia Z5 (dos unidades) son las mejores con licencia libre que se encontraron; conviene reemplazarlas si el
  administrador sube fotos propias.
