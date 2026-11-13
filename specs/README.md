# Estado del producto R Cube

| Feature | Historias | Estado |
|---|---|---|
| 001 Tienda y compra | HU-01 a HU-25 (HU-19 retirada) | Implementada en la rama `001-tienda-compra`; en verificación final |
| 002 Administración | HU-26 a HU-42 | Pendiente |
| 003 Experiencia avanzada | HU-43 a HU-53 | Pendiente |

## Feature 001

- Artefactos: `specs/001-tienda-compra/` (spec, plan, research, data-model, contrato, quickstart, tasks).
- Pruebas: 119 unitarias y de API (`npm run check`) y e2e de catálogo, tema y compra (`npm run test:e2e`).
- Decisiones tomadas durante la implementación: ver `research.md` (R2, R2b) y `data-model.md`
  (`cart_item.seen_price_cents`).
