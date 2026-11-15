/** Tipos de respuesta de la API de administración (specs/002-administracion/contracts/admin-api.md). */
import type { OrderStatus } from "./order-status";
import type { OrderDetail, PaymentMethodCode } from "./types";

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminOrderRow {
  number: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  totalCents: number;
  method: PaymentMethodCode;
  status: OrderStatus;
}

export interface AdminSummary {
  cards: { salesTodayCents: number; toPrepare: number; toConfirm: number; customers: number; lowStock: number };
  salesByDay: { date: string; totalCents: number }[];
  salesByCategory: { name: string; totalCents: number }[];
  topProducts: { id: string; name: string; units: number }[];
  latestOrders: AdminOrderRow[];
}

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  /** Con variantes, el precio «desde» (menor entre las activas) y el stock total (HU-43). */
  priceCents: number;
  maxPriceCents: number | null;
  stock: number;
  hasVariants: boolean;
  variantCount: number;
  /** Variantes activas con 5 unidades o menos, para el filtro de stock bajo (clarificación 3). */
  lowVariants: { label: string; stock: number }[];
  active: boolean;
  imageUrl: string;
}

/** Variante de un producto vista por el administrador, activa o no (HU-43). */
export interface AdminVariant {
  id: string;
  sku: string;
  color: string;
  storage: string;
  ram: string;
  label: string;
  priceCents: number;
  stock: number;
  imageId: string | null;
  imageUrl: string | null;
  active: boolean;
  /** Ya aparece en algún pedido: no se puede borrar, solo desactivar. */
  sold: boolean;
}

export interface AdminImage {
  id: string;
  url: string;
  alt: string;
  position: number;
  uploaded: boolean;
}

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  specs: { label: string; value: string }[];
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  maxPriceCents: number | null;
  hasVariants: boolean;
  variants: AdminVariant[];
  active: boolean;
  images: AdminImage[];
}

export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  activeProducts: number;
}

export interface StockMovementDto {
  id: string;
  delta: number;
  stockBefore: number;
  stockAfter: number;
  source: "inicial" | "ajuste" | "venta" | "cancelacion";
  variantLabel: string | null;
  orderNumber: string | null;
  reason: string | null;
  actor: string;
  createdAt: string;
}

export interface AdminOrderDetail extends OrderDetail {
  customer: { id: string; name: string; email: string; phone: string };
  allowedTransitions: OrderStatus[];
}

export interface PendingPayment {
  number: string;
  customerName: string;
  method: PaymentMethodCode;
  totalCents: number;
  operationCode: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orders: number;
  spentCents: number;
  blocked: boolean;
}

export interface CustomerDetail extends CustomerRow {
  phone: string;
  address: { line: string; district: string; reference: string };
  orderList: { number: string; createdAt: string; totalCents: number; status: OrderStatus }[];
}

export interface AdminZone {
  id: string;
  name: string;
  costCents: number;
  active: boolean;
}

export interface AdminSettings {
  whatsappNumber: string;
  yapeNumber: string;
  plinNumber: string;
  bankName: string;
  bankHolder: string;
  bankAccount: string;
  bankCci: string;
  enabledMethods: PaymentMethodCode[];
  zones: AdminZone[];
}

export interface AuditRow {
  id: string;
  createdAt: string;
  actorName: string;
  action: string;
  entityType: string;
  entityLabel: string;
  detail: string;
}

/** Cupón visto por el administrador (HU-50). */
export interface AdminCoupon {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  startsOn: string;
  endsOn: string;
  maxUses: number;
  usedCount: number;
  active: boolean;
  status: "active" | "inactive" | "expired" | "exhausted";
}

/** Reseña vista por el administrador para moderarla (HU-47). */
export interface AdminReview {
  id: string;
  productId: string;
  productName: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  comment: string | null;
  hidden: boolean;
  createdAt: string;
}

export const AUDIT_LABEL: Record<string, string> = {
  producto_creado: "Producto creado",
  producto_editado: "Producto editado",
  precio_cambiado: "Cambio de precio",
  producto_estado: "Producto activado o desactivado",
  foto: "Fotos",
  categoria: "Categoría",
  marca: "Marca",
  stock_ajustado: "Ajuste de stock",
  pedido_estado: "Estado de pedido",
  pago_confirmado: "Pago confirmado",
  pago_rechazado: "Pago rechazado",
  cliente_bloqueado: "Cliente bloqueado",
  cliente_reactivado: "Cliente reactivado",
  configuracion: "Configuración",
  zona: "Zona de delivery",
  variante: "Variante de producto",
  cupon: "Cupón",
  resena_oculta: "Reseña ocultada",
  resena_visible: "Reseña mostrada",
};
