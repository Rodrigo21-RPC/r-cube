/** Tipos de respuesta de la API (contracts/api.md), compartidos por el Worker y la web. */
import type { OrderStatus, DeliveryMethod } from "./order-status";

export type Availability = "in_stock" | "low" | "out";
export type PaymentMethodCode = "card" | "yape_plin" | "transfer" | "whatsapp";
export type SortOption = "relevance" | "price_asc" | "price_desc" | "newest";

export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  brand: string;
  priceCents: number;
  compareAtCents: number | null;
  imageUrl: string;
  imageAlt: string;
  availability: Availability;
  stock: number;
}

export interface ProductDetail extends ProductCard {
  description: string;
  category: { name: string; slug: string };
  specs: { label: string; value: string }[];
  images: { url: string; alt: string }[];
}

export interface CatalogPage {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  query?: string;
}

export interface Facets {
  categories: { slug: string; name: string; count: number }[];
  brands: { slug: string; name: string; count: number }[];
  price: { minCents: number; maxCents: number };
}

export interface HomeData {
  categories: { slug: string; name: string; imageUrl: string }[];
  offers: ProductCard[];
  bestSellers: ProductCard[];
  newest: ProductCard[];
}

export interface Totals {
  subtotalCents: number;
  shippingCents?: number;
  discountCents?: number;
  taxableBaseCents: number;
  igvCents: number;
  totalCents: number;
}

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  unitPriceCents: number;
  quantity: number;
  maxQuantity: number;
  lineTotalCents: number;
  available: boolean;
}

export interface CartWarning {
  productId: string;
  type: "price_changed" | "stock_reduced" | "unavailable";
  message: string;
}

export interface CartQuote {
  lines: CartLine[];
  warnings: CartWarning[];
  totals: Totals;
}

export interface CheckoutOptions {
  zones: { id: string; name: string; costCents: number }[];
  methods: PaymentMethodCode[];
  pickupAddress: string;
  yape: { number: string; qrUrl: string };
  plin: { number: string };
  bank: { name: string; holder: string; account: string; cci: string };
  whatsappNumber: string;
  address: { name: string; phone: string; address: string; district: string; reference: string };
}

export interface OrderEventDto {
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actor: "cliente" | "administrador" | "sistema";
  reason: string | null;
  createdAt: string;
}

export interface OrderSummary {
  number: string;
  createdAt: string;
  totalCents: number;
  status: OrderStatus;
}

export interface OrderDetail extends OrderSummary {
  deliveryMethod: DeliveryMethod;
  zoneName: string | null;
  shipping: { name: string; phone: string; address: string; district: string; reference: string } | null;
  pickupAddress: string | null;
  items: { productId: string; name: string; unitPriceCents: number; quantity: number; lineTotalCents: number; imageUrl: string | null }[];
  totals: Required<Totals>;
  payment: { method: PaymentMethodCode; status: string; cardLast4: string | null; operationCode: string | null };
  events: OrderEventDto[];
  canCancel: boolean;
}

export interface Me {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "cliente" | "administrador";
  address: { line: string; district: string; reference: string };
}

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string>; [k: string]: unknown };
}

export const PAYMENT_LABEL: Record<PaymentMethodCode, string> = {
  card: "Tarjeta",
  yape_plin: "Yape o Plin",
  transfer: "Transferencia bancaria",
  whatsapp: "Coordinación por WhatsApp",
};
