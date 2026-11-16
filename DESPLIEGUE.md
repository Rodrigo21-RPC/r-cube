# Despliegue de R Cube en Cloudflare

R Cube corre en **un solo Cloudflare Worker**: sirve la web (static assets) y la API (`/api/*`),
se conecta a **PostgreSQL en Supabase** por **Hyperdrive**, guarda las fotos que sube el
administrador en **R2** (desde la feature 002) y ejecuta un **Cron Trigger** cada hora que cancela los
pedidos impagos con más de 24 horas (RN-12).

## 1. Requisitos

- Node 24 LTS y npm, con `npm ci` ejecutado en la raíz del proyecto.
- Cuenta de Cloudflare con Workers, Hyperdrive y R2 habilitados, y `npx wrangler login` hecho.
- Proyecto de Supabase con su cadena de conexión **directa** (puerto 5432) o del **pooler en modo
  sesión**. Nunca se pega en el chat ni se sube al repositorio.

## 2. Variables y secretos

| Nombre | Dónde | Para qué |
|---|---|---|
| `BETTER_AUTH_SECRET` | Secreto de Wrangler | Firma de sesiones. Cadena aleatoria de 32 caracteres o más |
| `PUBLIC_URL` | `vars` de `wrangler.jsonc` | URL pública final (por ejemplo `https://r-cube.<cuenta>.workers.dev`) |
| `HYPERDRIVE` | Binding en `wrangler.jsonc` | Conexión del Worker a Supabase |
| `FOTOS` | Binding R2 en `wrangler.jsonc` | Bucket `r-cube-fotos` |
| `DATABASE_URL` | Solo en `.env` de la PC que despliega | Migraciones y datos de demostración contra Supabase |
| `SEED_ADMIN_PASSWORD`, `SEED_CUSTOMER_PASSWORD` | Solo en `.env` | Contraseñas de las cuentas de demostración |

## 3. Pasos, en este orden

1. **Hyperdrive con la caché desactivada.** La caché de lecturas mostraría stock y precios viejos:
   ```
   npx wrangler hyperdrive create r-cube-db --connection-string="<cadena de Supabase>" --caching-disabled
   ```
   Copiar el `id` que devuelve al campo `hyperdrive[0].id` de `wrangler.jsonc`.
2. **Bucket R2 (obligatorio desde la feature 002).** Guarda las fotos que sube el administrador;
   sin el bucket, la subida de fotos falla:
   ```
   npx wrangler r2 bucket create r-cube-fotos
   ```
   Las fotos se sirven por `GET /api/media/*` desde el mismo Worker, con caché larga (la clave del
   objeto cambia en cada subida, por lo que nunca se sirve una foto vieja).
3. **Secreto de sesión:**
   ```
   npx wrangler secret put BETTER_AUTH_SECRET
   ```
4. **URL pública:** poner la URL final en `vars.PUBLIC_URL` de `wrangler.jsonc`.
5. **Base de datos.** En `.env`, `DATABASE_URL` apunta a Supabase:
   ```
   npm run db:migrate
   npm run db:seed
   ```
   La migración `0003_experiencia_avanzada` agrega variantes, favoritos, reseñas, direcciones, cupones y
   avisos, y **copia la dirección única de cada cliente de la feature 001 como su primera dirección
   guardada (predeterminada)**; hay que aplicarla antes de publicar la versión nueva del Worker. El seed
   borra y vuelve a crear todos los datos. Solo debe correrse en una base nueva o de
   demostración. También crea el historial de stock: el saldo de cada producto coincide con la suma
   de sus movimientos (inicial, ventas y cancelaciones).
6. **Publicar:**
   ```
   npm run deploy
   ```

## 4. Comprobaciones

| Comprobación | Resultado esperado |
|---|---|
| `GET <URL>/api/health` | `{"ok":true}` (el Worker llega a la base) |
| Abrir `<URL>/` | Portada con categorías, ofertas, más vendidos y novedades |
| Comprar con la tarjeta `4111 1111 1111 1111` | Pedido `RC-…` en estado Pagado |
| Comprar con `4000 0000 0000 0002` | Rechazo sin pedido |
| Panel de Cloudflare → Worker → Triggers | Cron `0 * * * *` activo |
| Entrar a `<URL>/admin` con `admin@rcube.pe` | Resumen con ventas, pedidos pendientes y stock bajo |
| Panel → Productos → un producto → subir una foto de 2 MB o menos | La foto aparece en el panel y en la tienda desde `/api/media/productos/…` |
| Entrar a `<URL>/admin` con una cuenta de cliente | «No tienes permiso para entrar al panel» |
| Carrito con un producto → escribir `BIENVENIDO10` (cupón de demostración) | Desglose con «Cupón BIENVENIDO10» y el total recalculado con su IGV |
| Panel → Pedidos → pasar un pedido de un cliente a Enviado; como ese cliente, mirar la campana | El contador sube en un minuto como máximo y el aviso lleva al pedido |
| Mis pedidos → un pedido → «Ver comprobante» → Imprimir | Vista previa de una hoja A4 sin encabezado ni botones |
| Cabeceras de `<URL>/` | `Content-Security-Policy` y `X-Frame-Options: DENY` presentes |

Cuentas de demostración: `admin@rcube.pe` (administrador) y `mateo@demo.pe`, `lucia@demo.pe`,
`diego@demo.pe`, `valeria@demo.pe`, `andres@demo.pe` (clientes), con las contraseñas de `.env`.

## 5. Notas

- **Límite de CPU del plan gratuito.** El plan gratuito de Workers permite 10 ms de CPU por petición.
  El hash de contraseñas usa PBKDF2 nativo de WebCrypto para mantenerse bajo ese límite. Si el
  registro o el inicio de sesión fallan por CPU en producción, la opción es el plan Workers Paid; la
  decisión es de Rodrigo.
- **Respaldo de conexión.** Si Hyperdrive no conecta con Supabase, crear Hyperdrive con la cadena del
  pooler de Supabase.
- **En Windows**, `cf deploy` falló en esta PC; usar `npm run deploy` (Wrangler).
- Los pagos son simulados: no se cobra dinero real ni se guardan números completos de tarjeta.
