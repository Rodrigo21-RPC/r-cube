# R Cube

Tienda en línea de dispositivos electrónicos (celulares, laptops, tablets y accesorios) con un solo
vendedor y experiencia tipo Amazon. Proyecto del laboratorio IS-388 Construcción y Evolución de
Software, desarrollado con Spec-Driven Development y GitHub Spec Kit.

- **Tienda:** catálogo con búsqueda y filtros, detalle, carrito, cuenta, checkout con 4 métodos de
  pago simulados (tarjeta, Yape o Plin, transferencia y WhatsApp) y Mis pedidos.
- **Panel de administración** en `/admin` (solo rol administrador): resumen de ventas, productos con
  fotos, categorías y marcas, stock con historial, pedidos con estados válidos, confirmación o rechazo
  de pagos, clientes, configuración de la tienda, exportación a CSV y registro de auditoría.
- **Experiencia avanzada:** variantes de producto (color, almacenamiento y RAM) con su SKU, precio y stock;
  favoritos; reseñas de productos entregados con promedio y moderación en el panel; varias direcciones con
  una predeterminada; cupones de descuento y su administración; productos relacionados; comprobante
  imprimible con desglose de IGV; avisos dentro de la app con campana.
- **Galería y destacados:** hasta 8 fotos por producto con carrusel, miniaturas y vista ampliada; una frase
  y hasta 5 destacados bajo el nombre (editables desde el panel); créditos públicos de las fotos externas
  en `/creditos-fotos`.
- **Contacto por WhatsApp:** botón «Consultar por WhatsApp» en el producto, botón flotante y enlace en el
  pie con el número de la configuración; el administrador puede escribir al cliente desde el pedido y su
  ficha. Son enlaces `wa.me`, sin chat propio.
- **Tema claro y oscuro** en toda la app.
- Precios en soles con IGV incluido. Pagos simulados: no se cobra dinero real.

## Stack

TypeScript estricto · React, Vite, Tailwind CSS y shadcn/ui · Hono sobre Cloudflare Workers ·
PostgreSQL (Supabase) con Drizzle y Hyperdrive · Better Auth · Vitest y Playwright.

## Cómo arrancar

```
npm install
docker compose up -d          # Postgres local para desarrollo y pruebas
cp .env.example .env          # completar valores locales; copiar también a .dev.vars
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:5173
```

## Cómo probar

```
npm run check                 # tipos, lint, contraste AA, pruebas unitarias y de API
npm run test:e2e              # compra, panel de administración, accesibilidad y tema en el navegador
                              # (tras test:api hay que volver a sembrar con npm run db:seed: las pruebas de API vacían la base)
```

## Fotos de demostración

Las fotos de la galería están en `public/img/productos/galeria/` y se regeneran con scripts de desarrollo
(no forman parte del Worker):

```
npm run fotos:buscar          # candidatas libres de Wikimedia Commons y hojas de contacto
npm run fotos:agregar         # agrega la foto elegida al manifiesto con su autor y licencia
npm run fotos:preparar        # descarga y convierte a WebP (hasta 200 KB y 1 200 px)
npm run fotos:tarjetas        # genera las 3 tarjetas gráficas de cada producto
```

Solo se admiten licencias CC0, dominio público, CC BY y CC BY-SA, y cada foto externa queda acreditada.
Las fotos originales del proyecto no tienen autor registrado; es un riesgo declarado en
`specs/004-galeria-destacados/spec.md` (sección de supuestos).

## Documentación

- Especificación, plan y tareas de cada feature: `specs/`
- Principios del proyecto: `.specify/memory/constitution.md`
- Historias de usuario y requisitos: `docs/requisitos/`
- Despliegue en Cloudflare: [DESPLIEGUE.md](DESPLIEGUE.md)
