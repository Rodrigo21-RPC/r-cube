import { sql } from "drizzle-orm";
import type { Db } from "./client";
import * as s from "./schema";
import { buildSearchText } from "../shared/search";
import { orderTotals } from "../shared/money";
import { hashPassword } from "../worker/password";

/** Datos de demostración de REQUISITOS §6 (FR-035, FR-036). Repetible: borra y vuelve a crear. */

const CATEGORIES = [
  { id: "cat-celulares", name: "Celulares", slug: "celulares" },
  { id: "cat-laptops", name: "Laptops", slug: "laptops" },
  { id: "cat-tablets", name: "Tablets", slug: "tablets" },
  { id: "cat-accesorios", name: "Accesorios y repuestos", slug: "accesorios-y-repuestos" },
];

const BRANDS = [
  "Apple", "Samsung", "Xiaomi", "Motorola", "Google", "Huawei", "Sony", "OnePlus", "Nothing",
  "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI", "Microsoft", "Kingston", "Fairphone", "R Cube Pro",
];
const slugify = (t: string) =>
  t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type P = {
  name: string; brand: string; cat: "celulares" | "laptops" | "tablets" | "accesorios";
  price: number; before?: number; stock: number; img?: string; active?: boolean;
  desc: string; specs: [string, string][];
};

