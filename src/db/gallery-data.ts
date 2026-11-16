/**
 * Manifiesto de las fotos, la frase y los destacados de los productos de demostración (feature 004).
 * Lo lee el seed y lo usan los scripts de `scripts/fotos/`. Cada producto activo tiene de 4 a 6 fotos: de 1 a 3
 * reales o del proyecto (la primera es la principal) y, al final, 3 tarjetas (características, destacados y
 * compra segura). Una foto externa lleva su crédito completo (autor, licencia y enlace de origen).
 */
export type CardKind = "caracteristicas" | "destacados" | "compra";

export interface DemoPhoto {
  /** Ruta pública de la foto, siempre bajo `/img/` (se sirve desde la propia tienda). */
  url: string;
  /** Texto alternativo en español que describe lo que se ve. */
  alt: string;
  origin: "proyecto" | "externa" | "tarjeta";
  /** Solo en las tarjetas gráficas. */
  card?: CardKind;
  /** Archivo de origen: de `public/img/productos/` (proyecto) o título del archivo en Wikimedia Commons (externa). */
  source?: string;
  /** Recorte del original como fracciones del ancho y el alto (para aislar un equipo de una foto con varios). */
  crop?: { x: number; y: number; w: number; h: number };
  /** Crédito de una foto externa (obligatorio si `origin` es `externa`). */
  credit?: { author: string; license: string; url: string; title: string };
}

export interface GalleryEntry {
  /** Frase corta y llamativa (hasta 90 caracteres). */
  tagline: string;
  /** De 3 a 5 destacados de hasta 60 caracteres. */
  highlights: string[];
  photos: DemoPhoto[];
}

