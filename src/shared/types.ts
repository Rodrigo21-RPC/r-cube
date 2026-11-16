/** Tipos de respuesta de la API (contracts/api.md), compartidos por el Worker y la web. */
import type { CouponErrorCode } from "./coupon";
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
  /** El producto tiene variantes: `priceCents` es el precio «desde» (HU-43). */
  hasVariants: boolean;
  /** Mayor precio entre las variantes activas; null si no hay rango. */
  maxPriceCents: number | null;
}

/** Variante activa de un producto (HU-43, HU-44). */
export interface VariantDto {
  id: string;
  sku: string;
  label: string;
  color: string;
  storage: string;
  ram: string;
  priceCents: number;
  stock: number;
  availability: Availability;
  imageUrl: string | null;
}

export interface ProductDetail extends ProductCard {
  variants: VariantDto[];
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
  variantId: string | null;
  variantLabel: string | null;
  sku: string | null;
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
  variantId?: string | null;
  type: "price_changed" | "stock_reduced" | "unavailable" | "choose_variant" | "coupon";
  message: string;
}

/** Cupón aplicado a la cotización (HU-49). */
export interface CouponApplied {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  discountCents: number;
}

export interface CartQuote {
  lines: CartLine[];
  warnings: CartWarning[];
  totals: Totals;
  coupon: CouponApplied | null;
  couponError: { code: CouponErrorCode; message: string } | null;
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
  /** Direcciones guardadas, la predeterminada primero (HU-48). */
  addresses: Address[];
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
  items: {
    productId: string;
    name: string;
    variantLabel: string | null;
    sku: string | null;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
    imageUrl: string | null;
  }[];
  couponCode: string | null;
  totals: Required<Totals>;
  payment: { method: PaymentMethodCode; status: string; cardLast4: string | null; operationCode: string | null };
  events: OrderEventDto[];
  canCancel: boolean;
}

/** Comprobante imprimible de un pedido (HU-52). */
export interface Receipt extends OrderDetail {
  store: { name: string; whatsappNumber: string; pickupAddress: string };
  customer: { name: string; email: string; phone: string };
}

/** Reseña visible de un producto; el autor se muestra abreviado (HU-46). */
export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  createdAt: string;
}

export interface ReviewsPage {
  average: number | null;
  count: number;
  items: Review[];
  page: number;
  pageSize: number;
  total: number;
  /** Reseña propia, incluso si está oculta; solo con sesión. */
  mine?: (Review & { hidden: boolean }) | null;
  canReview?: boolean;
  reviewBlockedReason?: string;
}

/** Dirección guardada de un cliente (HU-48). */
export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line: string;
  district: string;
  reference: string;
  isDefault: boolean;
}

/** Aviso dentro de la app sobre un pedido (HU-53). */
export interface Notification {
  id: string;
  orderNumber: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationsSummary {
  unread: number;
  latest: Notification[];
}

export interface FavoriteItem {
  product: ProductCard;
  available: boolean;
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

/** Créditos de las fotos de la tienda (HU-58, feature 004). */
export interface PhotoCredits {
  external: { productName: string; productSlug: string; imageUrl: string; alt: string; author: string; license: string; licenseUrl: string | null; sourceUrl: string }[];
  project: { productName: string; productSlug: string }[];
}

/** Contacto público de la tienda para los botones de WhatsApp (HU-59, feature 004). */
export interface StoreContact {
  name: string;
  whatsappNumber: string;
}