const PRODUCTS: P[] = [
  { name: "iPhone 15 Pro 256 GB", brand: "Apple", cat: "celulares", price: 4899, before: 5299, stock: 12, img: "celular-iphone-15-pro.jpg", desc: "Diseño en titanio, chip A17 Pro y cámara principal de 48 MP con zoom óptico de 3x.", specs: [["Pantalla", "6,1 pulgadas"], ["Almacenamiento", "256 GB"], ["Cámara", "48 MP"], ["Batería", "Hasta 23 h de video"]] },
  { name: "iPhone 13 Pro 128 GB", brand: "Apple", cat: "celulares", price: 2999, stock: 4, img: "iphone-13-pro.jpg", desc: "Pantalla ProMotion de 120 Hz y triple cámara para foto y video profesional.", specs: [["Pantalla", "6,1 pulgadas"], ["Almacenamiento", "128 GB"], ["Cámara", "12 MP triple"]] },
  { name: "iPhone SE 64 GB", brand: "Apple", cat: "celulares", price: 1699, stock: 9, img: "celular-iphone-se.jpg", desc: "Compacto, con Touch ID y el rendimiento del chip A15 Bionic.", specs: [["Pantalla", "4,7 pulgadas"], ["Almacenamiento", "64 GB"], ["Cámara", "12 MP"]] },
  { name: "Samsung Galaxy S23 256 GB", brand: "Samsung", cat: "celulares", price: 2999, before: 3499, stock: 15, img: "celular-galaxy-s23.png", desc: "Snapdragon 8 Gen 2, cámara de 50 MP con modo noche y pantalla Dynamic AMOLED 2X.", specs: [["Pantalla", "6,1 pulgadas"], ["RAM", "8 GB"], ["Almacenamiento", "256 GB"]] },
  { name: "Samsung Galaxy S22 Ultra 256 GB", brand: "Samsung", cat: "celulares", price: 3299, stock: 0, img: "galaxy-s22-ultra.jpg", desc: "S Pen integrado, zoom espacial de 100x y pantalla de 6,8 pulgadas.", specs: [["Pantalla", "6,8 pulgadas"], ["RAM", "12 GB"], ["Cámara", "108 MP"]] },
  { name: "Xiaomi Redmi Note 12 128 GB", brand: "Xiaomi", cat: "celulares", price: 899, stock: 30, img: "celular-redmi-note-12.jpg", desc: "Pantalla AMOLED de 120 Hz, carga rápida de 33 W y gran batería.", specs: [["Pantalla", "6,67 pulgadas"], ["RAM", "6 GB"], ["Batería", "5000 mAh"]] },
  { name: "Xiaomi 13T Pro 512 GB", brand: "Xiaomi", cat: "celulares", price: 3199, before: 3599, stock: 6, img: "xiaomi-13t-pro.jpg", desc: "Óptica Leica, carga de 120 W y procesador Dimensity 9200+.", specs: [["Pantalla", "6,67 pulgadas"], ["RAM", "12 GB"], ["Almacenamiento", "512 GB"]] },
  { name: "Motorola Edge 60 Pro", brand: "Motorola", cat: "celulares", price: 2199, stock: 8, img: "celular-motorola-edge-60-pro.jpg", desc: "Pantalla curva pOLED, resistencia IP68 y cámara de 50 MP.", specs: [["Pantalla", "6,7 pulgadas"], ["RAM", "12 GB"], ["Resistencia", "IP68"]] },
  { name: "Google Pixel 8 128 GB", brand: "Google", cat: "celulares", price: 2799, stock: 5, img: "celular-pixel-8.png", desc: "Chip Tensor G3 y fotografía computacional con las funciones de IA de Google.", specs: [["Pantalla", "6,2 pulgadas"], ["RAM", "8 GB"], ["Cámara", "50 MP"]] },
  { name: "Huawei P60", brand: "Huawei", cat: "celulares", price: 2599, stock: 3, img: "celular-huawei-p60.jpg", desc: "Cámara XMAGE con apertura variable y diseño elegante.", specs: [["Pantalla", "6,67 pulgadas"], ["RAM", "8 GB"], ["Almacenamiento", "256 GB"]] },
  { name: "Sony Xperia Z5", brand: "Sony", cat: "celulares", price: 799, stock: 2, img: "celular-sony-xperia-z5.jpg", desc: "Clásico resistente al agua con cámara de 23 MP.", specs: [["Pantalla", "5,2 pulgadas"], ["Cámara", "23 MP"]] },
  { name: "OnePlus 13R", brand: "OnePlus", cat: "celulares", price: 2499, stock: 7, img: "celular-oneplus-13r.jpg", desc: "Snapdragon 8 Gen 3, batería de 6000 mAh y carga de 80 W.", specs: [["Pantalla", "6,78 pulgadas"], ["RAM", "12 GB"], ["Batería", "6000 mAh"]] },
  { name: "Nothing Phone (2)", brand: "Nothing", cat: "celulares", price: 2299, stock: 0, img: "celular-nothing-phone-2.png", desc: "Interfaz Glyph en la parte trasera y Nothing OS limpio.", specs: [["Pantalla", "6,7 pulgadas"], ["RAM", "12 GB"]] },
  { name: "MacBook Air M1 256 GB", brand: "Apple", cat: "laptops", price: 3499, before: 3999, stock: 10, img: "macbook-air-m1.png", desc: "Chip M1, sin ventilador y con hasta 18 horas de batería.", specs: [["Pantalla", "13,3 pulgadas"], ["RAM", "8 GB"], ["SSD", "256 GB"]] },
  { name: "MacBook Pro 16 M3 Pro", brand: "Apple", cat: "laptops", price: 10999, stock: 3, img: "laptop-macbook-pro-16.jpg", desc: "Pantalla Liquid Retina XDR y rendimiento profesional para edición.", specs: [["Pantalla", "16,2 pulgadas"], ["RAM", "18 GB"], ["SSD", "512 GB"]] },
  { name: "Dell XPS 13", brand: "Dell", cat: "laptops", price: 5799, stock: 4, img: "laptop-dell-xps.jpg", desc: "Ultraportátil con pantalla InfinityEdge y construcción en aluminio.", specs: [["Pantalla", "13,4 pulgadas"], ["RAM", "16 GB"], ["SSD", "512 GB"]] },
  { name: "Dell Inspiron 15", brand: "Dell", cat: "laptops", price: 2599, stock: 11, img: "laptop-dell-inspiron.png", desc: "Equipo confiable para estudio y oficina con teclado numérico.", specs: [["Pantalla", "15,6 pulgadas"], ["RAM", "8 GB"], ["SSD", "512 GB"]] },
  { name: "HP Pavilion 15", brand: "HP", cat: "laptops", price: 2799, before: 3199, stock: 9, img: "laptop-hp-pavilion.jpg", desc: "Procesador Intel Core i7 y audio B&O para el día a día.", specs: [["Pantalla", "15,6 pulgadas"], ["RAM", "16 GB"], ["SSD", "512 GB"]] },
  { name: "HP Spectre x360", brand: "HP", cat: "laptops", price: 6499, stock: 2, img: "laptop-hp-spectre.png", desc: "Convertible 2 en 1 con pantalla OLED táctil y lápiz incluido.", specs: [["Pantalla", "14 pulgadas OLED"], ["RAM", "16 GB"], ["SSD", "1 TB"]] },
  { name: "Lenovo ThinkPad X1 Carbon", brand: "Lenovo", cat: "laptops", price: 7299, stock: 5, img: "laptop-thinkpad-x1-carbon.jpg", desc: "Ligera, resistente y con el teclado de referencia para profesionales.", specs: [["Pantalla", "14 pulgadas"], ["RAM", "16 GB"], ["SSD", "1 TB"]] },
  { name: "Asus Vivobook 15", brand: "Asus", cat: "laptops", price: 1999, stock: 14, img: "laptop-asus-vivobook.jpg", desc: "Buena relación precio y rendimiento para estudiantes.", specs: [["Pantalla", "15,6 pulgadas"], ["RAM", "8 GB"], ["SSD", "512 GB"]] },
  { name: "Asus Zenbook 14 OLED", brand: "Asus", cat: "laptops", price: 4299, stock: 6, img: "laptop-asus-zenbook.jpg", desc: "Pantalla OLED 2.8K y peso de solo 1,2 kg.", specs: [["Pantalla", "14 pulgadas OLED"], ["RAM", "16 GB"], ["SSD", "1 TB"]] },
  { name: "Acer Swift Go 14", brand: "Acer", cat: "laptops", price: 3299, stock: 0, img: "laptop-acer-swift.jpg", desc: "Delgada, con Intel Core Ultra y cámara QHD.", specs: [["Pantalla", "14 pulgadas"], ["RAM", "16 GB"], ["SSD", "512 GB"]] },
  { name: "MSI Katana 15 Gaming", brand: "MSI", cat: "laptops", price: 5499, stock: 4, img: "laptop-msi-gaming.png", desc: "RTX 4060 y pantalla de 144 Hz para jugar en serio.", specs: [["Pantalla", "15,6 pulgadas 144 Hz"], ["RAM", "16 GB"], ["GPU", "RTX 4060"]] },
  { name: "Microsoft Surface Laptop 5", brand: "Microsoft", cat: "laptops", price: 4999, stock: 3, img: "laptop-surface-laptop.png", desc: "Pantalla táctil PixelSense y acabado en Alcantara.", specs: [["Pantalla", "13,5 pulgadas"], ["RAM", "8 GB"], ["SSD", "512 GB"]] },
  { name: "iPad 10.ª generación 64 GB", brand: "Apple", cat: "tablets", price: 1899, stock: 8, desc: "Pantalla Liquid Retina de 10,9 pulgadas y USB-C.", specs: [["Pantalla", "10,9 pulgadas"], ["Almacenamiento", "64 GB"]] },
  { name: "Samsung Galaxy Tab S9 128 GB", brand: "Samsung", cat: "tablets", price: 3299, before: 3699, stock: 5, desc: "Pantalla Dynamic AMOLED 2X, S Pen incluido y resistencia IP68.", specs: [["Pantalla", "11 pulgadas"], ["RAM", "8 GB"]] },
  { name: "Xiaomi Pad 6 128 GB", brand: "Xiaomi", cat: "tablets", price: 1499, stock: 0, desc: "Pantalla de 144 Hz y cuatro parlantes con Dolby Atmos.", specs: [["Pantalla", "11 pulgadas"], ["RAM", "6 GB"]] },
  { name: "Lenovo Tab M10", brand: "Lenovo", cat: "tablets", price: 699, stock: 20, desc: "Tablet familiar con perfiles para niños y gran batería.", specs: [["Pantalla", "10,1 pulgadas"], ["RAM", "4 GB"]] },
  { name: "Batería para celular de reemplazo", brand: "R Cube Pro", cat: "accesorios", price: 89, stock: 40, img: "repuesto-bateria-celular.jpg", desc: "Batería de iones de litio compatible con modelos populares.", specs: [["Capacidad", "3000 mAh"], ["Garantía", "6 meses"]] },
  { name: "Batería para laptop 6 celdas", brand: "R Cube Pro", cat: "accesorios", price: 189, stock: 15, img: "repuesto-bateria-laptop.jpg", desc: "Batería de reemplazo de 6 celdas para laptops de 15 pulgadas.", specs: [["Celdas", "6"], ["Voltaje", "11,1 V"]] },
  { name: "Cooler y disipador para laptop", brand: "R Cube Pro", cat: "accesorios", price: 129, stock: 10, img: "repuesto-cooler-heatsink.jpg", desc: "Conjunto de ventilador y disipador de cobre.", specs: [["Material", "Cobre"], ["Conector", "4 pines"]] },
  { name: "Fairphone módulo de cámara", brand: "Fairphone", cat: "accesorios", price: 249, stock: 5, img: "repuesto-fairphone-modular.jpg", desc: "Módulo reparable para teléfonos Fairphone.", specs: [["Compatibilidad", "Fairphone 4"]] },
  { name: "Kit de herramientas de precisión 32 en 1", brand: "R Cube Pro", cat: "accesorios", price: 59, before: 79, stock: 50, img: "repuesto-kit-herramientas.jpg", desc: "Destornilladores de precisión para reparar celulares y laptops.", specs: [["Piezas", "32"], ["Estuche", "Sí"]] },
  { name: "Pasta térmica 4 g", brand: "R Cube Pro", cat: "accesorios", price: 35, stock: 60, img: "repuesto-pasta-termica.jpg", desc: "Pasta de alta conductividad para procesadores y GPU.", specs: [["Conductividad", "8,5 W/mK"], ["Peso", "4 g"]] },
  { name: "Memoria RAM DDR4 16 GB", brand: "Kingston", cat: "accesorios", price: 179, stock: 25, img: "repuesto-ram-modulos.jpg", desc: "Módulo SO-DIMM de 3200 MHz para laptops.", specs: [["Capacidad", "16 GB"], ["Velocidad", "3200 MHz"]] },
  { name: "SSD NVMe 1 TB", brand: "Kingston", cat: "accesorios", price: 299, stock: 18, img: "repuesto-ssd-nvme.jpg", desc: "Unidad M.2 PCIe 4.0 con lectura de hasta 7000 MB/s.", specs: [["Capacidad", "1 TB"], ["Interfaz", "PCIe 4.0"]] },
  { name: "Samsung Galaxy S10 (descontinuado)", brand: "Samsung", cat: "celulares", price: 999, stock: 5, active: false, desc: "Modelo retirado de la venta; se conserva por pedidos anteriores.", specs: [["Pantalla", "6,1 pulgadas"]] },
];

