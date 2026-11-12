# Quickstart: validar la feature 001

## Requisitos previos
- Node 24 LTS (o superior), npm, Docker Desktop encendido.
- Copiar `.env.example` a `.env` y `.dev.vars` y completar los valores locales (la base de Docker no
  necesita secretos reales).

## Puesta en marcha
```powershell
npm install
docker compose up -d          # Postgres 16 en localhost:54329
npm run db:migrate            # aplica drizzle/*.sql a una base vacía
npm run db:seed               # datos de demostración (repetible)
npm run dev                   # web + API en http://localhost:5173
```

## Validación automática
```powershell
npm run check                 # tipos, lint, pruebas unitarias y de API
npm run test:e2e              # Playwright: compra completa y cambio de tema
```
Resultado esperado: todo en verde; cada prueba nombra su HU en el título.

## Recorrido manual (tema claro y oscuro)
| Paso | Resultado esperado | HU |
|---|---|---|
| Abrir `/` | Portada con Categorías, Ofertas, Más vendidos y Novedades | HU-06 |
| Ir a `/catalogo`, buscar «iphone» | «N resultados para "iphone"», 12 por página | HU-01, HU-02 |
| Filtrar Celulares + rango + disponibles, ordenar por precio, recargar | Mismos resultados; etiquetas removibles | HU-03, HU-04 |
| Abrir un producto con stock ≤ 5 y uno agotado | «Quedan N» / «Agotado» con botón deshabilitado | HU-05 |
| Agregar 2 productos, recargar el navegador | Carrito igual, contador y desglose IGV | HU-11, HU-12 |
| Registrarse con un correo nuevo | Sesión iniciada; el carrito sigue | HU-07, HU-12 |
| Checkout con delivery y tarjeta 4111 1111 1111 1111 | Pedido `RC-…` en Pagado, stock descontado | HU-14 a HU-16, HU-21 |
| Repetir con 4000 0000 0000 0002 | Rechazo, sin pedido, carrito intacto | HU-16 |
| Comprar con Yape (código 12345678), transferencia y WhatsApp | Pendiente de pago y aviso de 24 h; WhatsApp abre `wa.me` | HU-17, HU-18, HU-20 |
| «Mis pedidos», abrir uno y cancelarlo | Línea de tiempo; Cancelado con motivo; stock devuelto | HU-22 a HU-24 |
| Cambiar tema y recargar | Mantiene el tema, sin parpadeo | HU-25 |
| 5 contraseñas erróneas | Mensaje de bloqueo temporal | HU-08 |

Contratos: [contracts/api.md](contracts/api.md). Modelo: [data-model.md](data-model.md).
