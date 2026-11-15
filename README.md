# R Cube

Tienda en línea de dispositivos electrónicos (celulares, laptops, tablets y accesorios) con un solo
vendedor y experiencia tipo Amazon. Proyecto del laboratorio IS-388 Construcción y Evolución de
Software, desarrollado con Spec-Driven Development y GitHub Spec Kit.

- **Tienda:** catálogo con búsqueda y filtros, detalle, carrito, cuenta, checkout con 4 métodos de
  pago simulados (tarjeta, Yape o Plin, transferencia y WhatsApp) y Mis pedidos.
- **Panel de administración** en `/admin` (solo rol administrador): resumen de ventas, productos con
  fotos, categorías y marcas, stock con historial, pedidos con estados válidos, confirmación o rechazo
  de pagos, clientes, configuración de la tienda, exportación a CSV y registro de auditoría.
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
```

## Documentación

- Especificación, plan y tareas de cada feature: `specs/`
- Principios del proyecto: `.specify/memory/constitution.md`
- Historias de usuario y requisitos: `docs/requisitos/`
- Despliegue en Cloudflare: [DESPLIEGUE.md](DESPLIEGUE.md)
