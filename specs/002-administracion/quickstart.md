# Quickstart: validar la feature 002

Preparación igual que la 001 (`docker compose up -d`, `npm run db:migrate`, `npm run db:seed`,
`npm run dev`). Cuenta de administrador: `admin@rcube.pe` con `SEED_ADMIN_PASSWORD` de `.env`.

```powershell
npm run check        # incluye pruebas de API de /api/admin/*
npm run test:e2e     # incluye el recorrido del panel
```

| Paso | Resultado esperado | HU |
|---|---|---|
| Abrir `/admin` sin sesión | Ingreso del panel | HU-26 |
| Ingresar como cliente y abrir `/admin` | «No tienes permiso…» | HU-26 |
| Ingresar como administrador | Resumen con 5 tarjetas, gráfico de 30 días, ventas por categoría, top 5 y últimos pedidos | HU-27 |
| Productos: crear «Tablet de prueba» con 2 fotos, marcar la segunda como principal | Aparece en la tienda con esa foto | HU-28, HU-31 |
| Subir un PDF o una imagen de 3 MB | Rechazo claro | HU-31 |
| Editar el precio y desactivar el producto | Precio nuevo en la tienda; luego desaparece; auditoría registra el precio | HU-28, HU-29, HU-42 |
| Stock: +5 «Llegada», −99 | Historial con +5; el −99 se rechaza | HU-33 |
| Categorías: desactivar «Tablets» | Aviso con el número de productos y confirmación | HU-32 |
| Pedidos: filtrar Pagado, pasar uno a Preparando y Enviado | Línea de tiempo con autor y hora | HU-34, HU-35 |
| Exportar CSV con filtros | Archivo con tildes correctas y solo esos pedidos | HU-37 |
| Pagos por confirmar: confirmar uno y rechazar otro | Pagado; Cancelado con motivo y stock devuelto | HU-36 |
| Clientes: bloquear a Mateo e intentar ingresar como él | «Tu cuenta está bloqueada…» | HU-38 a HU-40 |
| Configuración: cambiar WhatsApp y costo de una zona, desactivar transferencia | El checkout refleja los cambios | HU-41 |
| Auditoría | Todas las acciones anteriores con autor y fecha | HU-42 |
| Repetir en tema oscuro | Contraste AA | HU-25 |