const CUSTOMERS = [
  { name: "Mateo Quispe", email: "mateo@demo.pe", phone: "987654321", address: "Av. José Larco 743, Dpto. 401", district: "Miraflores" },
  { name: "Lucía Huamán", email: "lucia@demo.pe", phone: "912345678", address: "Jr. Carabaya 220", district: "Cercado de Lima" },
  { name: "Diego Mamani", email: "diego@demo.pe", phone: "998877665", address: "Calle Los Pinos 15", district: "San Isidro" },
  { name: "Valeria Rojas", email: "valeria@demo.pe", phone: "955443322", address: "Av. Universitaria 1801", district: "San Miguel" },
  { name: "Andrés Flores", email: "andres@demo.pe", phone: "966778899", address: "Mz. B Lt. 4, Urb. Santa Rosa", district: "Callao" },
];

const ZONES = [
  { id: "zona-lima-centro", name: "Lima Centro (Miraflores, San Isidro, Cercado)", costCents: 1000, sortOrder: 1 },
  { id: "zona-lima-periferia", name: "Lima Norte, Sur y Este", costCents: 1800, sortOrder: 2 },
  { id: "zona-callao", name: "Callao", costCents: 1500, sortOrder: 3 },
];

export async function runSeed(db: Db, passwords: { admin: string; customer: string }) {
  await db.execute(sql`TRUNCATE TABLE audit_log, stock_movement, order_event, payment, order_item, orders, cart_item, product_image,
    product, brand, category, delivery_zone, store_settings, session, account, verification,
    rate_limit, "user" RESTART IDENTITY CASCADE`);

  await db.insert(s.category).values(CATEGORIES.map((c, i) => ({ ...c, sortOrder: i + 1 })));
  await db.insert(s.brand).values(BRANDS.map((name) => ({ id: `brand-${slugify(name)}`, name, slug: slugify(name) })));

  const base = new Date("2026-06-01T15:00:00Z").getTime();
  const products = PRODUCTS.map((p, i) => ({
    id: `prod-${slugify(p.name)}`,
    slug: slugify(p.name),
    name: p.name,
    brandId: `brand-${slugify(p.brand)}`,
    categoryId: CATEGORIES.find((c) => c.slug.startsWith(p.cat))!.id,
    description: p.desc,
    specs: p.specs.map(([label, value]) => ({ label, value })),
    priceCents: p.price * 100,
    compareAtCents: p.before ? p.before * 100 : null,
    stock: p.stock,
    active: p.active ?? true,
    searchText: buildSearchText(p.name, p.brand, p.desc),
    createdAt: new Date(base + i * 86_400_000),
  }));
  await db.insert(s.product).values(products);
  await db.insert(s.productImage).values(
    products.map((p, i) => ({
      id: `img-${p.id}`,
      productId: p.id,
      url: PRODUCTS[i]!.img ? `/img/productos/${PRODUCTS[i]!.img}` : "/img/generico.svg",
      alt: p.name,
      position: 0,
    })),
  );

  await db.insert(s.deliveryZone).values(ZONES);
  await db.insert(s.storeSettings).values({
    id: 1,
    whatsappNumber: "51987000111",
    yapeNumber: "987000111",
    plinNumber: "987000222",
    yapeQrUrl: "/img/yape-qr.svg",
    bankName: "Banco de Ejemplo (modo de prueba)",
    bankHolder: "R Cube S.A.C.",
    bankAccount: "191-2345678-0-12",
    bankCci: "00219100234567801254",
    pickupAddress: "Av. Arequipa 2450, Lince, Lima (lunes a sábado, 10:00 a 19:00)",
    enabledMethods: ["card", "yape_plin", "transfer", "whatsapp"],
  });

  const adminHash = await hashPassword(passwords.admin);
  const customerHash = await hashPassword(passwords.customer);
  const users = [
    { id: "user-admin", name: "Administrador R Cube", email: "admin@rcube.pe", phone: "987000111", role: "administrador" as const },
    ...CUSTOMERS.map((c, i) => ({
      id: `user-cliente-${i + 1}`, name: c.name, email: c.email, phone: c.phone, role: "cliente" as const,
      addressLine: c.address, district: c.district,
    })),
  ];
  await db.insert(s.user).values(users.map((u) => ({ ...u, emailVerified: true })));
  await db.insert(s.account).values(
    users.map((u) => ({
      id: `acc-${u.id}`, accountId: u.id, providerId: "credential", userId: u.id,
      password: u.role === "administrador" ? adminHash : customerHash,
    })),
  );

  // 8 pedidos en distintos estados, coherentes con el stock y la línea de tiempo.
  const byName = (n: string) => products.find((p) => p.name.startsWith(n))!;
  const ORDERS: {
    user: number; status: s.OrderStatusDb; method: s.PaymentMethod; delivery: "pickup" | "delivery";
    zone?: string; items: [string, number][]; daysAgo: number; path: s.OrderStatusDb[]; reason?: string; code?: string;
  }[] = [
    { user: 1, status: "delivered", method: "card", delivery: "delivery", zone: "zona-lima-centro", items: [["iPhone 15 Pro", 1]], daysAgo: 20, path: ["paid", "preparing", "shipped", "delivered"] },
    { user: 2, status: "shipped", method: "yape_plin", delivery: "delivery", zone: "zona-lima-periferia", items: [["Xiaomi Redmi Note 12", 2]], daysAgo: 6, path: ["pending_payment", "paid", "preparing", "shipped"], code: "40028871" },
    { user: 3, status: "preparing", method: "transfer", delivery: "pickup", items: [["MacBook Air M1", 1], ["Pasta térmica", 2]], daysAgo: 4, path: ["pending_payment", "paid", "preparing"] },
    { user: 4, status: "paid", method: "card", delivery: "delivery", zone: "zona-callao", items: [["Samsung Galaxy S23", 1]], daysAgo: 2, path: ["paid"] },
    { user: 5, status: "pending_payment", method: "whatsapp", delivery: "delivery", zone: "zona-callao", items: [["Asus Vivobook 15", 1]], daysAgo: 0, path: ["pending_payment"] },
    { user: 1, status: "cancelled", method: "yape_plin", delivery: "pickup", items: [["Google Pixel 8", 1]], daysAgo: 10, path: ["pending_payment", "cancelled"], reason: "Pago no recibido en 24 h", code: "11223344" },
    { user: 2, status: "delivered", method: "card", delivery: "pickup", items: [["Kit de herramientas", 1], ["SSD NVMe", 1]], daysAgo: 15, path: ["paid", "preparing", "delivered"] },
    { user: 3, status: "pending_payment", method: "yape_plin", delivery: "delivery", zone: "zona-lima-centro", items: [["Memoria RAM", 2]], daysAgo: 0, path: ["pending_payment"], code: "77889900" },
  ];

  const now = Date.now();
  for (const [i, o] of ORDERS.entries()) {
    const customer = CUSTOMERS[o.user - 1]!;
    const userId = `user-cliente-${o.user}`;
    const lines = o.items.map(([n, quantity]) => {
      const p = byName(n);
      return { p, quantity, unitPriceCents: p.priceCents };
    });
    const zone = ZONES.find((z) => z.id === o.zone);
    const totals = orderTotals(lines, zone?.costCents ?? 0, 0);
    const id = `order-demo-${i + 1}`;
    const created = new Date(now - o.daysAgo * 86_400_000 - (8 - i) * 3_600_000);
    await db.insert(s.orders).values({
      id, number: `RC-${String(i + 1).padStart(6, "0")}`, userId, status: o.status,
      deliveryMethod: o.delivery, deliveryZoneId: zone?.id ?? null,
      shipName: o.delivery === "delivery" ? customer.name : null,
      shipPhone: o.delivery === "delivery" ? customer.phone : null,
      shipAddress: o.delivery === "delivery" ? customer.address : null,
      shipDistrict: o.delivery === "delivery" ? customer.district : null,
      ...totals, paymentMethod: o.method, createdAt: created,
    });
    await db.insert(s.orderItem).values(
      lines.map((l, j) => ({
        id: `${id}-item-${j + 1}`, orderId: id, productId: l.p.id, productName: l.p.name,
        unitPriceCents: l.unitPriceCents, quantity: l.quantity, lineTotalCents: l.unitPriceCents * l.quantity,
        imageUrl: `/img/productos/${PRODUCTS.find((x) => x.name === l.p.name)?.img ?? ""}`,
      })),
    );
    const paidLike = o.path.includes("paid");
    await db.insert(s.payment).values({
      id: `${id}-pay`, orderId: id, method: o.method,
      status: o.method === "card" ? "approved" : paidLike ? "confirmed" : o.status === "cancelled" ? "rejected" : "pending",
      amountCents: totals.totalCents, cardLast4: o.method === "card" ? "1111" : null, operationCode: o.code ?? null,
    });
    let from: s.OrderStatusDb | null = null;
    for (const [k, to] of o.path.entries()) {
      const actor = k === 0 ? "cliente" : to === "cancelled" ? "sistema" : "administrador";
      await db.insert(s.orderEvent).values({
        id: `${id}-ev-${k + 1}`, orderId: id, fromStatus: from, toStatus: to, actorType: actor,
        actorUserId: actor === "cliente" ? userId : actor === "administrador" ? "user-admin" : null,
        reason: to === "cancelled" ? (o.reason ?? null) : null,
        createdAt: new Date(created.getTime() + k * 6 * 3_600_000),
      });
      from = to;
    }
  }
  await db.execute(sql`SELECT setval('order_number_seq', ${ORDERS.length})`);
  await seedStockHistory(db);
}

