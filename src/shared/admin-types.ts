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
  priceCents: number;
  stock: number;
  active: boolean;
  imageUrl: string;
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
};
