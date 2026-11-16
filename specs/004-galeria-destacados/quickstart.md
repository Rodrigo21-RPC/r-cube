# Quickstart: validar la feature 004

Recorrido para comprobar las historias HU-54 a HU-58 usando solo la app, con los datos de demostración.
Cada paso se puede repetir en tema claro y oscuro (interruptor del encabezado) y en una ventana angosta
(320 px) o con el modo móvil del navegador.

## Preparación

```
docker compose up -d          # PostgreSQL local (puerto 54329)
npm install
npm run db:migrate            # aplica 0004_galeria_destacados.sql
npm run db:seed               # 37 productos con 3 a 5 fotos, frase y destacados
npm run dev                   # http://localhost:5173
```

Cuentas (contraseñas en `.env`): administrador `admin@rcube.pe`; clientes `mateo@demo.pe`,
`lucia@demo.pe`, `diego@demo.pe`, `valeria@demo.pe` y `andres@demo.pe`.

## Recorrido por historia

| HU | Pasos | Resultado esperado |
|---|---|---|
| HU-54 | Abrir «Samsung Galaxy S23 256 GB». Pulsar «Foto siguiente», una miniatura y, con el foco en la foto, la flecha derecha del teclado. En un teléfono, deslizar la foto con el dedo | Cambia la foto y el contador («2 de 4»); la miniatura activa queda marcada; en la última, «Foto siguiente» vuelve a la primera; un producto con una sola foto (el inactivo no se ve; crear uno desde el panel) no muestra flechas ni miniaturas |
| HU-54 | Abrir «Motorola Edge 60 Pro» y elegir la variante «256 GB · Azul» | La galería salta a la foto de esa variante; si luego se navega a mano, se respeta |
| HU-55 | En el detalle, tocar la foto grande (o «Ampliar foto») → cambiar de foto con las flechas del teclado → Escape | Se abre a pantalla completa con contador y flechas; Tab no sale de la vista; Escape la cierra, el foco vuelve al botón que la abrió y la galería queda en la foto en que se quedó |
| HU-56 | Abrir «iPhone 13 Pro 128 GB» | Bajo el nombre hay una frase y de 3 a 5 viñetas, antes del precio; la descripción y las especificaciones siguen más abajo |
| HU-57 | Panel → Productos → un producto → escribir una frase y 3 destacados → Guardar → mirar la tienda → Panel → Auditoría | La tienda muestra el cambio al recargar; la auditoría registra «Frase y destacados de X actualizados» con el valor anterior y el nuevo; una frase de 91 caracteres se rechaza con «La frase no puede pasar de 90 caracteres»; un sexto destacado con «Máximo 5 destacados»; uno de 61 caracteres con «Cada destacado admite hasta 60 caracteres» |
| HU-57 | Escribir `<b>hola</b>` como destacado y guardar | En la tienda se ve el texto tal cual, sin negrita |
| HU-58 | Pie de página → «Créditos de las fotos» | Lista de fotos externas con producto, autor, licencia y enlace de origen que abre en una pestaña nueva; grupo «Fotos aportadas por el proyecto»; aviso de que las tarjetas de características son de R Cube |

## Revisión guiada de las 37 fotos principales (SC-003)

Abrir el catálogo (12 productos por página) y, en cada tarjeta, comprobar que la foto muestra **un solo
equipo, completo y reconocible**: sin varios equipos en la misma foto, sin vista de la parte inferior o de
un componente interno y sin ser de otro modelo. Marcar cualquier producto que no cumpla para corregirlo en
`src/db/gallery-data.ts`. Después abrir cada producto y comprobar que tiene de 3 a 5 fotos, que la última
puede ser la tarjeta de características y que ninguna se ve cortada, borrosa o con otro idioma.

## Comprobaciones transversales

- **Teclado**: Tab llega a la galería; las flechas izquierda y derecha cambian la foto solo con el foco
  dentro; la vista ampliada atrapa el foco y Escape lo devuelve (SC-006).
- **Lector de pantalla**: la galería se anuncia como carrusel; al cambiar se oye «Foto 2 de 5»; las
  miniaturas dicen «Ver foto 2 de 5»; cada foto tiene un texto alternativo propio.
- **Móvil**: a 320 px no hay desplazamiento horizontal de la página en el detalle, la vista ampliada ni los
  créditos; los botones miden al menos 44 px (SC-007).
- **Reducir movimiento**: con la preferencia del sistema activada, la galería cambia de foto sin animación.
- **Peso**: en la pestaña de red del navegador, abrir un producto con 5 fotos descarga como máximo 1.2 MB de
  fotos y la primera foto aparece sin que el diseño se mueva (SC-008).
- **Cuando el administrador sube fotos**: subir una foto a un producto desde el panel (feature 002) hasta
  llegar a 6; la séptima responde «Máximo 6 fotos por producto». La foto subida aparece en la galería y no
  aparece en los créditos.

## Pruebas automáticas

```
npm run check        # tipos, lint, contraste y pruebas unitarias y de API (incluye la integridad del manifiesto)
npm run db:seed      # las pruebas de API vacían la base: volver a cargar los datos antes de las e2e
npm run test:e2e     # galería, vista ampliada, edición en el panel, créditos y accesibilidad AA en ambos temas
```

## Regenerar las fotos (solo desarrollo, no se ejecuta en la tienda)

```
npm run fotos:buscar -- "Samsung Galaxy S23"     # lista candidatas de Commons con licencia admitida
npm run fotos:preparar                            # descarga, reduce a .webp (≤ 200 KB) y escribe public/img/productos/galeria/
npm run fotos:tarjetas                            # genera las tarjetas de características con Playwright
```