/**
 * Historial de stock coherente con los pedidos de demostración (FR-028): stock inicial = stock actual +
 * unidades de pedidos no cancelados; luego una venta por línea y una devolución por pedido cancelado.
 */
async function seedStockHistory(db: Db) {
  const lines = (await db.execute(sql`select oi.product_id, oi.quantity, o.id as order_id, o.status, o.created_at,
      (select e.created_at from order_event e where e.order_id = o.id and e.to_status = 'cancelled' limit 1) as cancelled_at
    from order_item oi join orders o on o.id = oi.order_id order by o.created_at`)) as unknown as {
    product_id: string; quantity: number; order_id: string; status: string; created_at: Date; cancelled_at: Date | null;
  }[];
  const products = (await db.execute(sql`select id, stock, created_at from product`)) as unknown as {
    id: string; stock: number; created_at: Date;
  }[];
  const rows: (typeof s.stockMovement.$inferInsert)[] = [];
  for (const p of products) {
    const own = lines.filter((l) => l.product_id === p.id);
    let running = p.stock + own.filter((l) => l.status !== "cancelled").reduce((sum, l) => sum + l.quantity, 0);
    const events: { at: Date; delta: number; source: "venta" | "cancelacion"; orderId: string }[] = [];
    for (const l of own) {
      events.push({ at: new Date(l.created_at), delta: -l.quantity, source: "venta", orderId: l.order_id });
      if (l.status === "cancelled" && l.cancelled_at)
        events.push({ at: new Date(l.cancelled_at), delta: l.quantity, source: "cancelacion", orderId: l.order_id });
    }
    if (running > 0)
      rows.push({ id: `mov-${p.id}-0`, productId: p.id, delta: running, stockBefore: 0, stockAfter: running, source: "inicial",
        reason: "Stock inicial de demostración", actorType: "sistema", createdAt: new Date(p.created_at) });
    events.sort((a, b) => a.at.getTime() - b.at.getTime()).forEach((e, i) => {
      rows.push({ id: `mov-${p.id}-${i + 1}`, productId: p.id, delta: e.delta, stockBefore: running, stockAfter: running + e.delta,
        source: e.source, orderId: e.orderId, actorType: e.source === "venta" ? "cliente" : "sistema", createdAt: e.at });
      running += e.delta;
    });
  }
  if (rows.length) await db.insert(s.stockMovement).values(rows);
}
