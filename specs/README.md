# Estado del producto R Cube

| Feature | Historias | Estado |
|---|---|---|
| 001 Tienda y compra | HU-01 a HU-25 (HU-19 retirada) | Cerrada: fusionada en `main` |
| 002 Administración | HU-26 a HU-42 | Cerrada: fusionada en `main` |
| 003 Experiencia avanzada | HU-43 a HU-53 | En implementación (rama `003-experiencia-avanzada`) |

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