export const GALLERY: Record<string, GalleryEntry> = {
  "iphone-15-pro-256-gb": {
    tagline: "Diseño en titanio, chip A17 Pro y cámara de 48 MP para fotos que se ven increíbles",
    highlights: [
      "Diseño en titanio",
      "Chip A17 Pro",
      "Cámara principal de 48 MP",
      "Zoom óptico de 3x",
      "Hasta 23 h de video",
    ],
    photos: [
      { url: "/img/productos/galeria/iphone-15-pro-256-gb-1.webp", alt: "iPhone 15 Pro en titanio negro, visto por detrás y de frente", origin: "externa", source: "File:IPhone 15 pro.png", credit: { author: "Ka Kit Pang", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:IPhone_15_pro.png", title: "IPhone 15 pro.png" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/iphone-15-pro-256-gb-2.webp", alt: "Tarjeta de características de iPhone 15 Pro 256 GB: Pantalla 6,1 pulgadas, Almacenamiento 256 GB, Cámara 48 MP, Batería Hasta 23 h de video", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/iphone-15-pro-256-gb-3.webp", alt: "Tarjeta de destacados de iPhone 15 Pro 256 GB: Diseño en titanio, chip A17 Pro y cámara de 48 MP para fotos que se ven increíbles. Diseño en titanio, Chip A17 Pro, Cámara principal de 48 MP, Zoom óptico de 3x, Hasta 23 h de video.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/iphone-15-pro-256-gb-4.webp", alt: "Tarjeta de compra segura de iPhone 15 Pro 256 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "iphone-13-pro-128-gb": {
    tagline: "Fluidez de 120 Hz y triple cámara para grabar y fotografiar como un profesional",
    highlights: [
      "Pantalla ProMotion de 120 Hz",
      "Triple cámara de 12 MP",
      "Pantalla de 6,1 pulgadas",
      "128 GB de almacenamiento",
    ],
    photos: [
      { url: "/img/productos/galeria/iphone-13-pro-128-gb-1.webp", alt: "iPhone 13 Pro con la pantalla encendida sobre una superficie de bambú", origin: "externa", source: "File:Apple iPhone 13 Pro.jpg", credit: { author: "SimonWaldherr", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Apple_iPhone_13_Pro.jpg", title: "Apple iPhone 13 Pro.jpg" } },
      { url: "/img/productos/galeria/iphone-13-pro-128-gb-2.webp", alt: "Detalle del triple sistema de cámaras del iPhone 13 Pro en azul sierra", origin: "externa", source: "File:IPhone 13 Pro camera lens group.jpg", credit: { author: "人工知能", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:IPhone_13_Pro_camera_lens_group.jpg", title: "IPhone 13 Pro camera lens group.jpg" } },
      { url: "/img/productos/galeria/iphone-13-pro-128-gb-3.webp", alt: "iPhone 13 Pro verde alpino visto por detrás", origin: "externa", source: "File:Back of the iPhone 13 Pro.jpg", credit: { author: "Hajoon0102", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Back_of_the_iPhone_13_Pro.jpg", title: "Back of the iPhone 13 Pro.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/iphone-13-pro-128-gb-4.webp", alt: "Tarjeta de características de iPhone 13 Pro 128 GB: Pantalla 6,1 pulgadas, Almacenamiento 128 GB, Cámara 12 MP triple", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/iphone-13-pro-128-gb-5.webp", alt: "Tarjeta de destacados de iPhone 13 Pro 128 GB: Fluidez de 120 Hz y triple cámara para grabar y fotografiar como un profesional. Pantalla ProMotion de 120 Hz, Triple cámara de 12 MP, Pantalla de 6,1 pulgadas, 128 GB de almacenamiento.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/iphone-13-pro-128-gb-6.webp", alt: "Tarjeta de compra segura de iPhone 13 Pro 128 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "iphone-se-64-gb": {
    tagline: "Compacto, rápido y con Touch ID: potencia en un tamaño cómodo",
    highlights: [
      "Chip A15 Bionic",
      "Touch ID",
      "Pantalla de 4,7 pulgadas",
      "Cámara de 12 MP",
      "64 GB de almacenamiento",
    ],
    photos: [
      { url: "/img/productos/galeria/iphone-se-64-gb-1.webp", alt: "iPhone SE rojo (PRODUCT)RED visto por detrás", origin: "externa", source: "File:IPhone SE 4.7\" product red back.jpg", credit: { author: "Phiarc", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:IPhone_SE_4.7%22_product_red_back.jpg", title: "IPhone SE 4.7\" product red back.jpg" } },
      { url: "/img/productos/galeria/iphone-se-64-gb-2.webp", alt: "iPhone SE rojo visto de frente con la pantalla apagada", origin: "externa", source: "File:IPhone SE 4.7\" product red front.jpg", credit: { author: "Phiarc", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:IPhone_SE_4.7%22_product_red_front.jpg", title: "IPhone SE 4.7\" product red front.jpg" } },
      { url: "/img/productos/galeria/iphone-se-64-gb-3.webp", alt: "iPhone SE rojo visto por detrás sobre un soporte", origin: "externa", source: "File:Back of the iPhone SE (3rd generation).jpg", credit: { author: "Hajoon0102", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Back_of_the_iPhone_SE_(3rd_generation).jpg", title: "Back of the iPhone SE (3rd generation).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/iphone-se-64-gb-4.webp", alt: "Tarjeta de características de iPhone SE 64 GB: Pantalla 4,7 pulgadas, Almacenamiento 64 GB, Cámara 12 MP", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/iphone-se-64-gb-5.webp", alt: "Tarjeta de destacados de iPhone SE 64 GB: Compacto, rápido y con Touch ID: potencia en un tamaño cómodo. Chip A15 Bionic, Touch ID, Pantalla de 4,7 pulgadas, Cámara de 12 MP, 64 GB de almacenamiento.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/iphone-se-64-gb-6.webp", alt: "Tarjeta de compra segura de iPhone SE 64 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "samsung-galaxy-s23-256-gb": {
    tagline: "Snapdragon 8 Gen 2 y cámara de 50 MP: tus noches también salen nítidas",
    highlights: [
      "Snapdragon 8 Gen 2",
      "Cámara de 50 MP con modo noche",
      "Pantalla Dynamic AMOLED 2X de 6,1 pulgadas",
      "8 GB de RAM",
      "256 GB de almacenamiento",
    ],
    photos: [
      { url: "/img/productos/galeria/samsung-galaxy-s23-256-gb-1.webp", alt: "Samsung Galaxy S23 color crema visto por detrás", origin: "externa", source: "File:Galaxy s23.jpg", credit: { author: "Questions and", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Galaxy_s23.jpg", title: "Galaxy s23.jpg" } },
      { url: "/img/productos/galeria/samsung-galaxy-s23-256-gb-2.webp", alt: "Familia Galaxy S23: S23, S23 Ultra y S23+ vistos por detrás", origin: "externa", source: "File:Samsung Galaxy S23 Series Marketing Material.jpg", credit: { author: "Unknown authorUnknown author", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_S23_Series_Marketing_Material.jpg", title: "Samsung Galaxy S23 Series Marketing Material.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/samsung-galaxy-s23-256-gb-3.webp", alt: "Tarjeta de características de Samsung Galaxy S23 256 GB: Pantalla 6,1 pulgadas, RAM 8 GB, Almacenamiento 256 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/samsung-galaxy-s23-256-gb-4.webp", alt: "Tarjeta de destacados de Samsung Galaxy S23 256 GB: Snapdragon 8 Gen 2 y cámara de 50 MP: tus noches también salen nítidas. Snapdragon 8 Gen 2, Cámara de 50 MP con modo noche, Pantalla Dynamic AMOLED 2X de 6,1 pulgadas, 8 GB de RAM, 256 GB de almacenamiento.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/samsung-galaxy-s23-256-gb-5.webp", alt: "Tarjeta de compra segura de Samsung Galaxy S23 256 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "samsung-galaxy-s22-ultra-256-gb": {
    tagline: "S Pen integrado y zoom espacial de 100x: creatividad sin límites en 6,8 pulgadas",
    highlights: [
      "S Pen integrado",
      "Zoom espacial de 100x",
      "Cámara de 108 MP",
      "Pantalla de 6,8 pulgadas",
      "12 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/samsung-galaxy-s22-ultra-256-gb-1.webp", alt: "Samsung Galaxy S22 Ultra negro con su S Pen, visto por detrás", origin: "externa", source: "File:SAMSUNG Galaxy S22 Ultra BLACK (9).jpg", credit: { author: "Dinkun Chen", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:SAMSUNG_Galaxy_S22_Ultra_BLACK_(9).jpg", title: "SAMSUNG Galaxy S22 Ultra BLACK (9).jpg" } },
      { url: "/img/productos/galeria/samsung-galaxy-s22-ultra-256-gb-2.webp", alt: "Samsung Galaxy S22 Ultra negro y S Pen en vertical, visto por detrás", origin: "externa", source: "File:SAMSUNG Galaxy S22 Ultra BLACK (8).jpg", credit: { author: "Dinkun Chen", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:SAMSUNG_Galaxy_S22_Ultra_BLACK_(8).jpg", title: "SAMSUNG Galaxy S22 Ultra BLACK (8).jpg" } },
      { url: "/img/productos/galeria/samsung-galaxy-s22-ultra-256-gb-3.webp", alt: "Detalle de las cámaras traseras del Samsung Galaxy S22 Ultra", origin: "externa", source: "File:SAMSUNG Galaxy S22 Ultra BLACK (3).jpg", credit: { author: "Dinkun Chen", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:SAMSUNG_Galaxy_S22_Ultra_BLACK_(3).jpg", title: "SAMSUNG Galaxy S22 Ultra BLACK (3).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/samsung-galaxy-s22-ultra-256-gb-4.webp", alt: "Tarjeta de características de Samsung Galaxy S22 Ultra 256 GB: Pantalla 6,8 pulgadas, RAM 12 GB, Cámara 108 MP", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/samsung-galaxy-s22-ultra-256-gb-5.webp", alt: "Tarjeta de destacados de Samsung Galaxy S22 Ultra 256 GB: S Pen integrado y zoom espacial de 100x: creatividad sin límites en 6,8 pulgadas. S Pen integrado, Zoom espacial de 100x, Cámara de 108 MP, Pantalla de 6,8 pulgadas, 12 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/samsung-galaxy-s22-ultra-256-gb-6.webp", alt: "Tarjeta de compra segura de Samsung Galaxy S22 Ultra 256 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "xiaomi-redmi-note-12-128-gb": {
    tagline: "Pantalla AMOLED de 120 Hz y carga rápida: rendimiento para todo el día",
    highlights: [
      "Pantalla AMOLED de 120 Hz",
      "Carga rápida de 33 W",
      "Batería de 5000 mAh",
      "Pantalla de 6,67 pulgadas",
      "6 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/xiaomi-redmi-note-12-128-gb-1.webp", alt: "Xiaomi Redmi Note 12 en color celeste, visto por detrás", origin: "externa", source: "File:Redmi Note 12 back.jpg", credit: { author: "Maksdroider", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Redmi_Note_12_back.jpg", title: "Redmi Note 12 back.jpg" } },
      { url: "/img/productos/galeria/xiaomi-redmi-note-12-128-gb-2.webp", alt: "Xiaomi Redmi Note 12 visto de frente con la pantalla de información", origin: "externa", source: "File:Redmi Note 12 front.jpg", credit: { author: "Maksdroider", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Redmi_Note_12_front.jpg", title: "Redmi Note 12 front.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/xiaomi-redmi-note-12-128-gb-3.webp", alt: "Tarjeta de características de Xiaomi Redmi Note 12 128 GB: Pantalla 6,67 pulgadas, RAM 6 GB, Batería 5000 mAh", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/xiaomi-redmi-note-12-128-gb-4.webp", alt: "Tarjeta de destacados de Xiaomi Redmi Note 12 128 GB: Pantalla AMOLED de 120 Hz y carga rápida: rendimiento para todo el día. Pantalla AMOLED de 120 Hz, Carga rápida de 33 W, Batería de 5000 mAh, Pantalla de 6,67 pulgadas, 6 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/xiaomi-redmi-note-12-128-gb-5.webp", alt: "Tarjeta de compra segura de Xiaomi Redmi Note 12 128 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "xiaomi-13t-pro-512-gb": {
    tagline: "Óptica Leica y carga de 120 W para fotos de nivel profesional",
    highlights: [
      "Óptica Leica",
      "Carga de 120 W",
      "Procesador Dimensity 9200+",
      "512 GB de almacenamiento",
      "12 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/xiaomi-13t-pro-512-gb-1.webp", alt: "Parte trasera del Xiaomi 13T Pro con el módulo de cámara Leica", origin: "externa", source: "File:Shibuya-Tokyo---2024-08-28 064.jpg", credit: { author: "RuinDig/Yuki Uchida", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Shibuya-Tokyo---2024-08-28_064.jpg", title: "Shibuya-Tokyo---2024-08-28 064.jpg" } },
      { url: "/img/productos/galeria/xiaomi-13t-pro-512-gb-2.webp", alt: "Dos Xiaomi 13T Pro de frente con pantalla de presentación", origin: "externa", source: "File:Xiaomi 13T Series sample.jpg", credit: { author: "Myrat", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Xiaomi_13T_Series_sample.jpg", title: "Xiaomi 13T Series sample.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/xiaomi-13t-pro-512-gb-3.webp", alt: "Tarjeta de características de Xiaomi 13T Pro 512 GB: Pantalla 6,67 pulgadas, RAM 12 GB, Almacenamiento 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/xiaomi-13t-pro-512-gb-4.webp", alt: "Tarjeta de destacados de Xiaomi 13T Pro 512 GB: Óptica Leica y carga de 120 W para fotos de nivel profesional. Óptica Leica, Carga de 120 W, Procesador Dimensity 9200+, 512 GB de almacenamiento, 12 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/xiaomi-13t-pro-512-gb-5.webp", alt: "Tarjeta de compra segura de Xiaomi 13T Pro 512 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "motorola-edge-60-pro": {
    tagline: "Pantalla curva pOLED y resistencia IP68: elegancia que aguanta el día a día",
    highlights: [
      "Pantalla curva pOLED de 6,7 pulgadas",
      "Resistencia IP68",
      "Cámara de 50 MP",
      "12 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/motorola-edge-60-pro-1.webp", alt: "Motorola Edge 60 Pro en exhibición con su pantalla encendida", origin: "externa", source: "File:Motorola Edge 60 Pro (cropped).jpg", credit: { author: "Meniirtjakarintan", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Motorola_Edge_60_Pro_(cropped).jpg", title: "Motorola Edge 60 Pro (cropped).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/motorola-edge-60-pro-2.webp", alt: "Tarjeta de características de Motorola Edge 60 Pro: Pantalla 6,7 pulgadas, RAM 12 GB, Resistencia IP68", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/motorola-edge-60-pro-3.webp", alt: "Tarjeta de destacados de Motorola Edge 60 Pro: Pantalla curva pOLED y resistencia IP68: elegancia que aguanta el día a día. Pantalla curva pOLED de 6,7 pulgadas, Resistencia IP68, Cámara de 50 MP, 12 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/motorola-edge-60-pro-4.webp", alt: "Tarjeta de compra segura de Motorola Edge 60 Pro: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "google-pixel-8-128-gb": {
    tagline: "Chip Tensor G3 y funciones de IA de Google para fotos más inteligentes",
    highlights: [
      "Chip Tensor G3",
      "Fotografía computacional",
      "Funciones de IA de Google",
      "Cámara de 50 MP",
      "Pantalla de 6,2 pulgadas",
    ],
    photos: [
      { url: "/img/productos/galeria/google-pixel-8-128-gb-1.webp", alt: "Google Pixel 8 en color Rose visto por detrás", origin: "externa", source: "File:Google Pixel 8 Rose rear.jpg", credit: { author: "IXTA9839", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Google_Pixel_8_Rose_rear.jpg", title: "Google Pixel 8 Rose rear.jpg" } },
      { url: "/img/productos/galeria/google-pixel-8-128-gb-2.webp", alt: "Google Pixel 8 Rose en ángulo, visto por detrás", origin: "externa", source: "File:Google Pixel 8 Rose rear bottom-left.jpg", credit: { author: "IXTA9839", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Google_Pixel_8_Rose_rear_bottom-left.jpg", title: "Google Pixel 8 Rose rear bottom-left.jpg" } },
      { url: "/img/productos/galeria/google-pixel-8-128-gb-3.webp", alt: "Google Pixel 8 Rose con la barra de cámara a la vista", origin: "externa", source: "File:Google Pixel 8 Rose rear top-right.jpg", credit: { author: "IXTA9839", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Google_Pixel_8_Rose_rear_top-right.jpg", title: "Google Pixel 8 Rose rear top-right.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/google-pixel-8-128-gb-4.webp", alt: "Tarjeta de características de Google Pixel 8 128 GB: Pantalla 6,2 pulgadas, RAM 8 GB, Cámara 50 MP", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/google-pixel-8-128-gb-5.webp", alt: "Tarjeta de destacados de Google Pixel 8 128 GB: Chip Tensor G3 y funciones de IA de Google para fotos más inteligentes. Chip Tensor G3, Fotografía computacional, Funciones de IA de Google, Cámara de 50 MP, Pantalla de 6,2 pulgadas.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/google-pixel-8-128-gb-6.webp", alt: "Tarjeta de compra segura de Google Pixel 8 128 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "huawei-p60": {
    tagline: "Cámara XMAGE con apertura variable y un diseño que se luce",
    highlights: [
      "Cámara XMAGE con apertura variable",
      "Diseño elegante",
      "Pantalla de 6,67 pulgadas",
      "8 GB de RAM",
      "256 GB de almacenamiento",
    ],
    photos: [
      { url: "/img/productos/galeria/huawei-p60-1.webp", alt: "Huawei P60 blanco Rococó visto por detrás", origin: "externa", source: "File:华为P60洛可可白.jpg", credit: { author: "Tuqoday", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:%E5%8D%8E%E4%B8%BAP60%E6%B4%9B%E5%8F%AF%E5%8F%AF%E7%99%BD.jpg", title: "华为P60洛可可白.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/huawei-p60-2.webp", alt: "Tarjeta de características de Huawei P60: Pantalla 6,67 pulgadas, RAM 8 GB, Almacenamiento 256 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/huawei-p60-3.webp", alt: "Tarjeta de destacados de Huawei P60: Cámara XMAGE con apertura variable y un diseño que se luce. Cámara XMAGE con apertura variable, Diseño elegante, Pantalla de 6,67 pulgadas, 8 GB de RAM, 256 GB de almacenamiento.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/huawei-p60-4.webp", alt: "Tarjeta de compra segura de Huawei P60: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "sony-xperia-z5": {
    tagline: "Un clásico resistente al agua con cámara de 23 MP",
    highlights: [
      "Resistente al agua",
      "Cámara de 23 MP",
      "Pantalla de 5,2 pulgadas",
    ],
    photos: [
      { url: "/img/productos/galeria/sony-xperia-z5-1.webp", alt: "Sony Xperia Z5 dorado visto por detrás junto a otro Z5 negro de frente", origin: "externa", source: "File:Sony Xperia Z5 x2 (25176491414).jpg", credit: { author: "Falcon® Photography from France", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Sony_Xperia_Z5_x2_(25176491414).jpg", title: "Sony Xperia Z5 x2 (25176491414).jpg" } },
      { url: "/img/productos/galeria/sony-xperia-z5-2.webp", alt: "Sony Xperia Z5 blanco visto de frente (ilustración)", origin: "externa", source: "File:Sony Xperia Z5 PSD.png", credit: { author: "April.Kai", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Sony_Xperia_Z5_PSD.png", title: "Sony Xperia Z5 PSD.png" } },
      { url: "/img/productos/galeria/sony-xperia-z5-3.webp", alt: "Tres Sony Xperia Z5 dorados sobre su caja", origin: "externa", source: "File:Sony Xperia Z5 x3 (26248860380).jpg", credit: { author: "Falcon® Photography from France", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Sony_Xperia_Z5_x3_(26248860380).jpg", title: "Sony Xperia Z5 x3 (26248860380).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/sony-xperia-z5-4.webp", alt: "Tarjeta de características de Sony Xperia Z5: Pantalla 5,2 pulgadas, Cámara 23 MP", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/sony-xperia-z5-5.webp", alt: "Tarjeta de destacados de Sony Xperia Z5: Un clásico resistente al agua con cámara de 23 MP. Resistente al agua, Cámara de 23 MP, Pantalla de 5,2 pulgadas.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/sony-xperia-z5-6.webp", alt: "Tarjeta de compra segura de Sony Xperia Z5: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "oneplus-13r": {
    tagline: "Snapdragon 8 Gen 3 y batería de 6000 mAh: potencia con carga de 80 W",
    highlights: [
      "Snapdragon 8 Gen 3",
      "Batería de 6000 mAh",
      "Carga de 80 W",
      "Pantalla de 6,78 pulgadas",
      "12 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/oneplus-13r-1.webp", alt: "OnePlus 13R visto por detrás con sus tres cámaras", origin: "externa", source: "File:OnePlus 13R back.jpg", credit: { author: "Maksdroider", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:OnePlus_13R_back.jpg", title: "OnePlus 13R back.jpg" } },
      { url: "/img/productos/galeria/oneplus-13r-2.webp", alt: "OnePlus 13R visto de frente con la pantalla de información", origin: "externa", source: "File:OnePlus 13R front.jpg", credit: { author: "Maksdroider", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:OnePlus_13R_front.jpg", title: "OnePlus 13R front.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/oneplus-13r-3.webp", alt: "Tarjeta de características de OnePlus 13R: Pantalla 6,78 pulgadas, RAM 12 GB, Batería 6000 mAh", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/oneplus-13r-4.webp", alt: "Tarjeta de destacados de OnePlus 13R: Snapdragon 8 Gen 3 y batería de 6000 mAh: potencia con carga de 80 W. Snapdragon 8 Gen 3, Batería de 6000 mAh, Carga de 80 W, Pantalla de 6,78 pulgadas, 12 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/oneplus-13r-5.webp", alt: "Tarjeta de compra segura de OnePlus 13R: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "nothing-phone-2": {
    tagline: "Interfaz Glyph y Nothing OS limpio: un celular que se hace notar",
    highlights: [
      "Interfaz Glyph en la parte trasera",
      "Nothing OS limpio",
      "Pantalla de 6,7 pulgadas",
      "12 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/nothing-phone-2-1.webp", alt: "Nothing Phone (2) con la interfaz Glyph encendida, visto por detrás", origin: "externa", source: "File:Nothing phone (2) (Booredatwork.com) 007.png", credit: { author: "Booredatwork.com", license: "CC BY 3.0", url: "https://commons.wikimedia.org/wiki/File:Nothing_phone_(2)_(Booredatwork.com)_007.png", title: "Nothing phone (2) (Booredatwork.com) 007.png" } },
      { url: "/img/productos/galeria/nothing-phone-2-2.webp", alt: "Nothing Phone (2) de pie sobre mármol, visto por detrás", origin: "externa", source: "File:Nothing phone (2) (Booredatwork.com) 001.png", credit: { author: "Booredatwork.com", license: "CC BY 3.0", url: "https://commons.wikimedia.org/wiki/File:Nothing_phone_(2)_(Booredatwork.com)_001.png", title: "Nothing phone (2) (Booredatwork.com) 001.png" } },
      { url: "/img/productos/galeria/nothing-phone-2-3.webp", alt: "Nothing Phone (2) visto desde arriba con el Glyph encendido", origin: "externa", source: "File:Nothing phone (2) (Booredatwork.com) 013.png", credit: { author: "Booredatwork.com", license: "CC BY 3.0", url: "https://commons.wikimedia.org/wiki/File:Nothing_phone_(2)_(Booredatwork.com)_013.png", title: "Nothing phone (2) (Booredatwork.com) 013.png" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/nothing-phone-2-4.webp", alt: "Tarjeta de características de Nothing Phone (2): Pantalla 6,7 pulgadas, RAM 12 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/nothing-phone-2-5.webp", alt: "Tarjeta de destacados de Nothing Phone (2): Interfaz Glyph y Nothing OS limpio: un celular que se hace notar. Interfaz Glyph en la parte trasera, Nothing OS limpio, Pantalla de 6,7 pulgadas, 12 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/nothing-phone-2-6.webp", alt: "Tarjeta de compra segura de Nothing Phone (2): pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "macbook-air-m1-256-gb": {
    tagline: "Chip M1 sin ventilador: silenciosa y con hasta 18 horas de batería",
    highlights: [
      "Chip M1",
      "Sin ventilador",
      "Hasta 18 horas de batería",
      "Pantalla de 13,3 pulgadas",
      "8 GB de RAM y SSD de 256 GB",
    ],
    photos: [
      { url: "/img/productos/galeria/macbook-air-m1-256-gb-1.webp", alt: "MacBook Air M1 plateado con la pantalla apagada, visto en ángulo", origin: "externa", source: "File:Macbook Air M1 Silver PNG.png", credit: { author: "L", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Macbook_Air_M1_Silver_PNG.png", title: "Macbook Air M1 Silver PNG.png" } },
      { url: "/img/productos/galeria/macbook-air-m1-256-gb-2.webp", alt: "MacBook Air M1 gris espacial visto de frente", origin: "externa", source: "File:MacBook M1.jpg", credit: { author: "Wilfredor", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:MacBook_M1.jpg", title: "MacBook M1.jpg" } },
      { url: "/img/productos/galeria/macbook-air-m1-256-gb-3.webp", alt: "MacBook Air M1 dorado con el escritorio de macOS en pantalla", origin: "externa", source: "File:Macbook Air 2020 (M1) - 1.jpg", credit: { author: "KKPCW", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Macbook_Air_2020_(M1)_-_1.jpg", title: "Macbook Air 2020 (M1) - 1.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/macbook-air-m1-256-gb-4.webp", alt: "Tarjeta de características de MacBook Air M1 256 GB: Pantalla 13,3 pulgadas, RAM 8 GB, SSD 256 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/macbook-air-m1-256-gb-5.webp", alt: "Tarjeta de destacados de MacBook Air M1 256 GB: Chip M1 sin ventilador: silenciosa y con hasta 18 horas de batería. Chip M1, Sin ventilador, Hasta 18 horas de batería, Pantalla de 13,3 pulgadas, 8 GB de RAM y SSD de 256 GB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/macbook-air-m1-256-gb-6.webp", alt: "Tarjeta de compra segura de MacBook Air M1 256 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "macbook-pro-16-m3-pro": {
    tagline: "Pantalla Liquid Retina XDR y rendimiento profesional para crear sin límites",
    highlights: [
      "Pantalla Liquid Retina XDR de 16,2 pulgadas",
      "Chip M3 Pro",
      "18 GB de RAM",
      "SSD de 512 GB",
      "Pensada para edición",
    ],
    photos: [
      { url: "/img/productos/galeria/macbook-pro-16-m3-pro-1.webp", alt: "MacBook Pro de 16 pulgadas con la pantalla encendida sobre fondo oscuro", origin: "externa", source: "File:Apple MacBook Pro 16\" M2 Max 5.jpg", credit: { author: "SimonWaldherr", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Apple_MacBook_Pro_16%22_M2_Max_5.jpg", title: "Apple MacBook Pro 16\" M2 Max 5.jpg" } },
      { url: "/img/productos/galeria/macbook-pro-16-m3-pro-2.webp", alt: "MacBook Pro de 16 pulgadas en exhibición, visto de frente", origin: "externa", source: "File:MacBook Pro 16 (M1 Pro, 2021) - Wikipedia.jpg", credit: { author: "Premeditated", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:MacBook_Pro_16_(M1_Pro,_2021)_-_Wikipedia.jpg", title: "MacBook Pro 16 (M1 Pro, 2021) - Wikipedia.jpg" } },
      { url: "/img/productos/galeria/macbook-pro-16-m3-pro-3.webp", alt: "Teclado y borde de un MacBook Pro de 16 pulgadas con luz de ambiente", origin: "externa", source: "File:Apple MacBook Pro 16\" M2 Max illuminated.jpg", credit: { author: "SimonWaldherr", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Apple_MacBook_Pro_16%22_M2_Max_illuminated.jpg", title: "Apple MacBook Pro 16\" M2 Max illuminated.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/macbook-pro-16-m3-pro-4.webp", alt: "Tarjeta de características de MacBook Pro 16 M3 Pro: Pantalla 16,2 pulgadas, RAM 18 GB, SSD 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/macbook-pro-16-m3-pro-5.webp", alt: "Tarjeta de destacados de MacBook Pro 16 M3 Pro: Pantalla Liquid Retina XDR y rendimiento profesional para crear sin límites. Pantalla Liquid Retina XDR de 16,2 pulgadas, Chip M3 Pro, 18 GB de RAM, SSD de 512 GB, Pensada para edición.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/macbook-pro-16-m3-pro-6.webp", alt: "Tarjeta de compra segura de MacBook Pro 16 M3 Pro: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "dell-xps-13": {
    tagline: "Ultraportátil de aluminio con pantalla InfinityEdge para llevarla a todas partes",
    highlights: [
      "Pantalla InfinityEdge de 13,4 pulgadas",
      "Construcción en aluminio",
      "16 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [
      { url: "/img/productos/galeria/dell-xps-13-1.webp", alt: "Dell XPS 13 abierto con la pantalla encendida (generación anterior)", origin: "externa", source: "File:Dell XPS 13 (2018).png", credit: { author: "AnVuong1222004", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Dell_XPS_13_(2018).png", title: "Dell XPS 13 (2018).png" } },
      { url: "/img/productos/galeria/dell-xps-13-2.webp", alt: "Dell XPS 13 visto desde arriba con su teclado y panel táctil", origin: "externa", source: "File:Dell XPS 13 9350.jpg", credit: { author: "Green-Curtain", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Dell_XPS_13_9350.jpg", title: "Dell XPS 13 9350.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/dell-xps-13-3.webp", alt: "Tarjeta de características de Dell XPS 13: Pantalla 13,4 pulgadas, RAM 16 GB, SSD 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/dell-xps-13-4.webp", alt: "Tarjeta de destacados de Dell XPS 13: Ultraportátil de aluminio con pantalla InfinityEdge para llevarla a todas partes. Pantalla InfinityEdge de 13,4 pulgadas, Construcción en aluminio, 16 GB de RAM, SSD de 512 GB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/dell-xps-13-5.webp", alt: "Tarjeta de compra segura de Dell XPS 13: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "dell-inspiron-15": {
    tagline: "Confiable para estudiar y trabajar, con teclado numérico incluido",
    highlights: [
      "Teclado numérico",
      "Pantalla de 15,6 pulgadas",
      "8 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [
      { url: "/img/productos/galeria/dell-inspiron-15-1.webp", alt: "Dell Inspiron 15 de la serie 3000 visto desde arriba, con teclado numérico", origin: "externa", source: "File:Dell Inspiron 15 3000 (3505) Keyboard.jpg", credit: { author: "ADecentPlayer", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:Dell_Inspiron_15_3000_(3505)_Keyboard.jpg", title: "Dell Inspiron 15 3000 (3505) Keyboard.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/dell-inspiron-15-2.webp", alt: "Tarjeta de características de Dell Inspiron 15: Pantalla 15,6 pulgadas, RAM 8 GB, SSD 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/dell-inspiron-15-3.webp", alt: "Tarjeta de destacados de Dell Inspiron 15: Confiable para estudiar y trabajar, con teclado numérico incluido. Teclado numérico, Pantalla de 15,6 pulgadas, 8 GB de RAM, SSD de 512 GB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/dell-inspiron-15-4.webp", alt: "Tarjeta de compra segura de Dell Inspiron 15: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "hp-pavilion-15": {
    tagline: "Intel Core i7 y audio B&O: rendimiento y sonido para tu día a día",
    highlights: [
      "Procesador Intel Core i7",
      "Audio B&O",
      "Pantalla de 15,6 pulgadas",
      "16 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [
      { url: "/img/productos/galeria/hp-pavilion-15-1.webp", alt: "HP Pavilion 15 plateado, abierto y visto de frente", origin: "externa", source: "File:HP Pavilion 15 cs3095nr.png", credit: { author: "Dienthoaiquangcao68", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:HP_Pavilion_15_cs3095nr.png", title: "HP Pavilion 15 cs3095nr.png" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/hp-pavilion-15-2.webp", alt: "Tarjeta de características de HP Pavilion 15: Pantalla 15,6 pulgadas, RAM 16 GB, SSD 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/hp-pavilion-15-3.webp", alt: "Tarjeta de destacados de HP Pavilion 15: Intel Core i7 y audio B&O: rendimiento y sonido para tu día a día. Procesador Intel Core i7, Audio B&O, Pantalla de 15,6 pulgadas, 16 GB de RAM, SSD de 512 GB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/hp-pavilion-15-4.webp", alt: "Tarjeta de compra segura de HP Pavilion 15: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "hp-spectre-x360": {
    tagline: "Convertible 2 en 1 con pantalla OLED táctil y lápiz incluido",
    highlights: [
      "Convertible 2 en 1",
      "Pantalla OLED táctil de 14 pulgadas",
      "Lápiz incluido",
      "16 GB de RAM",
      "SSD de 1 TB",
    ],
    photos: [
      { url: "/img/productos/galeria/hp-spectre-x360-1.webp", alt: "HP Spectre x360 plateado abierto sobre un escritorio (generación anterior)", origin: "externa", source: "File:HP Spectre x360 2016 (31538364704).jpg", credit: { author: "Amanz Network", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:HP_Spectre_x360_2016_(31538364704).jpg", title: "HP Spectre x360 2016 (31538364704).jpg" } },
      { url: "/img/productos/galeria/hp-spectre-x360-2.webp", alt: "HP Spectre x360 en modo carpa (generación anterior)", origin: "externa", source: "File:HP Spectre x360 2016 (32003550180).jpg", credit: { author: "Amanz Network", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:HP_Spectre_x360_2016_(32003550180).jpg", title: "HP Spectre x360 2016 (32003550180).jpg" } },
      { url: "/img/productos/galeria/hp-spectre-x360-3.webp", alt: "Tapa del HP Spectre x360 con el logotipo de cobre", origin: "externa", source: "File:Hp Spectre x360.jpg", credit: { author: "Lokeish", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Hp_Spectre_x360.jpg", title: "Hp Spectre x360.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/hp-spectre-x360-4.webp", alt: "Tarjeta de características de HP Spectre x360: Pantalla 14 pulgadas OLED, RAM 16 GB, SSD 1 TB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/hp-spectre-x360-5.webp", alt: "Tarjeta de destacados de HP Spectre x360: Convertible 2 en 1 con pantalla OLED táctil y lápiz incluido. Convertible 2 en 1, Pantalla OLED táctil de 14 pulgadas, Lápiz incluido, 16 GB de RAM, SSD de 1 TB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/hp-spectre-x360-6.webp", alt: "Tarjeta de compra segura de HP Spectre x360: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "lenovo-thinkpad-x1-carbon": {
    tagline: "Ligera y resistente, con el teclado de referencia para profesionales",
    highlights: [
      "Teclado de referencia ThinkPad",
      "Diseño ligero y resistente",
      "Pantalla de 14 pulgadas",
      "16 GB de RAM",
      "SSD de 1 TB",
    ],
    photos: [
      { url: "/img/productos/galeria/lenovo-thinkpad-x1-carbon-1.webp", alt: "Lenovo ThinkPad X1 Carbon abierto y visto en ángulo (primera generación)", origin: "externa", source: "File:Lenovo ThinkPad X1 Ultrabook (Nov 16, 2012).png", credit: { author: "Intel Free Press", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Lenovo_ThinkPad_X1_Ultrabook_(Nov_16,_2012).png", title: "Lenovo ThinkPad X1 Ultrabook (Nov 16, 2012).png" } },
      { url: "/img/productos/galeria/lenovo-thinkpad-x1-carbon-2.webp", alt: "Lenovo ThinkPad X1 Carbon visto de frente", origin: "externa", source: "File:Lenovo ThinkPad X1 Carbon Ultrabook.jpg", credit: { author: "Elroygoh", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Lenovo_ThinkPad_X1_Carbon_Ultrabook.jpg", title: "Lenovo ThinkPad X1 Carbon Ultrabook.jpg" } },
      { url: "/img/productos/galeria/lenovo-thinkpad-x1-carbon-3.webp", alt: "Lenovo ThinkPad X1 Carbon con su teclado, visto en ángulo", origin: "externa", source: "File:Lenovo ThinkPad X1 Carbon 014 (10774123843).jpg", credit: { author: "TAKA@P.P.R.S", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Lenovo_ThinkPad_X1_Carbon_014_(10774123843).jpg", title: "Lenovo ThinkPad X1 Carbon 014 (10774123843).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/lenovo-thinkpad-x1-carbon-4.webp", alt: "Tarjeta de características de Lenovo ThinkPad X1 Carbon: Pantalla 14 pulgadas, RAM 16 GB, SSD 1 TB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/lenovo-thinkpad-x1-carbon-5.webp", alt: "Tarjeta de destacados de Lenovo ThinkPad X1 Carbon: Ligera y resistente, con el teclado de referencia para profesionales. Teclado de referencia ThinkPad, Diseño ligero y resistente, Pantalla de 14 pulgadas, 16 GB de RAM, SSD de 1 TB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/lenovo-thinkpad-x1-carbon-6.webp", alt: "Tarjeta de compra segura de Lenovo ThinkPad X1 Carbon: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "asus-vivobook-15": {
    tagline: "Tu laptop para estudiar: buen rendimiento a un precio accesible",
    highlights: [
      "Ideal para estudiantes",
      "Pantalla de 15,6 pulgadas",
      "8 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [
      { url: "/img/productos/galeria/asus-vivobook-15-1.webp", alt: "ASUS Vivobook 15 abierta, con su teclado y panel táctil", origin: "externa", source: "File:Asus Vivobook 15.jpg", credit: { author: "LeopardWin", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Asus_Vivobook_15.jpg", title: "Asus Vivobook 15.jpg" } },
      { url: "/img/productos/galeria/asus-vivobook-15-2.webp", alt: "ASUS VivoBook sobre un escritorio, vista de frente", origin: "externa", source: "File:A ASUS VivoBook on the desk.jpg", credit: { author: "Tosdos0012", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:A_ASUS_VivoBook_on_the_desk.jpg", title: "A ASUS VivoBook on the desk.jpg" } },
      { url: "/img/productos/galeria/asus-vivobook-15-3.webp", alt: "ASUS Vivobook de la familia X556 vista por detrás con su tapa texturizada", origin: "externa", source: "File:ASUS Vivobook X556UQ.jpg", credit: { author: "Denys Nyk.", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:ASUS_Vivobook_X556UQ.jpg", title: "ASUS Vivobook X556UQ.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/asus-vivobook-15-4.webp", alt: "Tarjeta de características de Asus Vivobook 15: Pantalla 15,6 pulgadas, RAM 8 GB, SSD 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/asus-vivobook-15-5.webp", alt: "Tarjeta de destacados de Asus Vivobook 15: Tu laptop para estudiar: buen rendimiento a un precio accesible. Ideal para estudiantes, Pantalla de 15,6 pulgadas, 8 GB de RAM, SSD de 512 GB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/asus-vivobook-15-6.webp", alt: "Tarjeta de compra segura de Asus Vivobook 15: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "asus-zenbook-14-oled": {
    tagline: "Pantalla OLED 2.8K y solo 1,2 kg: colores vivos y fácil de llevar",
    highlights: [
      "Pantalla OLED 2.8K de 14 pulgadas",
      "Pesa solo 1,2 kg",
      "16 GB de RAM",
      "SSD de 1 TB",
    ],
    photos: [
      { url: "/img/productos/galeria/asus-zenbook-14-oled-1.webp", alt: "Laptop ASUS de la línea Zenbook abierta y vista en ángulo (modelo anterior de la misma línea)", origin: "externa", source: "File:Asus x21 ultrabook.jpg", credit: { author: "Intel Free Press", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Asus_x21_ultrabook.jpg", title: "Asus x21 ultrabook.jpg" } },
      { url: "/img/productos/galeria/asus-zenbook-14-oled-2.webp", alt: "Laptop ASUS Zenbook UX305 abierta y vista en ángulo (modelo anterior de la misma línea)", origin: "externa", source: "File:ASUS ZenBook UX305.jpg", credit: { author: "Sinchen.Lin", license: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:ASUS_ZenBook_UX305.jpg", title: "ASUS ZenBook UX305.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/asus-zenbook-14-oled-3.webp", alt: "Tarjeta de características de Asus Zenbook 14 OLED: Pantalla 14 pulgadas OLED, RAM 16 GB, SSD 1 TB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/asus-zenbook-14-oled-4.webp", alt: "Tarjeta de destacados de Asus Zenbook 14 OLED: Pantalla OLED 2.8K y solo 1,2 kg: colores vivos y fácil de llevar. Pantalla OLED 2.8K de 14 pulgadas, Pesa solo 1,2 kg, 16 GB de RAM, SSD de 1 TB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/asus-zenbook-14-oled-5.webp", alt: "Tarjeta de compra segura de Asus Zenbook 14 OLED: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "acer-swift-go-14": {
    tagline: "Delgada, con Intel Core Ultra y cámara QHD para videollamadas nítidas",
    highlights: [
      "Intel Core Ultra",
      "Cámara QHD",
      "Diseño delgado",
      "Pantalla de 14 pulgadas",
      "16 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/acer-swift-go-14-1.webp", alt: "Laptop Acer Swift 7 abierta y vista en ángulo (modelo de la misma línea Swift)", origin: "externa", source: "File:Acer Swift 7 20201101b.jpg", credit: { author: "Solomon203", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Acer_Swift_7_20201101b.jpg", title: "Acer Swift 7 20201101b.jpg" } },
      { url: "/img/productos/galeria/acer-swift-go-14-2.webp", alt: "Laptop Acer Swift 7 en exhibición, vista de frente (modelo de la misma línea Swift)", origin: "externa", source: "File:Acer Swift 7 20201101a.jpg", credit: { author: "Solomon203", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Acer_Swift_7_20201101a.jpg", title: "Acer Swift 7 20201101a.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/acer-swift-go-14-3.webp", alt: "Tarjeta de características de Acer Swift Go 14: Pantalla 14 pulgadas, RAM 16 GB, SSD 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/acer-swift-go-14-4.webp", alt: "Tarjeta de destacados de Acer Swift Go 14: Delgada, con Intel Core Ultra y cámara QHD para videollamadas nítidas. Intel Core Ultra, Cámara QHD, Diseño delgado, Pantalla de 14 pulgadas, 16 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/acer-swift-go-14-5.webp", alt: "Tarjeta de compra segura de Acer Swift Go 14: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "msi-katana-15-gaming": {
    tagline: "RTX 4060 y pantalla de 144 Hz: potencia para jugar en serio",
    highlights: [
      "Gráficos RTX 4060",
      "Pantalla de 144 Hz de 15,6 pulgadas",
      "16 GB de RAM",
      "Pensada para juegos",
    ],
    photos: [
      { url: "/img/productos/galeria/msi-katana-15-gaming-1.webp", alt: "Laptop gamer MSI (línea Thin GF63, de la misma familia gamer) abierta y vista de frente", origin: "externa", source: "File:MSI Thin GF63 12UC-667 HOF2213-HDR RAW-Export.png", credit: { author: "PantheraLeo1359531", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:MSI_Thin_GF63_12UC-667_HOF2213-HDR_RAW-Export.png", title: "MSI Thin GF63 12UC-667 HOF2213-HDR RAW-Export.png" } },
      { url: "/img/productos/galeria/msi-katana-15-gaming-2.webp", alt: "Laptop gamer MSI vista en ángulo desde atrás, con el logotipo de dragón en la tapa", origin: "externa", source: "File:MSI Thin GF63 12UC-667 HOF2231-HDR RAW-Export.png", credit: { author: "PantheraLeo1359531", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:MSI_Thin_GF63_12UC-667_HOF2231-HDR_RAW-Export.png", title: "MSI Thin GF63 12UC-667 HOF2231-HDR RAW-Export.png" } },
      { url: "/img/productos/galeria/msi-katana-15-gaming-3.webp", alt: "Teclado con luz roja y panel táctil de una laptop gamer MSI", origin: "externa", source: "File:MSI Thin GF63 12UC-667 HOF2167 RAW-Export 1.png", credit: { author: "PantheraLeo1359531", license: "CC BY 4.0", url: "https://commons.wikimedia.org/wiki/File:MSI_Thin_GF63_12UC-667_HOF2167_RAW-Export_1.png", title: "MSI Thin GF63 12UC-667 HOF2167 RAW-Export 1.png" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/msi-katana-15-gaming-4.webp", alt: "Tarjeta de características de MSI Katana 15 Gaming: Pantalla 15,6 pulgadas 144 Hz, RAM 16 GB, GPU RTX 4060", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/msi-katana-15-gaming-5.webp", alt: "Tarjeta de destacados de MSI Katana 15 Gaming: RTX 4060 y pantalla de 144 Hz: potencia para jugar en serio. Gráficos RTX 4060, Pantalla de 144 Hz de 15,6 pulgadas, 16 GB de RAM, Pensada para juegos.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/msi-katana-15-gaming-6.webp", alt: "Tarjeta de compra segura de MSI Katana 15 Gaming: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "microsoft-surface-laptop-5": {
    tagline: "Pantalla táctil PixelSense y acabado en Alcantara: elegancia al tacto",
    highlights: [
      "Pantalla táctil PixelSense de 13,5 pulgadas",
      "Acabado en Alcantara",
      "8 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [
      { url: "/img/productos/galeria/microsoft-surface-laptop-5-1.webp", alt: "Microsoft Surface Laptop Go platino abierto, de la misma familia que el Surface Laptop 5", origin: "externa", source: "File:A platinum Microsoft Surface Laptop Go.jpg", credit: { author: "Ckazemi", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:A_platinum_Microsoft_Surface_Laptop_Go.jpg", title: "A platinum Microsoft Surface Laptop Go.jpg" } },
      { url: "/img/productos/galeria/microsoft-surface-laptop-5-2.webp", alt: "Microsoft Surface Laptop con teclado y reposamanos de Alcantara, visto en ángulo", origin: "externa", source: "File:SurfaceLaptop.png", credit: { author: "WikIan", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:SurfaceLaptop.png", title: "SurfaceLaptop.png" } },
      { url: "/img/productos/galeria/microsoft-surface-laptop-5-3.webp", alt: "Microsoft Surface Laptop 7 en color platino sobre su caja, abierta", origin: "externa", source: "File:Microsoft Surface Laptop 7.jpg", credit: { author: "StrangeApparition2011", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Microsoft_Surface_Laptop_7.jpg", title: "Microsoft Surface Laptop 7.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/microsoft-surface-laptop-5-4.webp", alt: "Tarjeta de características de Microsoft Surface Laptop 5: Pantalla 13,5 pulgadas, RAM 8 GB, SSD 512 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/microsoft-surface-laptop-5-5.webp", alt: "Tarjeta de destacados de Microsoft Surface Laptop 5: Pantalla táctil PixelSense y acabado en Alcantara: elegancia al tacto. Pantalla táctil PixelSense de 13,5 pulgadas, Acabado en Alcantara, 8 GB de RAM, SSD de 512 GB.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/microsoft-surface-laptop-5-6.webp", alt: "Tarjeta de compra segura de Microsoft Surface Laptop 5: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "ipad-10-generacion-64-gb": {
    tagline: "Pantalla Liquid Retina de 10,9 pulgadas y USB-C para estudiar, crear y jugar",
    highlights: [
      "Pantalla Liquid Retina de 10,9 pulgadas",
      "Puerto USB-C",
      "64 GB de almacenamiento",
    ],
    photos: [
      { url: "/img/productos/galeria/ipad-10-generacion-64-gb-1.webp", alt: "iPad de 10.ª generación en color rosa, visto por detrás", origin: "externa", source: "File:Ipadtenthgen.jpg", credit: { author: "Wiikiipediia", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Ipadtenthgen.jpg", title: "Ipadtenthgen.jpg" } },
      { url: "/img/productos/galeria/ipad-10-generacion-64-gb-2.webp", alt: "iPad de 10.ª generación con su teclado Magic Keyboard Folio, visto de frente", origin: "externa", source: "File:IPad 10th Generation 2024.jpg", credit: { author: "Captainmorlypogi1959", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:IPad_10th_Generation_2024.jpg", title: "IPad 10th Generation 2024.jpg" } },
      { url: "/img/productos/galeria/ipad-10-generacion-64-gb-3.webp", alt: "iPad de 10.ª generación con teclado y pantalla de ajustes encendida", origin: "externa", source: "File:About iPad (10th generation).jpg", credit: { author: "メイド理世", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:About_iPad_(10th_generation).jpg", title: "About iPad (10th generation).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/ipad-10-generacion-64-gb-4.webp", alt: "Tarjeta de características de iPad 10.ª generación 64 GB: Pantalla 10,9 pulgadas, Almacenamiento 64 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/ipad-10-generacion-64-gb-5.webp", alt: "Tarjeta de destacados de iPad 10.ª generación 64 GB: Pantalla Liquid Retina de 10,9 pulgadas y USB-C para estudiar, crear y jugar. Pantalla Liquid Retina de 10,9 pulgadas, Puerto USB-C, 64 GB de almacenamiento.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/ipad-10-generacion-64-gb-6.webp", alt: "Tarjeta de compra segura de iPad 10.ª generación 64 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "samsung-galaxy-tab-s9-128-gb": {
    tagline: "Dynamic AMOLED 2X, S Pen incluido y resistencia IP68 en una tablet de 11 pulgadas",
    highlights: [
      "Pantalla Dynamic AMOLED 2X de 11 pulgadas",
      "S Pen incluido",
      "Resistencia IP68",
      "8 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/samsung-galaxy-tab-s9-128-gb-1.webp", alt: "Samsung Galaxy Tab S9 con su S Pen, visto de frente", origin: "externa", source: "File:Samsung Galaxy Tab S9.png", credit: { author: "AnVuong1222004 (11)", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Samsung_Galaxy_Tab_S9.png", title: "Samsung Galaxy Tab S9.png" } },
      { url: "/img/productos/galeria/samsung-galaxy-tab-s9-128-gb-2.webp", alt: "Samsung Galaxy Tab S9 sobre su soporte con el S Pen", origin: "externa", source: "File:20230729 삼성 갤럭시 탭 S9.jpg", credit: { author: "Striker9498", license: "CC BY-SA 3.0", url: "https://commons.wikimedia.org/wiki/File:20230729_%EC%82%BC%EC%84%B1_%EA%B0%A4%EB%9F%AD%EC%8B%9C_%ED%83%AD_S9.jpg", title: "20230729 삼성 갤럭시 탭 S9.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/samsung-galaxy-tab-s9-128-gb-3.webp", alt: "Tarjeta de características de Samsung Galaxy Tab S9 128 GB: Pantalla 11 pulgadas, RAM 8 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/samsung-galaxy-tab-s9-128-gb-4.webp", alt: "Tarjeta de destacados de Samsung Galaxy Tab S9 128 GB: Dynamic AMOLED 2X, S Pen incluido y resistencia IP68 en una tablet de 11 pulgadas. Pantalla Dynamic AMOLED 2X de 11 pulgadas, S Pen incluido, Resistencia IP68, 8 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/samsung-galaxy-tab-s9-128-gb-5.webp", alt: "Tarjeta de compra segura de Samsung Galaxy Tab S9 128 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "xiaomi-pad-6-128-gb": {
    tagline: "Pantalla de 144 Hz y cuatro parlantes con Dolby Atmos para disfrutar al máximo",
    highlights: [
      "Pantalla de 11 pulgadas a 144 Hz",
      "Cuatro parlantes con Dolby Atmos",
      "6 GB de RAM",
      "128 GB de almacenamiento",
    ],
    photos: [
      { url: "/img/productos/galeria/xiaomi-pad-6-128-gb-1.webp", alt: "Xiaomi Pad 6 con la pantalla encendida", origin: "externa", source: "File:Xiaomi Pad 6 display.jpg", credit: { author: "Myrat", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:Xiaomi_Pad_6_display.jpg", title: "Xiaomi Pad 6 display.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/xiaomi-pad-6-128-gb-2.webp", alt: "Tarjeta de características de Xiaomi Pad 6 128 GB: Pantalla 11 pulgadas, RAM 6 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/xiaomi-pad-6-128-gb-3.webp", alt: "Tarjeta de destacados de Xiaomi Pad 6 128 GB: Pantalla de 144 Hz y cuatro parlantes con Dolby Atmos para disfrutar al máximo. Pantalla de 11 pulgadas a 144 Hz, Cuatro parlantes con Dolby Atmos, 6 GB de RAM, 128 GB de almacenamiento.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/xiaomi-pad-6-128-gb-4.webp", alt: "Tarjeta de compra segura de Xiaomi Pad 6 128 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "lenovo-tab-m10": {
    tagline: "La tablet de toda la familia: perfiles para niños y una gran batería",
    highlights: [
      "Perfiles para niños",
      "Gran batería",
      "Pantalla de 10,1 pulgadas",
      "4 GB de RAM",
    ],
    photos: [
      { url: "/img/productos/galeria/lenovo-tab-m10-1.webp", alt: "Lenovo Tab M10 FHD Plus", origin: "externa", source: "File:Lenovo Tab M10 FHD Plus (2026).jpg", credit: { author: "Gpkp", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Lenovo_Tab_M10_FHD_Plus_(2026).jpg", title: "Lenovo Tab M10 FHD Plus (2026).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/lenovo-tab-m10-2.webp", alt: "Tarjeta de características de Lenovo Tab M10: Pantalla 10,1 pulgadas, RAM 4 GB", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/lenovo-tab-m10-3.webp", alt: "Tarjeta de destacados de Lenovo Tab M10: La tablet de toda la familia: perfiles para niños y una gran batería. Perfiles para niños, Gran batería, Pantalla de 10,1 pulgadas, 4 GB de RAM.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/lenovo-tab-m10-4.webp", alt: "Tarjeta de compra segura de Lenovo Tab M10: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "bateria-para-celular-de-reemplazo": {
    tagline: "Energía de reemplazo para tu celular, con 6 meses de garantía",
    highlights: [
      "Iones de litio",
      "Capacidad de 3000 mAh",
      "Garantía de 6 meses",
      "Compatible con modelos populares",
    ],
    photos: [
      { url: "/img/productos/galeria/bateria-para-celular-de-reemplazo-1.webp", alt: "Batería de iones de litio para celular Samsung, vista frontal con su etiqueta", origin: "externa", source: "File:Samsung EB-L1G6LLU-9398.jpg", credit: { author: "Raimond Spekking", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Samsung_EB-L1G6LLU-9398.jpg", title: "Samsung EB-L1G6LLU-9398.jpg" } },
      { url: "/img/productos/galeria/bateria-para-celular-de-reemplazo-2.webp", alt: "Batería de iones de litio para celular LG, vista frontal", origin: "externa", source: "File:LG Li-Ion battery, Model BL-44JH-1805.jpg", credit: { author: "Raimond Spekking", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:LG_Li-Ion_battery,_Model_BL-44JH-1805.jpg", title: "LG Li-Ion battery, Model BL-44JH-1805.jpg" } },
      { url: "/img/productos/galeria/bateria-para-celular-de-reemplazo-3.webp", alt: "Batería de iones de litio para celular Nokia, vista en ángulo", origin: "externa", source: "File:Nokia 101 - Li-Ion battery BL-5CB-3266.jpg", credit: { author: "Raimond Spekking", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Nokia_101_-_Li-Ion_battery_BL-5CB-3266.jpg", title: "Nokia 101 - Li-Ion battery BL-5CB-3266.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/bateria-para-celular-de-reemplazo-4.webp", alt: "Tarjeta de características de Batería para celular de reemplazo: Capacidad 3000 mAh, Garantía 6 meses", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/bateria-para-celular-de-reemplazo-5.webp", alt: "Tarjeta de destacados de Batería para celular de reemplazo: Energía de reemplazo para tu celular, con 6 meses de garantía. Iones de litio, Capacidad de 3000 mAh, Garantía de 6 meses, Compatible con modelos populares.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/bateria-para-celular-de-reemplazo-6.webp", alt: "Tarjeta de compra segura de Batería para celular de reemplazo: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "bateria-para-laptop-6-celdas": {
    tagline: "Batería de 6 celdas para devolverle autonomía a tu laptop de 15 pulgadas",
    highlights: [
      "Batería de 6 celdas",
      "Voltaje de 11,1 V",
      "Para laptops de 15 pulgadas",
      "Batería de reemplazo",
    ],
    photos: [
      { url: "/img/productos/galeria/bateria-para-laptop-6-celdas-1.webp", alt: "Batería de laptop de 6 celdas, vista superior", origin: "externa", source: "File:Acer AC10D31 Li-ion battery pack-3588.jpg", credit: { author: "Raimond Spekking", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Acer_AC10D31_Li-ion_battery_pack-3588.jpg", title: "Acer AC10D31 Li-ion battery pack-3588.jpg" } },
      { url: "/img/productos/galeria/bateria-para-laptop-6-celdas-2.webp", alt: "Batería de iones de litio para laptop, vista en ángulo", origin: "externa", source: "File:Fujitsu Siemens Computers Amilo L7300 - Lithium ion battery-0150.jpg", credit: { author: "Raimond Spekking", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Fujitsu_Siemens_Computers_Amilo_L7300_-_Lithium_ion_battery-0150.jpg", title: "Fujitsu Siemens Computers Amilo L7300 - Lithium ion battery-0150.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/bateria-para-laptop-6-celdas-3.webp", alt: "Tarjeta de características de Batería para laptop 6 celdas: Celdas 6, Voltaje 11,1 V", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/bateria-para-laptop-6-celdas-4.webp", alt: "Tarjeta de destacados de Batería para laptop 6 celdas: Batería de 6 celdas para devolverle autonomía a tu laptop de 15 pulgadas. Batería de 6 celdas, Voltaje de 11,1 V, Para laptops de 15 pulgadas, Batería de reemplazo.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/bateria-para-laptop-6-celdas-5.webp", alt: "Tarjeta de compra segura de Batería para laptop 6 celdas: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "cooler-y-disipador-para-laptop": {
    tagline: "Ventilador y disipador de cobre para mantener fresca tu laptop",
    highlights: [
      "Disipador de cobre",
      "Ventilador incluido",
      "Conector de 4 pines",
      "Para laptops",
    ],
    photos: [
      { url: "/img/productos/galeria/cooler-y-disipador-para-laptop-1.webp", alt: "Dos conjuntos de ventilador y disipador de cobre para laptop", origin: "externa", source: "File:Dissipatore PC portatile.jpg", credit: { author: "A7N8X", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Dissipatore_PC_portatile.jpg", title: "Dissipatore PC portatile.jpg" } },
      { url: "/img/productos/galeria/cooler-y-disipador-para-laptop-2.webp", alt: "Conjunto de ventilador y disipador de cobre para laptop, sobre fondo verde", origin: "externa", source: "File:ThinkPad X220 CPU cooling system (fan and heatsink assembly).jpg", credit: { author: "Siarhei Besarab", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:ThinkPad_X220_CPU_cooling_system_(fan_and_heatsink_assembly).jpg", title: "ThinkPad X220 CPU cooling system (fan and heatsink assembly).jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/cooler-y-disipador-para-laptop-3.webp", alt: "Tarjeta de características de Cooler y disipador para laptop: Material Cobre, Conector 4 pines", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/cooler-y-disipador-para-laptop-4.webp", alt: "Tarjeta de destacados de Cooler y disipador para laptop: Ventilador y disipador de cobre para mantener fresca tu laptop. Disipador de cobre, Ventilador incluido, Conector de 4 pines, Para laptops.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/cooler-y-disipador-para-laptop-5.webp", alt: "Tarjeta de compra segura de Cooler y disipador para laptop: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "fairphone-modulo-de-camara": {
    tagline: "Repara tu Fairphone 4 y dale una segunda vida",
    highlights: [
      "Módulo de cámara reparable",
      "Compatible con Fairphone 4",
      "Repara sin cambiar de teléfono",
    ],
    photos: [
      { url: "/img/productos/galeria/fairphone-modulo-de-camara-1.webp", alt: "Módulos reparables de un Fairphone, entre ellos el módulo de cámara", origin: "externa", source: "File:Fairphone 3 modules on display.jpg", credit: { author: "PKFP", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Fairphone_3_modules_on_display.jpg", title: "Fairphone 3 modules on display.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/fairphone-modulo-de-camara-2.webp", alt: "Tarjeta de características de Fairphone módulo de cámara: Compatibilidad Fairphone 4", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/fairphone-modulo-de-camara-3.webp", alt: "Tarjeta de destacados de Fairphone módulo de cámara: Repara tu Fairphone 4 y dale una segunda vida. Módulo de cámara reparable, Compatible con Fairphone 4, Repara sin cambiar de teléfono.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/fairphone-modulo-de-camara-4.webp", alt: "Tarjeta de compra segura de Fairphone módulo de cámara: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "kit-de-herramientas-de-precision-32-en-1": {
    tagline: "32 piezas de precisión en un estuche para reparar celulares y laptops",
    highlights: [
      "32 piezas de precisión",
      "Incluye estuche",
      "Para celulares y laptops",
    ],
    photos: [
      { url: "/img/productos/galeria/kit-de-herramientas-de-precision-32-en-1-1.webp", alt: "Juego de destornilladores de precisión en su estuche", origin: "externa", source: "File:Precision Screwdriver Set 1.jpg", credit: { author: "oomlout", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Precision_Screwdriver_Set_1.jpg", title: "Precision Screwdriver Set 1.jpg" } },
      { url: "/img/productos/galeria/kit-de-herramientas-de-precision-32-en-1-2.webp", alt: "Juego de destornilladores de precisión, vista de las puntas", origin: "externa", source: "File:Precision Screwdriver Set 2.jpg", credit: { author: "oomlout", license: "CC BY-SA 2.0", url: "https://commons.wikimedia.org/wiki/File:Precision_Screwdriver_Set_2.jpg", title: "Precision Screwdriver Set 2.jpg" } },
      { url: "/img/productos/galeria/kit-de-herramientas-de-precision-32-en-1-3.webp", alt: "Juego de destornilladores de precisión para electrónica", origin: "externa", source: "File:Electronic Precision Screwdriver Set.jpg", credit: { author: "Project Kei", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Electronic_Precision_Screwdriver_Set.jpg", title: "Electronic Precision Screwdriver Set.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/kit-de-herramientas-de-precision-32-en-1-4.webp", alt: "Tarjeta de características de Kit de herramientas de precisión 32 en 1: Piezas 32, Estuche Sí", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/kit-de-herramientas-de-precision-32-en-1-5.webp", alt: "Tarjeta de destacados de Kit de herramientas de precisión 32 en 1: 32 piezas de precisión en un estuche para reparar celulares y laptops. 32 piezas de precisión, Incluye estuche, Para celulares y laptops.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/kit-de-herramientas-de-precision-32-en-1-6.webp", alt: "Tarjeta de compra segura de Kit de herramientas de precisión 32 en 1: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "pasta-termica-4-g": {
    tagline: "Alta conductividad de 8,5 W/mK para procesadores y GPU más frescos",
    highlights: [
      "Conductividad de 8,5 W/mK",
      "Contenido de 4 g",
      "Para procesadores y GPU",
    ],
    photos: [
      { url: "/img/productos/galeria/pasta-termica-4-g-1.webp", alt: "Jeringa de pasta térmica Thermal Grizzly sobre fondo blanco", origin: "externa", source: "File:2023 Thermal Grizzly Kryonaut.jpg", credit: { author: "Jacek Halicki", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:2023_Thermal_Grizzly_Kryonaut.jpg", title: "2023 Thermal Grizzly Kryonaut.jpg" } },
      { url: "/img/productos/galeria/pasta-termica-4-g-2.webp", alt: "Jeringa de pasta térmica Arctic MX-2", origin: "externa", source: "File:Arctic - thermal compound (valo139).jpg", credit: { author: "Valo139", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Arctic_-_thermal_compound_(valo139).jpg", title: "Arctic - thermal compound (valo139).jpg" } },
      { url: "/img/productos/galeria/pasta-termica-4-g-3.webp", alt: "Jeringa de pasta térmica de alta conductividad con tapa roja", origin: "externa", source: "File:Hutixi HT-GY260 thermal paste.jpg", credit: { author: "Suyash Dwivedi", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Hutixi_HT-GY260_thermal_paste.jpg", title: "Hutixi HT-GY260 thermal paste.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/pasta-termica-4-g-4.webp", alt: "Tarjeta de características de Pasta térmica 4 g: Conductividad 8,5 W/mK, Peso 4 g", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/pasta-termica-4-g-5.webp", alt: "Tarjeta de destacados de Pasta térmica 4 g: Alta conductividad de 8,5 W/mK para procesadores y GPU más frescos. Conductividad de 8,5 W/mK, Contenido de 4 g, Para procesadores y GPU.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/pasta-termica-4-g-6.webp", alt: "Tarjeta de compra segura de Pasta térmica 4 g: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "memoria-ram-ddr4-16-gb": {
    tagline: "Más memoria para tu laptop: 16 GB DDR4 a 3200 MHz",
    highlights: [
      "Capacidad de 16 GB",
      "Velocidad de 3200 MHz",
      "Formato SO-DIMM para laptops",
      "Memoria DDR4",
    ],
    photos: [
      { url: "/img/productos/galeria/memoria-ram-ddr4-16-gb-1.webp", alt: "Memoria RAM DDR4 SO-DIMM de 16 GB, cara frontal con su etiqueta", origin: "externa", source: "File:DDR 4 RAM SO-DIMM 16GB by Micron-top front PNr°0840.jpg", credit: { author: "D-Kuru", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:DDR_4_RAM_SO-DIMM_16GB_by_Micron-top_front_PNr%C2%B00840.jpg", title: "DDR 4 RAM SO-DIMM 16GB by Micron-top front PNr°0840.jpg" } },
      { url: "/img/productos/galeria/memoria-ram-ddr4-16-gb-2.webp", alt: "Memoria RAM DDR4 SO-DIMM de 16 GB, cara posterior", origin: "externa", source: "File:DDR 4 RAM SO-DIMM 16GB by Micron-top back PNr°0841.jpg", credit: { author: "D-Kuru", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:DDR_4_RAM_SO-DIMM_16GB_by_Micron-top_back_PNr%C2%B00841.jpg", title: "DDR 4 RAM SO-DIMM 16GB by Micron-top back PNr°0841.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/memoria-ram-ddr4-16-gb-3.webp", alt: "Tarjeta de características de Memoria RAM DDR4 16 GB: Capacidad 16 GB, Velocidad 3200 MHz", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/memoria-ram-ddr4-16-gb-4.webp", alt: "Tarjeta de destacados de Memoria RAM DDR4 16 GB: Más memoria para tu laptop: 16 GB DDR4 a 3200 MHz. Capacidad de 16 GB, Velocidad de 3200 MHz, Formato SO-DIMM para laptops, Memoria DDR4.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/memoria-ram-ddr4-16-gb-5.webp", alt: "Tarjeta de compra segura de Memoria RAM DDR4 16 GB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "ssd-nvme-1-tb": {
    tagline: "1 TB de almacenamiento NVMe con lectura de hasta 7000 MB/s",
    highlights: [
      "Capacidad de 1 TB",
      "Interfaz PCIe 4.0",
      "Lectura de hasta 7000 MB/s",
      "Formato M.2",
    ],
    photos: [
      { url: "/img/productos/galeria/ssd-nvme-1-tb-1.webp", alt: "SSD NVMe PCIe 4.0 de 1 TB, vista superior", origin: "externa", source: "File:Samsung 980 PRO PCIe 4.0 NVMe SSD 1TB-top PNr°0915.jpg", credit: { author: "D-Kuru", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Samsung_980_PRO_PCIe_4.0_NVMe_SSD_1TB-top_PNr%C2%B00915.jpg", title: "Samsung 980 PRO PCIe 4.0 NVMe SSD 1TB-top PNr°0915.jpg" } },
      { url: "/img/productos/galeria/ssd-nvme-1-tb-2.webp", alt: "SSD NVMe PCIe 4.0 de 1 TB, vista inferior", origin: "externa", source: "File:Samsung 980 PRO PCIe 4.0 NVMe SSD 1TB-bottom PNr°0916.jpg", credit: { author: "D-Kuru", license: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Samsung_980_PRO_PCIe_4.0_NVMe_SSD_1TB-bottom_PNr%C2%B00916.jpg", title: "Samsung 980 PRO PCIe 4.0 NVMe SSD 1TB-bottom PNr°0916.jpg" } },
      { url: "/img/productos/galeria/ssd-nvme-1-tb-3.webp", alt: "SSD NVMe M.2 2280 de 1 TB", origin: "externa", source: "File:1TB 2280 NVME SSD.jpg", credit: { author: "User5515", license: "CC0", url: "https://commons.wikimedia.org/wiki/File:1TB_2280_NVME_SSD.jpg", title: "1TB 2280 NVME SSD.jpg" } },
      // tarjetas (las genera scripts/fotos/tarjetas.ts)
      { url: "/img/productos/galeria/ssd-nvme-1-tb-4.webp", alt: "Tarjeta de características de SSD NVMe 1 TB: Capacidad 1 TB, Interfaz PCIe 4.0", origin: "tarjeta", card: "caracteristicas" },
      { url: "/img/productos/galeria/ssd-nvme-1-tb-5.webp", alt: "Tarjeta de destacados de SSD NVMe 1 TB: 1 TB de almacenamiento NVMe con lectura de hasta 7000 MB/s. Capacidad de 1 TB, Interfaz PCIe 4.0, Lectura de hasta 7000 MB/s, Formato M.2.", origin: "tarjeta", card: "destacados" },
      { url: "/img/productos/galeria/ssd-nvme-1-tb-6.webp", alt: "Tarjeta de compra segura de SSD NVMe 1 TB: pago con tarjeta, Yape o Plin, transferencia o WhatsApp; delivery por zona o recojo en tienda; precios con IGV incluido.", origin: "tarjeta", card: "compra" },
    ],
  },
  "samsung-galaxy-s10-descontinuado": {
    tagline: "",
    highlights: [],
    photos: [{ url: "/img/generico.svg", alt: "Samsung Galaxy S10 (descontinuado)", origin: "proyecto" }],
  },
};
