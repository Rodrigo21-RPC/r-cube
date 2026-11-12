<!--
Sync Impact Report
- Versión: plantilla → 1.0.0 (adopción inicial)
- Principios definidos: I a XI (Simplicidad, Idioma y mercado, Cero alcance fantasma,
  Verificable por una persona no técnica, Datos y pagos con respeto, Pruebas primero,
  Integridad de datos, Publicable en Cloudflare, Experiencia cuidada, Tema claro y oscuro,
  Trazabilidad)
- Secciones añadidas: Restricciones técnicas, Flujo de desarrollo, Gobierno
- Secciones eliminadas: ninguna
- Plantillas: plan-template, spec-template y tasks-template leen esta constitución en tiempo
  de ejecución; no requieren cambios
- TODO diferidos: ninguno
-->

# Constitución de R Cube

R Cube es una tienda en línea de dispositivos electrónicos (celulares, laptops, tablets y
accesorios) con un solo vendedor y experiencia tipo Amazon. Tiene dos módulos: la tienda, donde
el cliente busca productos, arma su carrito, paga con métodos de pago simulados y sigue sus
pedidos; y la administración, donde el administrador gestiona productos, precios, stock,
clientes, pedidos y pagos. Los requisitos y las historias de usuario están en `docs/requisitos/`.

## Principios

### I. Simplicidad ante todo
Ante dos soluciones, se elige SIEMPRE la más simple. No se agrega complejidad anticipada ni
piezas que no aporten a una historia de usuario.

### II. Idioma y mercado
Todo el producto está en español de Perú. La moneda es el sol (S/), con dos decimales. Los
precios incluyen IGV (18 %).

### III. Cero alcance fantasma
NO se implementa nada que no esté en las historias de usuario y los requisitos de
`docs/requisitos/`. Si surge una idea nueva, se propone; no se construye.

### IV. Verificable por una persona no técnica
Cada criterio de aceptación DEBE poder comprobarse usando la app, sin leer código.

### V. Datos y pagos con respeto
- Las contraseñas se guardan con hash, nunca en texto plano.
- Todos los métodos de pago son simulaciones en modo de prueba: nunca se cobra dinero real,
  nunca se guarda el número completo de la tarjeta ni el CVV, y la interfaz lo dice.
- Ningún secreto en el código: van en variables de entorno y secretos de Cloudflare, con un
  archivo `.env.example` que lista los nombres sin valores.

### VI. Pruebas primero (no negociable)
- Toda regla de negocio (totales, IGV, stock, transiciones de estado, pagos) tiene una prueba
  automática que falla antes de implementarla.
- El flujo de compra completo tiene una prueba de extremo a extremo.
- `npm run check` DEBE pasar antes de cerrar una feature.

### VII. Integridad de datos
- El servidor calcula siempre precios y totales; nunca se confía en montos del navegador.
- Crear el pedido, registrar el pago y descontar el stock ocurre en una sola transacción de base
  de datos.
- Todo cambio de esquema es una migración versionada.

### VIII. Publicable en Cloudflare
Todo corre en Cloudflare Workers con PostgreSQL. Nada depende de un servidor Node tradicional,
del sistema de archivos local ni de módulos nativos.

### IX. Experiencia cuidada
Diseño móvil primero; estados de carga, lista vacía y error en cada pantalla; accesibilidad
WCAG 2.2 AA; formularios con mensajes claros por campo.

### X. Tema claro y oscuro
Toda la app (tienda y administración) funciona en ambos temas con un interruptor visible. Por
defecto sigue la preferencia del sistema; la elección se recuerda y no hay parpadeo al cargar.
Los colores salen de variables de tema, nunca fijos en cada componente.

### XI. Trazabilidad
Cada tarea y cada prueba nombra la historia de usuario (HU-xx) que cubre.

## Restricciones técnicas

- TypeScript estricto en todo el código.
- Web: React con Vite, Tailwind CSS y shadcn/ui, React Router, TanStack Query, React Hook Form
  con Zod y Zustand para el carrito del visitante.
- API: Hono sobre Cloudflare Workers con cliente tipado.
- Datos: PostgreSQL (Supabase) con Drizzle ORM y drizzle-kit; conexión desde el Worker con
  Hyperdrive. Los montos se guardan en céntimos enteros.
- Autenticación: Better Auth con roles cliente y administrador.
- Imágenes subidas: Cloudflare R2.
- Pruebas: Vitest y Playwright, con una base PostgreSQL de pruebas que nunca es la de producción.

## Flujo de desarrollo

- Cada feature sigue el ciclo de Spec Kit: specify, clarify, plan, tasks, analyze e implement,
  en su propia rama, y se fusiona a `main` con `--no-ff` antes de empezar la siguiente.
- Los cambios posteriores al código entran como feature nueva, no como edición suelta.
- Commits, README, descripciones y PR no llevan firmas ni menciones de herramientas de IA.

## Gobierno

Esta constitución prevalece sobre cualquier otra práctica del proyecto. Cada plan comprueba el
cumplimiento de los principios en su sección de verificación; toda excepción se justifica por
escrito en el plan. Las enmiendas se documentan en este archivo con versión semántica: MAJOR si
se elimina o redefine un principio, MINOR si se agrega uno o se amplía su alcance, PATCH para
aclaraciones de redacción. La guía técnica de cada sesión vive en `CLAUDE.md`.

**Versión**: 1.0.0 | **Ratificada**: 2026-11-12 | **Última enmienda**: 2026-11-12
