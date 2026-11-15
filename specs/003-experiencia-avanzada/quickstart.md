# Quickstart: validar la feature 003

Recorrido para comprobar las historias HU-43 a HU-53 usando solo la app, con los datos de demostración.
Cada paso se puede repetir en tema claro y oscuro (interruptor del encabezado).

## Preparación

```
docker compose up -d          # PostgreSQL local (puerto 54329)
npm install
npm run db:migrate            # aplica 0003_experiencia_avanzada.sql
npm run db:seed               # variantes, reseñas, favoritos, direcciones, cupones y avisos de demostración
npm run dev                   # http://localhost:5173
```

Cuentas (contraseñas en `.env`): administrador `admin@rcube.pe`; clientes `mateo@demo.pe`,
`lucia@demo.pe`, `diego@demo.pe`, `valeria@demo.pe` y `andres@demo.pe`. Cupones de demostración:
`BIENVENIDO10` (10 %, vigente, 50 usos), `VERANO5` (S/ 5.00, vencido) y `ULTIMO` (10 %, agotado).

## Recorrido por historia

| HU | Pasos | Resultado esperado |
|---|---|---|
| HU-43 | Panel → Productos → un celular → sección «Variantes» → agregar 3 variantes con SKU, precio y stock | Lista del panel con rango de precios y stock total; SKU repetido → «Ese SKU ya existe»; variante vendida no se borra, se desactiva |
| HU-44 | Tienda → ese celular → elegir una variante → agregar al carrito → pagar con la tarjeta `4111 1111 1111 1111` | Precio, foto y «Quedan N» cambian al elegir; sin variante elegida → «Elige color, almacenamiento o RAM»; el pedido muestra variante, SKU y precio de ese momento |
| HU-45 | Como cliente, tocar el corazón de 3 productos → «Mis favoritos» → pasar uno al carrito | La lista persiste al recargar; un favorito con variantes lleva al detalle; uno agotado muestra «Agotado» sin botón |
| HU-46 | Como cliente con un pedido Entregado (por ejemplo `diego@demo.pe`) → ese producto → «Calificar este producto» → 4 estrellas y comentario | La reseña aparece con «Diego R.»; promedio y cantidad suben; un segundo intento no es posible; sin pedido Entregado no aparece el formulario |
| HU-47 | Panel → Reseñas → ocultar una reseña | Desaparece del detalle y del promedio; «Mostrar» la devuelve; ambas acciones en Auditoría |
| HU-48 | Cuenta → Mis direcciones → crear «Casa» y «Trabajo», marcar «Trabajo» como predeterminada → checkout con delivery | El checkout trae «Trabajo» elegida; se puede elegir «Casa» u «Otra dirección»; el pedido conserva la dirección aunque se edite después |
| HU-49 | Carrito → escribir `BIENVENIDO10` → pagar; luego probar `VERANO5`, `ULTIMO` y `NOEXISTE` | Desglose con «Cupón BIENVENIDO10» en negativo; total = productos + envío − descuento y base + IGV = total; los demás muestran «El cupón venció», «El cupón ya no tiene usos» y «El cupón no existe» |
| HU-50 | Panel → Cupones → crear `PRUEBA15` (15 %, 30 días, 5 usos) → desactivar y activar | Aparece en la lista con usos 0 de 5; código repetido → «Ese código ya existe»; un cupón usado no se borra; cancelar el pedido que lo usó devuelve el uso |
| HU-51 | Abrir un celular | «Productos relacionados» con hasta 4 celulares disponibles distintos del actual |
| HU-52 | Mis pedidos → un pedido → «Ver comprobante» → «Imprimir» (vista previa) | Datos de la tienda, cliente, productos con variante, cupón, envío, total, base imponible e IGV; sin encabezado ni botones; cabe en una hoja A4; la leyenda «no es factura electrónica» |
| HU-53 | Como administrador, pasar el pedido de `mateo@demo.pe` a Enviado; como Mateo, mirar la campana | El contador sube como máximo en 1 minuto sin recargar; el aviso lleva al pedido y queda leído; «Marcar todos como leídos» limpia el contador |

## Comprobaciones transversales

- **Accesibilidad**: estrellas con flechas del teclado, corazón con `aria-pressed`, selector de variante
  con teclado, campana con nombre «Avisos, N sin leer»; `npm run test:e2e` incluye axe AA en ambos temas
  para las pantallas nuevas.
- **Regresión**: `npm run check` y `npm run test:e2e` completos; las pruebas de las features 001 y 002 pasan
  sin cambios.
- **Concurrencia**: la prueba de API compra a la vez la última unidad de una variante y el último uso de
  un cupón; solo una compra gana.

## Pruebas automáticas relacionadas

- `npm run test:unit`: `coupon` y `variant`.
- `npm run test:api`: `tests/api/variants-service`, `variants-cart`, `favorites`, `reviews`, `addresses`,
  `coupons`, `related`, `receipt`, `notifications` y `tests/api/admin/{variants,coupons,reviews}`.
- `npm run test:e2e`: `variantes-compra`, `extras-cliente` y `admin-extras`, más `accesibilidad`.
