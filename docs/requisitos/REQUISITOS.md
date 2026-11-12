# R Cube: requisitos, reglas de negocio y alcance

## 1. Alcance

Tienda en línea de dispositivos electrónicos con un solo vendedor (R Cube), con módulo de tienda para el cliente y módulo de administración. Los requisitos funcionales son las historias de `HISTORIAS-DE-USUARIO.md` (HU-01 a HU-53).

**Fuera de alcance:** varios vendedores (marketplace), pago contra entrega, pagos reales y cualquier pasarela real, correos electrónicos, recuperación de contraseña por correo, facturación electrónica, aplicación móvil nativa, múltiples idiomas y múltiples monedas.

## 2. Requisitos no funcionales

| ID | Requisito |
|---|---|
| RNF-01 Idioma y moneda | Todo en español de Perú; precios en soles (S/) con dos decimales; los precios incluyen IGV (18 %) y el desglose se muestra en carrito, resumen y comprobante |
| RNF-02 Diseño | Móvil primero y adaptable hasta escritorio; tema claro y oscuro con interruptor; cada pantalla con estados de carga, lista vacía y error |
| RNF-03 Accesibilidad | Cumple WCAG 2.2 AA: contraste, foco visible, uso con teclado, etiquetas en formularios, texto alternativo en imágenes |
| RNF-04 Rendimiento | Listados paginados en el servidor; imágenes con tamaño y carga diferida; la página de catálogo carga en menos de 2,5 s en conexión móvil normal |
| RNF-05 Seguridad | Contraseñas con hash; sesión en cookie HttpOnly, Secure y SameSite; validación de todo dato en el servidor; autorización por rol en cada ruta de administración; límite de intentos de inicio de sesión; cabeceras de seguridad; ningún secreto en el repositorio |
| RNF-06 Privacidad de pagos | Nunca se guarda el número completo de tarjeta ni el CVV; solo los últimos 4 dígitos; la interfaz dice que es una simulación |
| RNF-07 Integridad de datos | El precio y el total los calcula siempre el servidor; el pedido, el pago y el descuento de stock ocurren en una sola transacción de base de datos |
| RNF-08 Calidad | TypeScript estricto; `npm run check` (tipos, lint y pruebas) pasa antes de cerrar cada feature; cada regla de negocio tiene prueba escrita antes de implementarla; el flujo de compra completo tiene una prueba de extremo a extremo |
| RNF-09 Trazabilidad | Cada tarea y cada prueba nombra la HU que cubre |
| RNF-10 Publicación | Corre en Cloudflare (Workers) con PostgreSQL; variables y secretos fuera del código; migraciones versionadas |

## 3. Reglas de negocio

| ID | Regla |
|---|---|
| RN-01 | No se puede agregar al carrito ni comprar más unidades que el stock disponible |
| RN-02 | El pedido se crea en una transacción: valida stock, calcula montos, registra el pago y descuenta stock; si algo falla, no queda nada a medias |
| RN-03 | Numeración de pedidos correlativa con formato `RC-000001` |
| RN-04 | El total = suma de líneas (con IGV incluido) + envío − descuento; el desglose muestra la base imponible y el IGV |
| RN-05 | Delivery: costo fijo por zona definido por el administrador; recojo en tienda sin costo |
| RN-06 | Un producto desactivado no se vende, pero sus pedidos anteriores lo conservan con el precio de ese momento |
| RN-07 | El precio de cada línea queda congelado en el pedido; cambios de precio posteriores no lo afectan |
| RN-08 | Un cliente solo ve y cancela sus propios pedidos; un cliente bloqueado no inicia sesión |
| RN-09 | Solo puede reseñar quien tiene el producto en un pedido Entregado, una vez por producto |
| RN-10 | Cancelar un pedido devuelve el stock y deja constancia del motivo |
| RN-11 | Todo pedido se paga por adelantado: ningún pedido pasa a Preparando sin estar Pagado (no existe pago contra entrega) |
| RN-12 | Un pedido que sigue en Pendiente de pago 24 horas después de creado se cancela automáticamente con el motivo «Pago no recibido en 24 h» y devuelve el stock; el checkout informa ese plazo |
| RN-13 | Si el administrador rechaza un pago de Yape, Plin o transferencia, el pedido pasa a Cancelado con el motivo del rechazo y devuelve el stock |
| RN-14 | Los montos se guardan en céntimos enteros; la base imponible es el total dividido entre 1,18 redondeado al céntimo y el IGV es la diferencia entre el total y la base |

## 4. Métodos de pago (todos simulados, sin dinero real)

| Método | Comportamiento | Estado inicial del pedido |
|---|---|---|
| Tarjeta | Aprueba o rechaza al instante según el número de prueba; rechazo no crea pedido | Pagado |
| Yape o Plin | Muestra QR y número de ejemplo; el cliente escribe el código de operación | Pendiente de pago |
| Transferencia bancaria | Muestra datos de cuenta de ejemplo y monto | Pendiente de pago |
| WhatsApp | Abre `wa.me` con el resumen del pedido para coordinar con la tienda | Pendiente de pago |

Son 4 métodos. Los pedidos en Pendiente de pago siguen las reglas RN-12 (vencen a las 24 h) y RN-13 (rechazo).

El administrador activa o desactiva cada método y configura los datos (número de WhatsApp, cuentas) en la configuración de la tienda.

## 5. Estados del pedido y transiciones válidas

Estados: Pendiente de pago, Pagado, Preparando, Enviado, Entregado, Cancelado.

| Desde | Hacia |
|---|---|
| Pendiente de pago | Pagado (el administrador confirma), Cancelado (por el cliente, por rechazo del pago o por vencimiento a las 24 h) |
| Pagado | Preparando, Cancelado |
| Preparando | Enviado, Cancelado |
| Enviado | Entregado |
| Entregado | (final) |
| Cancelado | (final) |

Los pedidos de recojo en tienda pasan de Preparando a Entregado sin Enviado. Cada cambio guarda quién (o «Sistema» en la cancelación automática), cuándo y, si cancela, el motivo.

## 6. Datos de demostración

Mínimo: 24 productos con las fotos de `fotos\` (las tablets y los productos sin foto usan imagen genérica), 6 marcas, 4 categorías (Celulares, Laptops, Tablets, y Accesorios y repuestos, donde van baterías, memorias RAM, SSD, pasta térmica, cooler y kit de herramientas), 1 administrador, 5 clientes y 8 pedidos en distintos estados, 3 zonas de delivery y la configuración de la tienda. Las categorías se pueden ampliar después desde el panel (HU-32).
