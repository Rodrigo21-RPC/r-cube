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
    photos: [{ url: "/img/productos/celular-iphone-15-pro.jpg", alt: "iPhone 15 Pro 256 GB", origin: "proyecto", source: "celular-iphone-15-pro.jpg" }],
  },
  "iphone-13-pro-128-gb": {
    tagline: "Fluidez de 120 Hz y triple cámara para grabar y fotografiar como un profesional",
    highlights: [
      "Pantalla ProMotion de 120 Hz",
      "Triple cámara de 12 MP",
      "Pantalla de 6,1 pulgadas",
      "128 GB de almacenamiento",
    ],
    photos: [{ url: "/img/productos/iphone-13-pro.jpg", alt: "iPhone 13 Pro 128 GB", origin: "proyecto", source: "iphone-13-pro.jpg" }],
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
    photos: [{ url: "/img/productos/celular-iphone-se.jpg", alt: "iPhone SE 64 GB", origin: "proyecto", source: "celular-iphone-se.jpg" }],
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
    photos: [{ url: "/img/productos/celular-galaxy-s23.png", alt: "Samsung Galaxy S23 256 GB", origin: "proyecto", source: "celular-galaxy-s23.png" }],
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
    photos: [{ url: "/img/productos/galaxy-s22-ultra.jpg", alt: "Samsung Galaxy S22 Ultra 256 GB", origin: "proyecto", source: "galaxy-s22-ultra.jpg" }],
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
    photos: [{ url: "/img/productos/celular-redmi-note-12.jpg", alt: "Xiaomi Redmi Note 12 128 GB", origin: "proyecto", source: "celular-redmi-note-12.jpg" }],
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
    photos: [{ url: "/img/productos/xiaomi-13t-pro.jpg", alt: "Xiaomi 13T Pro 512 GB", origin: "proyecto", source: "xiaomi-13t-pro.jpg" }],
  },
  "motorola-edge-60-pro": {
    tagline: "Pantalla curva pOLED y resistencia IP68: elegancia que aguanta el día a día",
    highlights: [
      "Pantalla curva pOLED de 6,7 pulgadas",
      "Resistencia IP68",
      "Cámara de 50 MP",
      "12 GB de RAM",
    ],
    photos: [{ url: "/img/productos/celular-motorola-edge-60-pro.jpg", alt: "Motorola Edge 60 Pro", origin: "proyecto", source: "celular-motorola-edge-60-pro.jpg" }],
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
    photos: [{ url: "/img/productos/celular-pixel-8.png", alt: "Google Pixel 8 128 GB", origin: "proyecto", source: "celular-pixel-8.png" }],
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
    photos: [{ url: "/img/productos/celular-huawei-p60.jpg", alt: "Huawei P60", origin: "proyecto", source: "celular-huawei-p60.jpg" }],
  },
  "sony-xperia-z5": {
    tagline: "Un clásico resistente al agua con cámara de 23 MP",
    highlights: [
      "Resistente al agua",
      "Cámara de 23 MP",
      "Pantalla de 5,2 pulgadas",
    ],
    photos: [{ url: "/img/productos/celular-sony-xperia-z5.jpg", alt: "Sony Xperia Z5", origin: "proyecto", source: "celular-sony-xperia-z5.jpg" }],
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
    photos: [{ url: "/img/productos/celular-oneplus-13r.jpg", alt: "OnePlus 13R", origin: "proyecto", source: "celular-oneplus-13r.jpg" }],
  },
  "nothing-phone-2": {
    tagline: "Interfaz Glyph y Nothing OS limpio: un celular que se hace notar",
    highlights: [
      "Interfaz Glyph en la parte trasera",
      "Nothing OS limpio",
      "Pantalla de 6,7 pulgadas",
      "12 GB de RAM",
    ],
    photos: [{ url: "/img/productos/celular-nothing-phone-2.png", alt: "Nothing Phone (2)", origin: "proyecto", source: "celular-nothing-phone-2.png" }],
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
    photos: [{ url: "/img/productos/macbook-air-m1.png", alt: "MacBook Air M1 256 GB", origin: "proyecto", source: "macbook-air-m1.png" }],
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
    photos: [{ url: "/img/productos/laptop-macbook-pro-16.jpg", alt: "MacBook Pro 16 M3 Pro", origin: "proyecto", source: "laptop-macbook-pro-16.jpg" }],
  },
  "dell-xps-13": {
    tagline: "Ultraportátil de aluminio con pantalla InfinityEdge para llevarla a todas partes",
    highlights: [
      "Pantalla InfinityEdge de 13,4 pulgadas",
      "Construcción en aluminio",
      "16 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [{ url: "/img/productos/laptop-dell-xps.jpg", alt: "Dell XPS 13", origin: "proyecto", source: "laptop-dell-xps.jpg" }],
  },
  "dell-inspiron-15": {
    tagline: "Confiable para estudiar y trabajar, con teclado numérico incluido",
    highlights: [
      "Teclado numérico",
      "Pantalla de 15,6 pulgadas",
      "8 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [{ url: "/img/productos/laptop-dell-inspiron.png", alt: "Dell Inspiron 15", origin: "proyecto", source: "laptop-dell-inspiron.png" }],
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
    photos: [{ url: "/img/productos/laptop-hp-pavilion.jpg", alt: "HP Pavilion 15", origin: "proyecto", source: "laptop-hp-pavilion.jpg" }],
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
    photos: [{ url: "/img/productos/laptop-hp-spectre.png", alt: "HP Spectre x360", origin: "proyecto", source: "laptop-hp-spectre.png" }],
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
    photos: [{ url: "/img/productos/laptop-thinkpad-x1-carbon.jpg", alt: "Lenovo ThinkPad X1 Carbon", origin: "proyecto", source: "laptop-thinkpad-x1-carbon.jpg" }],
  },
  "asus-vivobook-15": {
    tagline: "Tu laptop para estudiar: buen rendimiento a un precio accesible",
    highlights: [
      "Ideal para estudiantes",
      "Pantalla de 15,6 pulgadas",
      "8 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [{ url: "/img/productos/laptop-asus-vivobook.jpg", alt: "Asus Vivobook 15", origin: "proyecto", source: "laptop-asus-vivobook.jpg" }],
  },
  "asus-zenbook-14-oled": {
    tagline: "Pantalla OLED 2.8K y solo 1,2 kg: colores vivos y fácil de llevar",
    highlights: [
      "Pantalla OLED 2.8K de 14 pulgadas",
      "Pesa solo 1,2 kg",
      "16 GB de RAM",
      "SSD de 1 TB",
    ],
    photos: [{ url: "/img/productos/laptop-asus-zenbook.jpg", alt: "Asus Zenbook 14 OLED", origin: "proyecto", source: "laptop-asus-zenbook.jpg" }],
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
    photos: [{ url: "/img/productos/laptop-acer-swift.jpg", alt: "Acer Swift Go 14", origin: "proyecto", source: "laptop-acer-swift.jpg" }],
  },
  "msi-katana-15-gaming": {
    tagline: "RTX 4060 y pantalla de 144 Hz: potencia para jugar en serio",
    highlights: [
      "Gráficos RTX 4060",
      "Pantalla de 144 Hz de 15,6 pulgadas",
      "16 GB de RAM",
      "Pensada para juegos",
    ],
    photos: [{ url: "/img/productos/laptop-msi-gaming.png", alt: "MSI Katana 15 Gaming", origin: "proyecto", source: "laptop-msi-gaming.png" }],
  },
  "microsoft-surface-laptop-5": {
    tagline: "Pantalla táctil PixelSense y acabado en Alcantara: elegancia al tacto",
    highlights: [
      "Pantalla táctil PixelSense de 13,5 pulgadas",
      "Acabado en Alcantara",
      "8 GB de RAM",
      "SSD de 512 GB",
    ],
    photos: [{ url: "/img/productos/laptop-surface-laptop.png", alt: "Microsoft Surface Laptop 5", origin: "proyecto", source: "laptop-surface-laptop.png" }],
  },
  "ipad-10-generacion-64-gb": {
    tagline: "Pantalla Liquid Retina de 10,9 pulgadas y USB-C para estudiar, crear y jugar",
    highlights: [
      "Pantalla Liquid Retina de 10,9 pulgadas",
      "Puerto USB-C",
      "64 GB de almacenamiento",
    ],
    photos: [{ url: "/img/generico.svg", alt: "iPad 10.ª generación 64 GB", origin: "proyecto" }],
  },
  "samsung-galaxy-tab-s9-128-gb": {
    tagline: "Dynamic AMOLED 2X, S Pen incluido y resistencia IP68 en una tablet de 11 pulgadas",
    highlights: [
      "Pantalla Dynamic AMOLED 2X de 11 pulgadas",
      "S Pen incluido",
      "Resistencia IP68",
      "8 GB de RAM",
    ],
    photos: [{ url: "/img/generico.svg", alt: "Samsung Galaxy Tab S9 128 GB", origin: "proyecto" }],
  },
  "xiaomi-pad-6-128-gb": {
    tagline: "Pantalla de 144 Hz y cuatro parlantes con Dolby Atmos para disfrutar al máximo",
    highlights: [
      "Pantalla de 11 pulgadas a 144 Hz",
      "Cuatro parlantes con Dolby Atmos",
      "6 GB de RAM",
      "128 GB de almacenamiento",
    ],
    photos: [{ url: "/img/generico.svg", alt: "Xiaomi Pad 6 128 GB", origin: "proyecto" }],
  },
  "lenovo-tab-m10": {
    tagline: "La tablet de toda la familia: perfiles para niños y una gran batería",
    highlights: [
      "Perfiles para niños",
      "Gran batería",
      "Pantalla de 10,1 pulgadas",
      "4 GB de RAM",
    ],
    photos: [{ url: "/img/generico.svg", alt: "Lenovo Tab M10", origin: "proyecto" }],
  },
  "bateria-para-celular-de-reemplazo": {
    tagline: "Energía de reemplazo para tu celular, con 6 meses de garantía",
    highlights: [
      "Iones de litio",
      "Capacidad de 3000 mAh",
      "Garantía de 6 meses",
      "Compatible con modelos populares",
    ],
    photos: [{ url: "/img/productos/repuesto-bateria-celular.jpg", alt: "Batería para celular de reemplazo", origin: "proyecto", source: "repuesto-bateria-celular.jpg" }],
  },
  "bateria-para-laptop-6-celdas": {
    tagline: "Batería de 6 celdas para devolverle autonomía a tu laptop de 15 pulgadas",
    highlights: [
      "Batería de 6 celdas",
      "Voltaje de 11,1 V",
      "Para laptops de 15 pulgadas",
      "Batería de reemplazo",
    ],
    photos: [{ url: "/img/productos/repuesto-bateria-laptop.jpg", alt: "Batería para laptop 6 celdas", origin: "proyecto", source: "repuesto-bateria-laptop.jpg" }],
  },
  "cooler-y-disipador-para-laptop": {
    tagline: "Ventilador y disipador de cobre para mantener fresca tu laptop",
    highlights: [
      "Disipador de cobre",
      "Ventilador incluido",
      "Conector de 4 pines",
      "Para laptops",
    ],
    photos: [{ url: "/img/productos/repuesto-cooler-heatsink.jpg", alt: "Cooler y disipador para laptop", origin: "proyecto", source: "repuesto-cooler-heatsink.jpg" }],
  },
  "fairphone-modulo-de-camara": {
    tagline: "Repara tu Fairphone 4 y dale una segunda vida",
    highlights: [
      "Módulo de cámara reparable",
      "Compatible con Fairphone 4",
      "Repara sin cambiar de teléfono",
    ],
    photos: [{ url: "/img/productos/repuesto-fairphone-modular.jpg", alt: "Fairphone módulo de cámara", origin: "proyecto", source: "repuesto-fairphone-modular.jpg" }],
  },
  "kit-de-herramientas-de-precision-32-en-1": {
    tagline: "32 piezas de precisión en un estuche para reparar celulares y laptops",
    highlights: [
      "32 piezas de precisión",
      "Incluye estuche",
      "Para celulares y laptops",
    ],
    photos: [{ url: "/img/productos/repuesto-kit-herramientas.jpg", alt: "Kit de herramientas de precisión 32 en 1", origin: "proyecto", source: "repuesto-kit-herramientas.jpg" }],
  },
  "pasta-termica-4-g": {
    tagline: "Alta conductividad de 8,5 W/mK para procesadores y GPU más frescos",
    highlights: [
      "Conductividad de 8,5 W/mK",
      "Contenido de 4 g",
      "Para procesadores y GPU",
    ],
    photos: [{ url: "/img/productos/repuesto-pasta-termica.jpg", alt: "Pasta térmica 4 g", origin: "proyecto", source: "repuesto-pasta-termica.jpg" }],
  },
  "memoria-ram-ddr4-16-gb": {
    tagline: "Más memoria para tu laptop: 16 GB DDR4 a 3200 MHz",
    highlights: [
      "Capacidad de 16 GB",
      "Velocidad de 3200 MHz",
      "Formato SO-DIMM para laptops",
      "Memoria DDR4",
    ],
    photos: [{ url: "/img/productos/repuesto-ram-modulos.jpg", alt: "Memoria RAM DDR4 16 GB", origin: "proyecto", source: "repuesto-ram-modulos.jpg" }],
  },
  "ssd-nvme-1-tb": {
    tagline: "1 TB de almacenamiento NVMe con lectura de hasta 7000 MB/s",
    highlights: [
      "Capacidad de 1 TB",
      "Interfaz PCIe 4.0",
      "Lectura de hasta 7000 MB/s",
      "Formato M.2",
    ],
    photos: [{ url: "/img/productos/repuesto-ssd-nvme.jpg", alt: "SSD NVMe 1 TB", origin: "proyecto", source: "repuesto-ssd-nvme.jpg" }],
  },
  "samsung-galaxy-s10-descontinuado": {
    tagline: "",
    highlights: [],
    photos: [{ url: "/img/generico.svg", alt: "Samsung Galaxy S10 (descontinuado)", origin: "proyecto" }],
  },
};
