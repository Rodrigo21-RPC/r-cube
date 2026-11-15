---
description: "Lista de tareas de la feature 002 Administración"
---

# Tasks: Administración (R Cube)

**Input**: Documentos de diseño en `specs/002-administracion/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/admin-api.md, quickstart.md

**Tests**: Obligatorias por la constitución (principio VI). En cada historia la prueba va primero y
debe fallar antes de implementar. Cada título de prueba empieza con su HU.

**Organization**: Por historia de la spec (US1 a US9). Cada tarea nombra la HU, RN, RNF o FR que cubre.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Mismo paquete que la 001: `src/shared`, `src/db`, `src/worker`, `src/web`, `tests/unit`, `tests/api`,
`e2e`, `drizzle`.

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Agregar a `src/db/schema.ts` la tabla `stock_movement` (`delta` ≠ 0, `stock_before` ≥ 0,
  `stock_after` ≥ 0, `source` `inicial|ajuste|venta|cancelacion`, `order_id` null, `reason` null,
  `actor_type`, `actor_user_id` null, índice `(product_id, created_at desc)`), la tabla `audit_log`
  (`action`, `entity_type`, `entity_id`, `entity_label`, `detail`, `data` jsonb, índices
  `(created_at desc)` y `(action, created_at desc)`) y la columna `product_image.r2_key` text null, según
  data-model.md (FR-011, HU-31, HU-42)
- [X] T002 Generar la migración `drizzle/0002_*` con `npm run db:generate` y aplicarla a la base de Docker
  con `npm run db:migrate` (RNF-07, RNF-10)
- [X] T003 [P] Crear `src/shared/admin-types.ts` con los tipos de respuesta de contracts/admin-api.md
  (`AdminSummary`, `AdminProductRow`, `AdminProduct`, `StockMovementDto`, `AdminOrderRow`,
  `AdminOrderDetail`, `PendingPayment`, `CustomerRow`, `CustomerDetail`, `AdminSettings`, `AuditRow`)
  (HU-26 a HU-42)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: ninguna historia empieza antes de terminar esta fase

- [X] T004 [P] Escribir `tests/api/admin/access.test.ts` (HU-26, FR-002): `GET /api/admin/summary` sin
  sesión → 401, con cliente → 403 sin datos, con administrador → 200; debe fallar
- [X] T005 [P] Escribir `tests/api/admin/stock-service.test.ts` (HU-33, FR-011 a FR-013):
  `applyStockChange` registra stock anterior y nuevo y rechaza dejar stock negativo sin cambiar nada; una
  compra de la 001 registra un movimiento `venta` por línea con el N.º de pedido y una cancelación uno
  `cancelacion`; la suma de movimientos de un producto coincide con su stock; debe fallar
- [X] T006 [P] Escribir `tests/api/admin/audit-service.test.ts` (HU-42): `audit()` dentro de una
  transacción revertida no deja registro; dentro de una confirmada sí, con autor, tipo, objeto y detalle;
  debe fallar
- [X] T007 Agregar `requireAdmin` (401/403) a `src/worker/middleware.ts` y crear
  `src/worker/routes/admin/index.ts` con el sub-router `/api/admin` protegido y montarlo en
  `src/worker/index.ts` hasta pasar T004 (HU-26, FR-002)
- [X] T008 Implementar `src/worker/services/stock.ts` (`applyStockChange(tx, { productId, delta, source,
  orderId?, reason?, actor })` con UPDATE condicional `stock + delta >= 0` e INSERT del movimiento en la
  misma transacción) y usarlo en `createOrder` y `cancelOrder` de `src/worker/services/orders.ts` hasta
  pasar T005 (HU-33, FR-012, FR-013, RN-02, RN-10)
- [X] T009 Implementar `src/worker/services/audit.ts` (`audit(tx, actorId, { action, entityType,
  entityId, entityLabel, detail, before?, after? })`) hasta pasar T006 (HU-42, FR-025)
- [X] T010 Actualizar `src/db/seed-data.ts`: movimiento `inicial` por producto y movimientos `venta` y
  `cancelacion` coherentes con los 8 pedidos, de modo que la suma de movimientos sea el stock actual, y
  ampliar `tests/api/seed.test.ts` con esa comprobación (FR-028)
- [X] T011 [P] Agregar a `tests/api/helpers.ts` `signInAdmin()` (crea un administrador y devuelve su
  cookie), el reinicio de `stock_movement` y `audit_log`, y el borrado de objetos de R2 entre pruebas
  (RNF-08)
- [X] T012 Crear `src/web/admin/AdminLayout.tsx` (menú lateral con Resumen, Productos, Categorías y
  marcas, Pedidos, Pagos por confirmar, Clientes, Configuración y Auditoría; interruptor de tema; cerrar
  sesión; pantalla de ingreso del panel si no hay sesión y «No tienes permiso para entrar al panel» si es
  cliente), las rutas `/admin/*` con carga diferida en `src/web/router.tsx` y
  `src/web/admin/pages/Login.tsx` (HU-26, FR-001, HU-25)
- [X] T013 [P] Crear `src/web/admin/components/` con `DataTable.tsx` (tabla accesible con encabezados),
  `Pagination.tsx` y `ConfirmDialog.tsx` reutilizables (RNF-02, RNF-03)
- [X] T014 Agregar el enlace «Panel» en `src/web/components/Header.tsx` solo para administradores
  (HU-26, FR-001)

**Checkpoint**: panel protegido y servicios de stock y auditoría listos

---

## Phase 3: User Story 1 - Acceso al panel y resumen (Priority: P1) 🎯 MVP

**Goal**: resumen con indicadores, gráfico y listas (HU-26, HU-27)

**Independent Test**: ingresar como administrador y ver las 5 tarjetas, el gráfico de 30 días, ventas por
categoría, top 5 y últimos pedidos

- [X] T015 [US1] Escribir `tests/api/admin/summary.test.ts` (HU-27, FR-003, FR-004): tarjetas con valores
  exactos para pedidos de hoy y de ayer en hora de Lima (excluye Pendiente de pago y Cancelado), pedidos
  por preparar (Pagado y Preparando), pagos por confirmar, clientes, stock bajo (activos con stock ≤ 5);
  `salesByDay` con 30 días completos (días sin ventas en 0); ventas por categoría; top 5 por unidades;
  últimos 5 pedidos; con el Worker ya iniciado, la respuesta llega en menos de 2 s con los datos de
  demostración (SC-004); debe fallar
- [X] T016 [US1] Implementar `GET /api/admin/summary` en `src/worker/routes/admin/summary.ts` hasta pasar
  T015 (HU-27)
- [X] T017 [US1] Crear `src/web/admin/components/SalesChart.tsx` (barras SVG de 30 días con eje, valores
  en S/ y tabla oculta para lectores de pantalla, colores desde los tokens de tema) (HU-27, RNF-03)
- [X] T018 [US1] Crear `src/web/admin/pages/Summary.tsx` con las 5 tarjetas, el gráfico, ventas por
  categoría, top 5 y últimos pedidos con enlace al detalle, y estados de carga y error (HU-27)

---

## Phase 4: User Story 2 - Productos, categorías y marcas (Priority: P1)

**Goal**: CRUD de productos y taxonomía con activación (HU-28, HU-29, HU-30, HU-32)

**Independent Test**: crear un producto, editar su precio, desactivarlo y ver el efecto en la tienda

- [X] T019 [P] [US2] Escribir `tests/api/admin/products.test.ts` (HU-28 a HU-30): crear con validaciones
  (precio > 0, precio anterior > precio, nombre obligatorio, marca y categoría existentes, stock ≥ 0) y
  movimiento `inicial`; editar sin cambiar stock; cambio de precio con auditoría `precio_cambiado`
  (antes y después); desactivar oculta en `/api/catalog/*` y conserva pedidos; lista con búsqueda,
  categoría, estado, stock bajo y páginas de 20; debe fallar
- [X] T020 [P] [US2] Escribir `tests/api/admin/taxonomy.test.ts` (HU-32): crear, renombrar, nombre
  duplicado → 409; desactivar con productos activos sin `confirm` → 409 `HAS_ACTIVE_PRODUCTS` con
  `count`; con `confirm` se desactiva y la tienda deja de mostrarla; un producto de una categoría o marca
  desactivada aparece como no disponible en `/api/cart/quote` y el checkout lo rechaza (Edge Cases);
  auditoría; debe fallar
- [X] T021 [US2] Implementar `src/worker/routes/admin/products.ts` (`GET /products`, `GET /products/:id`,
  `POST /products`, `PATCH /products/:id`, `PATCH /products/:id/status`) con Zod y auditoría hasta pasar
  T019 (HU-28 a HU-30)
- [X] T022 [US2] Implementar `src/worker/routes/admin/taxonomy.ts` (`/categories` y `/brands`) y hacer que
  `quoteCart` en `src/worker/services/pricing.ts` trate como no disponibles los productos de una categoría
  o marca desactivada, hasta pasar T020 (HU-32, HU-13)
- [X] T023 [US2] Crear `src/web/admin/pages/Products.tsx` (búsqueda, filtros, tabla con foto, precio,
  stock y estado, paginación, activar o desactivar) (HU-29, HU-30)
- [X] T024 [US2] Crear `src/web/admin/pages/ProductForm.tsx` (crear y editar con React Hook Form y Zod,
  specs como filas que se agregan y quitan, errores por campo; el stock solo se pide al crear) (HU-28,
  FR-006)
- [X] T025 [US2] Crear `src/web/admin/pages/Taxonomy.tsx` (categorías y marcas: crear, renombrar,
  activar o desactivar con el aviso de productos afectados) (HU-32)

---

## Phase 5: User Story 3 - Fotos de productos (Priority: P1)

**Goal**: subir, ordenar, elegir principal y borrar fotos en R2 (HU-31)

**Independent Test**: subir 2 fotos, marcar la segunda como principal y verla primero en la tienda

- [X] T026 [P] [US3] Escribir `tests/unit/image-type.test.ts` (HU-31): detecta JPG, PNG y WebP por sus
  bytes iniciales y rechaza un PDF o un texto con extensión `.jpg`; debe fallar
- [X] T027 [P] [US3] Escribir `tests/api/admin/images.test.ts` (HU-31): subir JPG válido → 201 con URL
  `/api/media/…` servible; > 2 MB o tipo inválido → 400 `INVALID_IMAGE`; séptima foto → 409
  `MAX_IMAGES`; mover, marcar principal y editar alt cambian el orden que ve `/api/catalog/products/:slug`;
  borrar elimina el objeto de R2 y la siguiente pasa a principal; borrar una foto de demostración no toca
  archivos estáticos; auditoría `foto`; debe fallar
- [X] T028 [US3] Implementar `src/shared/image-type.ts` hasta pasar T026 (HU-31)
- [X] T029 [US3] Implementar `src/worker/services/images.ts` y las rutas de fotos en
  `src/worker/routes/admin/products.ts`, y `GET /api/media/*` en `src/worker/routes/media.ts` (caché
  larga, 404 si no existe) hasta pasar T027 (HU-31)
- [X] T030 [US3] Agregar la galería a `src/web/admin/pages/ProductForm.tsx` (subir con validación previa
  de tipo y tamaño, botones «Subir», «Bajar», «Principal», editar alt y borrar con confirmación) (HU-31,
  RNF-03)

---

## Phase 6: User Story 4 - Stock con historial (Priority: P1)

**Goal**: ajustes con motivo e historial completo (HU-33)

**Independent Test**: +5 y −2 con motivo, ver el historial; −99 se rechaza

- [X] T031 [US4] Escribir `tests/api/admin/stock.test.ts` (HU-33): ajuste con `delta` ≠ 0 y motivo de 3 a
  200 caracteres; stock negativo → 409 `NEGATIVE_STOCK` sin cambios; historial paginado con ajustes,
  ventas y cancelaciones (N.º de pedido) del más nuevo al más antiguo; auditoría `stock_ajustado`; debe
  fallar
- [X] T032 [US4] Implementar `src/worker/routes/admin/stock.ts` (`GET /products/:id/stock-movements`,
  `POST /products/:id/stock-adjustments`) hasta pasar T031 (HU-33)
- [X] T033 [US4] Agregar a `src/web/admin/pages/ProductForm.tsx` la sección «Stock» con el formulario de
  ajuste y la tabla del historial (HU-33)

---

## Phase 7: User Story 5 - Pedidos (Priority: P1)

**Goal**: lista, detalle, cambio de estado y CSV (HU-34, HU-35, HU-37)

**Independent Test**: filtrar Pagados, pasar uno a Preparando y Enviado, exportar CSV

- [X] T034 [P] [US5] Escribir `tests/unit/csv.test.ts` (HU-37): BOM inicial, separador coma, comillas
  dobles para campos con coma, comillas o saltos de línea, tildes intactas, y celdas que empiezan con
  `=`, `+`, `-` o `@` precedidas por `'` para evitar inyección de fórmulas (RNF-05); debe fallar
- [X] T035 [P] [US5] Escribir `tests/api/admin/orders.test.ts` (HU-34, HU-35, HU-37, FR-017): filtros por
  estado, método, rango de fechas y texto (N.º, nombre, correo) con páginas de 20; detalle con cliente y
  `allowedTransitions` (recojo: Preparando → Entregado; delivery: Preparando → Enviado); transición
  válida registra evento con actor `administrador`; inválida → 409 `INVALID_TRANSITION`; `expectedStatus`
  desactualizado → 409 `STATE_CHANGED`; cancelar exige motivo y devuelve stock; Pendiente de pago →
  Pagado por esta ruta → 409; CSV con filtros, columnas pedidas y 422 `TOO_MANY_ROWS` por encima de
  10 000; auditoría `pedido_estado`; debe fallar
- [X] T036 [US5] Implementar `src/shared/csv.ts` hasta pasar T034 (HU-37)
- [X] T037 [US5] Implementar `src/worker/routes/admin/orders.ts` (`GET /orders`, `GET
  /orders/export.csv`, `GET /orders/:number`, `POST /orders/:number/status`) reutilizando
  `loadOrderDetail`, `cancelOrder` y `canTransition` hasta pasar T035 (HU-34, HU-35, HU-37)
- [X] T038 [US5] Crear `src/web/admin/pages/Orders.tsx` (filtros sincronizados con la URL, tabla,
  paginación y botón «Exportar CSV» con los filtros activos) (HU-34, HU-37)
- [X] T039 [US5] Crear `src/web/admin/pages/OrderDetail.tsx` (cliente, productos, desglose, pago, entrega,
  línea de tiempo y cambio de estado solo con las transiciones permitidas, motivo al cancelar, aviso si
  el estado cambió) (HU-35)

---

## Phase 8: User Story 6 - Confirmar o rechazar pagos (Priority: P1)

**Goal**: lista de pagos pendientes con confirmación y rechazo (HU-36)

**Independent Test**: confirmar un pago Yape pendiente y rechazar otro con motivo

- [ ] T040 [US6] Escribir `tests/api/admin/payments.test.ts` (HU-36, RN-12, RN-13): lista de Pendiente de
  pago del más antiguo al más nuevo con código de operación y `expiresAt` = creación + 24 h; confirmar →
  Pagado y pago `confirmed` con evento del administrador; rechazar exige motivo → Cancelado, pago
  `rejected` y stock devuelto; confirmar un pedido ya cancelado → 409 `STATE_CHANGED`; auditoría
  `pago_confirmado` y `pago_rechazado`; debe fallar
- [ ] T041 [US6] Implementar `src/worker/routes/admin/payments.ts` (`GET /payments/pending`, `POST
  /orders/:number/payment/confirm`, `POST /orders/:number/payment/reject`) hasta pasar T040 (HU-36)
- [ ] T042 [US6] Crear `src/web/admin/pages/Payments.tsx` (lista con antigüedad y tiempo restante,
  confirmar y rechazar con motivo) y agregar los mismos botones al detalle en
  `src/web/admin/pages/OrderDetail.tsx` cuando el pedido está pendiente (HU-36, FR-019)

---

## Phase 9: User Story 8 - Configurar la tienda (Priority: P1)

**Goal**: WhatsApp, datos de pago, métodos activos y zonas (HU-41)

**Independent Test**: cambiar WhatsApp, costo de una zona y desactivar transferencia; verlo en el checkout

- [ ] T043 [US8] Escribir `tests/api/admin/settings.test.ts` (HU-41): validaciones (WhatsApp `^51\d{9}$`,
  Yape y Plin `^9\d{8}$`, CCI `^\d{20}$`, al menos un método activo, costo ≥ 0); cambios visibles en
  `/api/checkout/options`; zona nueva, editada y desactivada; pedido anterior conserva su costo de envío;
  auditoría `configuracion` y `zona` con antes y después; debe fallar
- [ ] T044 [US8] Implementar `src/worker/routes/admin/settings.ts` (`GET /settings`, `PATCH /settings`,
  `POST /zones`, `PATCH /zones/:id`) hasta pasar T043 (HU-41)
- [ ] T045 [US8] Crear `src/web/admin/pages/Settings.tsx` (formulario de contacto y pagos, métodos activos
  con casillas y tabla de zonas editable) (HU-41)

---

## Phase 10: User Story 7 - Clientes (Priority: P2)

**Goal**: lista, detalle y bloqueo (HU-38 a HU-40)

**Independent Test**: buscar «mateo», bloquearlo, comprobar que no ingresa, reactivarlo

- [ ] T046 [US7] Escribir `tests/api/admin/customers.test.ts` (HU-38 a HU-40, RN-08): búsqueda por
  nombre y correo con páginas de 20, N.º de pedidos y total gastado sin pendientes ni cancelados; detalle
  con historial; bloquear borra sus sesiones (su cookie deja de valer) e impide ingresar y comprar;
  reactivar permite ingresar; bloquear a un administrador → 403; auditoría `cliente_bloqueado` y
  `cliente_reactivado`; debe fallar
- [ ] T047 [US7] Implementar `src/worker/routes/admin/customers.ts` hasta pasar T046 (HU-38 a HU-40)
- [ ] T048 [US7] Crear `src/web/admin/pages/Customers.tsx` y `src/web/admin/pages/CustomerDetail.tsx`
  (búsqueda, tabla, detalle con pedidos y botón bloquear o reactivar con confirmación) (HU-38 a HU-40)

---

## Phase 11: User Story 9 - Auditoría (Priority: P2)

**Goal**: consulta de acciones del panel (HU-42)

**Independent Test**: cambiar precio, stock, un pago y la configuración, y verlos en la auditoría

- [ ] T049 [US9] Escribir `tests/api/admin/audit.test.ts` (HU-42, SC-006): tras cambiar precio, stock,
  estado de pedido, confirmar un pago, bloquear un cliente y cambiar la configuración, `GET /audit` los
  lista del más nuevo al más antiguo con autor, tipo, objeto y detalle; filtro por `action`; páginas de
  30; no existen rutas de escritura (PUT/PATCH/DELETE → 404); debe fallar
- [ ] T050 [US9] Implementar `GET /audit` en `src/worker/routes/admin/audit.ts` hasta pasar T049 (HU-42)
- [ ] T051 [US9] Crear `src/web/admin/pages/Audit.tsx` (tabla con filtro por tipo y paginación) (HU-42)

---

## Phase 12: Polish & Cross-Cutting Concerns

- [ ] T052 Escribir `e2e/admin.spec.ts` (HU-26 a HU-42): cliente ve «sin permiso»; administrador ve el
  resumen, crea un producto con foto, ajusta stock, pasa un pedido a Preparando, confirma un pago, bloquea
  y reactiva un cliente, cambia la configuración y ve todo en la auditoría
- [ ] T053 Agregar las páginas del panel (resumen, productos, formulario, pedidos, detalle, pagos,
  clientes, configuración, auditoría) a `e2e/accesibilidad.spec.ts` en ambos temas (RNF-03, SC-007)
- [ ] T054 [P] Actualizar `DESPLIEGUE.md`: el bucket R2 `r-cube-fotos` es ahora obligatorio (fotos
  subidas), las fotos se sirven por `/api/media/*`, cómo comprobar una subida y que el seed crea el
  historial de stock (RNF-10)
- [ ] T055 [P] Actualizar `specs/README.md` y `README.md` con el panel de administración (RNF-09)
- [ ] T056 Revisión de seguridad del diff de la 002: autorización en cada ruta de `/api/admin/*`,
  validación de subidas, CSV sin inyección de fórmulas (anteponer `'` a celdas que empiezan con `=`, `+`,
  `-` o `@`), sin datos sensibles en la auditoría (RNF-05)
- [ ] T057 Ejecutar `npm run check` y `npm run test:e2e`, recorrer quickstart.md en tema claro y oscuro y
  corregir contra la spec (SC-007)

---

## Dependencies & Execution Order

- Setup (1) → Foundational (2) → historias → Polish (12).
- US1, US2, US5, US6, US8 y US7 dependen solo de Foundational; US3 y US4 de US2 (formulario de producto);
  US9 de todas las que auditan (se hace al final para verificar el conjunto).
- Dentro de cada historia: prueba (debe fallar) → servicio o ruta → página.

### Parallel Opportunities

- Foundational: T004, T005, T006 y T011; T013 en paralelo con T012.
- US2: T019 y T020. US3: T026 y T027. US5: T034 y T035.

## Implementation Strategy

MVP: Foundational + US1 (panel protegido con resumen). Luego US2 → US3 → US4 → US5 → US6 → US8 → US7 →
US9 → Polish, con commit al cerrar cada fase.

## Notes

- 57 tareas. Cada prueba falla antes de implementar (principio VI).
- Toda acción del panel que cambia datos escribe auditoría en la misma transacción (FR-025).
