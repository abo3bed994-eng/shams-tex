import AsyncStorage from "@react-native-async-storage/async-storage";
import { setSecureItem, getSecureItem, deleteSecureItem } from "@/lib/secureStorage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { FS } from "@/lib/firebase";
import { notifyStaffNewOrder, notifyUserByPhone, notifyByRoles, notifyAll } from "@/lib/pushService";
import { canonicalPhone, samePhone } from "@/lib/phoneUtils";
import { isWithinWorkingHours } from "@/lib/workingHours";

export type UserRole = "customer" | "merchant" | "employee" | "supervisor" | "admin";
export type ProductUnit = "meter" | "kilo";
export type EmployeePermission =
  | "view_orders"
  | "edit_orders"
  | "view_products"
  | "edit_products"
  | "view_users"
  | "send_notifications"
  | "manage_staff"
  | "approve_upgrades"
  | "delete_orders"
  | "cancel_returns"
  | "manage_settings"
  | "manage_payments"
  | "toggle_price_view";

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  vip?: boolean;
  permissions?: EmployeePermission[];
  upgradeStatus?: "pending" | "approved" | "rejected";
  registeredAt?: string;
  city?: string;
  notes?: string;
  sessionToken?: string;
  pin?: string;
  banned?: boolean;
  bannedAt?: string;
  bannedReason?: string;
}

export interface ColorOption {
  name: string;
  hex: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  images: string[];
  retailPrice: number;
  wholesalePrice: number;
  category: string;
  subcategory?: string;
  colors: ColorOption[];
  description?: string;
  inStock: boolean;
  unit?: ProductUnit;
}

export interface CartItem {
  productId: string;
  productName: string;
  colorName: string;
  colorHex: string;
  quantity: number;
  unitPrice: number;
  orderType: "weight" | "pieces";
  weight?: number;
  actualWeight?: number;
  unit?: ProductUnit;
}

export type OrderStatus = "scheduled" | "pending" | "received" | "preparing" | "ready" | "ready_to_ship" | "shipped" | "delivered" | "cancelled";

export type PaymentMethod = "cash" | "bank_transfer" | "ewallet" | "instapay";

// "store" = pickup from main store (default), "branch" = pickup from any other branch, "shipping" = courier delivery
export type FulfillmentType = "store" | "branch" | "shipping";

// Three fixed shipping companies. IDs are stable across versions.
export type ShippingProviderId = string;

export interface ShippingProviderConfig {
  id: ShippingProviderId;
  name: string;
  enabled: boolean;
}

export const SHIPPING_PROVIDER_DEFAULTS: ShippingProviderConfig[] = [
  { id: "etihad", name: "الاتحاد", enabled: true },
  { id: "esprent", name: "إسبرنت", enabled: true },
  { id: "urgent", name: "إيرجنت", enabled: true },
];

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  mapsUrl?: string;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "كاش (الدفع عند الاستلام)",
  bank_transfer: "تحويل بنكي",
  ewallet: "محفظة إلكترونية",
  instapay: "انستاباي",
};

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  cash: "banknote",
  bank_transfer: "credit-card",
  ewallet: "smartphone",
  instapay: "zap",
};

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  deliveredAt?: string;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  assignedToPhone?: string;
  editable?: boolean;
  edited?: boolean;
  editedAt?: string;
  paymentMethod?: PaymentMethod;
  paymentFee?: number;
  totalWithFee?: number;
  paymentConfirmed?: boolean;
  invoiceImage?: string;
  scheduledFor?: string;
  releasedAt?: string;
  paymentOverrideHandle?: string;
  paymentOverrideName?: string;
  transferProofImage?: string;
  // Fulfillment: how the customer receives the order
  fulfillmentType?: FulfillmentType; // undefined = legacy = "store"
  branchId?: string;
  branchName?: string;
  // Shipping-specific
  shippingProviderId?: ShippingProviderId;
  shippingProviderName?: string;
  shippingWaybillImage?: string;
  shippingWaybillNumber?: string;
  shippedAt?: string;
}

export type ReturnStatus = "pending" | "returned" | "settled" | "cancelled";

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: CartItem[];
  reason: string;
  status: ReturnStatus;
  createdAt: string;
  invoiceImage?: string;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledByName?: string;
}

export interface WorkingDay {
  day: string;
  enabled: boolean;
  from: string;
  to: string;
}


export interface Tab {
  id: string;
  label: string;
  icon: string;
  type: "home" | "products" | "about" | "contact" | "orders" | "custom";
  visible: boolean;
  order: number;
  categoryId?: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  targetRole?: UserRole | "staff";
  targetUserId?: string;
  targetUserPhone?: string;
  sourceUserId?: string;
  actionType?: "upgrade_request";
  actionUserId?: string;
  linkedOrderId?: string;
  linkedReturnId?: string;
}

export interface ContactEntry {
  id: string;
  label: string;
  number: string;
  icon: string;
}

export interface SocialEntry {
  id: string;
  label: string;
  icon: string;
  url: string;
}

export type AppTheme = "dark" | "light" | "system";
export type AppLanguage = "ar" | "en";

export interface WalletEntry {
  id: string;
  number: string;
  name: string;
  provider?: string;
}

export interface InstapayEntry {
  id: string;
  handle: string;
  name: string;
}

export interface PaymentSettings {
  ewallets?: WalletEntry[];
  instapays?: InstapayEntry[];
  ewalletNumber?: string;
  ewalletName?: string;
  instapayNumber?: string;
  instapayName?: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIBAN: string;
  ewalletFeePercent: number;
  cashEnabled?: boolean;
  bankTransferEnabled?: boolean;
  ewalletEnabled?: boolean;
  instapayEnabled?: boolean;
  // Per-fulfillment availability: undefined = available everywhere (default true).
  // Example: { cash: { shipping: false } } disables cash on shipping orders.
  fulfillmentAvailability?: Partial<Record<PaymentMethod, Partial<Record<FulfillmentType, boolean>>>>;
}

export interface AppSettings {
  contacts: ContactEntry[];
  social: SocialEntry[];
  aboutTitle: string;
  aboutText: string;
  categories: string[];
  subcategories: Record<string, string[]>;
  featuredProductIds: string[];
  bannerImageUri?: string;
  bannerVideoUris?: string[];
  globalColors: ColorOption[];
  stats: { clients: string; products: string; years: string };
  workingHours?: WorkingDay[];
  payment?: PaymentSettings;
  branches?: Branch[];
  shippingProviders?: ShippingProviderConfig[];
  logoUri?: string;
  minVersion?: string;
  updateUrl?: string;
  stealthIconEnabled?: boolean;
  suspendOrdersOutsideHours?: boolean;
  notificationTemplates?: { id: string; title: string; body: string }[];
}

const DEFAULT_SETTINGS: AppSettings = {
  contacts: [
    { id: "1", label: "الدعم الفني", number: "+20 100 000 0001", icon: "headphones" },
    { id: "2", label: "المبيعات", number: "+20 100 000 0002", icon: "shopping-bag" },
    { id: "3", label: "الجملة والتجار", number: "+20 100 000 0003", icon: "briefcase" },
  ],
  social: [
    { id: "1", label: "واتساب", icon: "message-circle", url: "https://wa.me/201000000001" },
    { id: "2", label: "إنستغرام", icon: "instagram", url: "https://instagram.com/shamstex" },
    { id: "3", label: "فيسبوك", icon: "facebook", url: "https://facebook.com/shamstex" },
    { id: "4", label: "تيكتوك", icon: "tiktok", url: "https://tiktok.com/@shamstex" },
  ],
  aboutTitle: "شمس تكس",
  aboutText:
    "شركة متخصصة في توريد أفخر أنواع الأقمشة، نخدم عملاءنا منذ أكثر من 15 عاماً بجودة لا مثيل لها وخدمة على أعلى مستوى.",
  categories: ["الكل", "حرير", "قطن", "ساتان", "كتان", "فيلفيت", "شيفون"],
  subcategories: {
    "حرير": ["حرير طبيعي", "حرير صناعي", "حرير شيني"],
    "قطن": ["قطن مصري", "قطن تركي"],
    "ساتان": ["ساتان فرنسي", "ساتان كوري"],
  },
  featuredProductIds: ["1", "2", "3"],
  stats: { clients: "+500", products: "+50", years: "15+" },
  workingHours: [
    { day: "السبت", enabled: true, from: "09:00", to: "17:00" },
    { day: "الأحد", enabled: true, from: "09:00", to: "17:00" },
    { day: "الاثنين", enabled: true, from: "09:00", to: "17:00" },
    { day: "الثلاثاء", enabled: true, from: "09:00", to: "17:00" },
    { day: "الأربعاء", enabled: true, from: "09:00", to: "17:00" },
    { day: "الخميس", enabled: true, from: "09:00", to: "14:00" },
    { day: "الجمعة", enabled: false, from: "00:00", to: "00:00" },
  ],
  payment: {
    ewallets: [
      { id: "w_default_vf", number: "01000000001", name: "شمس تكس", provider: "فودافون كاش" },
    ],
    instapays: [
      { id: "ip_default", handle: "01000000001", name: "شمس تكس" },
    ],
    bankName: "البنك الأهلي المصري",
    bankAccountName: "شمس تكس للأقمشة",
    bankAccountNumber: "1234567890123",
    bankIBAN: "EG000012345678901234567890",
    ewalletFeePercent: 1,
    cashEnabled: true,
    bankTransferEnabled: true,
    ewalletEnabled: true,
    instapayEnabled: true,
  },
  suspendOrdersOutsideHours: true,
  notificationTemplates: [
    { id: "tmpl_offers", title: "عروض جديدة", body: "تصفح أحدث العروض والخصومات الحصرية على أقمشتنا المميزة!" },
    { id: "tmpl_arrivals", title: "وصول بضاعة جديدة", body: "تم وصول تشكيلة جديدة من الأقمشة. زوروا المعرض أو تصفحوا التطبيق!" },
    { id: "tmpl_update", title: "تحديث مهم", body: "يرجى مراجعة طلباتكم الحالية للاطلاع على آخر التحديثات." },
    { id: "tmpl_maint", title: "صيانة مجدولة", body: "سيتم إجراء صيانة مجدولة على النظام. نعتذر عن أي إزعاج." },
  ],
  globalColors: [
    { name: "أبيض", hex: "#FFFFFF", quantity: 50 },
    { name: "أسود", hex: "#0A0A0A", quantity: 50 },
    { name: "ذهبي", hex: "#C9A84C", quantity: 30 },
    { name: "أحمر", hex: "#C0392B", quantity: 25 },
    { name: "أزرق", hex: "#2980B9", quantity: 30 },
    { name: "أخضر", hex: "#27AE60", quantity: 25 },
    { name: "بيج", hex: "#F5F0E0", quantity: 40 },
    { name: "رمادي", hex: "#888880", quantity: 35 },
    { name: "وردي", hex: "#FADBD8", quantity: 20 },
    { name: "بنفسجي", hex: "#6C3483", quantity: 20 },
    { name: "فضي", hex: "#C0C0C0", quantity: 30 },
    { name: "بني", hex: "#7D6608", quantity: 20 },
  ],
};

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => Promise<void>;
  registeredCustomers: User[];
  findCustomerByPhone: (phone: string) => User | undefined;
  registerCustomer: (user: User) => Promise<void>;
  updateRegisteredCustomer: (user: User) => void;
  deleteRegisteredCustomer: (phone: string) => void;
  products: Product[];
  setProducts: (products: Product[]) => Promise<void>;
  addProductOne: (product: Product) => Promise<void>;
  updateProductOne: (product: Product) => Promise<void>;
  deleteProductOne: (productId: string) => Promise<void>;
  cart: CartItem[];
  setCart: (items: CartItem[]) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, colorName: string) => void;
  updateCartItem: (productId: string, colorName: string, quantity: number) => void;
  clearCart: () => void;
  orders: Order[];
  setOrders: (orders: Order[]) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, assignedToId?: string, assignedToName?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  sendOrderMessage: (orderId: string, message: string) => Promise<void>;
  setOrderEditable: (orderId: string, editable: boolean) => Promise<void>;
  setOrderInvoiceImage: (orderId: string, imageUri: string | null) => Promise<void>;
  setOrderTransferProof: (orderId: string, imageUri: string | null) => Promise<void>;
  setOrderShipping: (orderId: string, data: { providerId?: ShippingProviderId | null; providerName?: string | null; waybillImage?: string | null; waybillNumber?: string | null }) => Promise<void>;
  setOrderPaymentMethod: (orderId: string, method: PaymentMethod) => Promise<void>;
  setOrderPaymentOverride: (orderId: string, handle: string | null, name?: string | null) => Promise<void>;
  setCustomerPin: (phone: string, pin: string) => Promise<void>;
  verifyCustomerPin: (phone: string, pin: string) => boolean;
  updateOrderItems: (orderId: string, items: CartItem[], total: number, staffEdit?: boolean, notes?: string, fulfillment?: { fulfillmentType?: FulfillmentType; branchId?: string; branchName?: string }) => Promise<void>;
  editingOrderId: string | null;
  setEditingOrderId: (id: string | null) => void;
  returnRequests: ReturnRequest[];
  addReturnRequest: (req: ReturnRequest) => Promise<void>;
  updateReturnStatus: (reqId: string, status: ReturnStatus) => Promise<void>;
  cancelReturnRequest: (reqId: string, reason?: string) => Promise<void>;
  deleteReturnRequest: (reqId: string) => Promise<void>;
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => Promise<void>;
  notifications: Notification[];
  addNotification: (notification: Notification) => Promise<void>;
  onlineCount: number;
  onlineUsers: { userId: string; name: string; role: string; phone: string; lastSeen: number }[];
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateCartWeight: (productId: string, colorName: string, weight: number) => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => Promise<void>;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => Promise<void>;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  isLoading: boolean;
  roleSwitching: string | null;
  showToast: (message: string, type?: "success" | "error") => void;
  toast: { message: string; type: "success" | "error"; visible: boolean };
  pricingView: "auto" | "wholesale" | "retail";
  setPricingView: (mode: "auto" | "wholesale" | "retail") => Promise<void>;
  effectivePriceMode: "wholesale" | "retail";
  canTogglePricing: boolean;
  isNotifReadForUser: (n: Notification) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "حرير طبيعي فاخر",
    images: [],
    retailPrice: 250,
    wholesalePrice: 180,
    category: "حرير",
    colors: [
      { name: "أبيض", hex: "#FFFFFF", quantity: 50 },
      { name: "أسود", hex: "#0A0A0A", quantity: 40 },
      { name: "ذهبي", hex: "#C9A84C", quantity: 30 },
      { name: "أحمر", hex: "#C0392B", quantity: 25 },
    ],
    description: "حرير طبيعي فاخر عالي الجودة، مناسب للمناسبات الراقية",
    inStock: true,
  },
  {
    id: "2",
    name: "قطن مصري ممتاز",
    images: [],
    retailPrice: 120,
    wholesalePrice: 85,
    category: "قطن",
    colors: [
      { name: "أبيض", hex: "#FFFFFF", quantity: 100 },
      { name: "بيج", hex: "#F5F0E0", quantity: 80 },
      { name: "رمادي", hex: "#888880", quantity: 60 },
      { name: "أزرق فاتح", hex: "#AED6F1", quantity: 45 },
    ],
    description: "قطن مصري طويل التيلة، نعومة استثنائية ومتانة عالية",
    inStock: true,
  },
  {
    id: "3",
    name: "ساتان فرنسي",
    images: [],
    retailPrice: 320,
    wholesalePrice: 230,
    category: "ساتان",
    colors: [
      { name: "أسود", hex: "#0A0A0A", quantity: 35 },
      { name: "ذهبي", hex: "#C9A84C", quantity: 20 },
      { name: "فضي", hex: "#C0C0C0", quantity: 25 },
      { name: "وردي", hex: "#FADBD8", quantity: 30 },
    ],
    description: "ساتان فرنسي براق، مثالي للملابس الراقية والمناسبات",
    inStock: true,
  },
  {
    id: "4",
    name: "كتان إيطالي",
    images: [],
    retailPrice: 190,
    wholesalePrice: 135,
    category: "كتان",
    colors: [
      { name: "بيج طبيعي", hex: "#D5C5A1", quantity: 70 },
      { name: "أبيض", hex: "#FEFEFE", quantity: 65 },
    ],
    description: "كتان إيطالي عالي الجودة، مناسب للملابس الصيفية",
    inStock: true,
  },
  {
    id: "5",
    name: "فيلفيت ملكي",
    images: [],
    retailPrice: 450,
    wholesalePrice: 320,
    category: "فيلفيت",
    colors: [
      { name: "أرجواني ملكي", hex: "#6C3483", quantity: 20 },
      { name: "أسود", hex: "#0A0A0A", quantity: 30 },
      { name: "أحمر عميق", hex: "#922B21", quantity: 15 },
    ],
    description: "فيلفيت فاخر بجودة ملكية، مناسب لأعلى المناسبات",
    inStock: true,
  },
  {
    id: "6",
    name: "شيفون خفيف",
    images: [],
    retailPrice: 150,
    wholesalePrice: 105,
    category: "شيفون",
    colors: [
      { name: "وردي فاتح", hex: "#FDEBD0", quantity: 45 },
      { name: "أبيض شفاف", hex: "#F8F9F9", quantity: 55 },
      { name: "أزرق سماوي", hex: "#AED6F1", quantity: 40 },
    ],
    description: "شيفون خفيف وشفاف، مثالي للفساتين والأوشحة",
    inStock: true,
  },
];

const DEFAULT_TABS: Tab[] = [
  { id: "home", label: "الرئيسية", icon: "home", type: "home", visible: true, order: 0 },
  { id: "products", label: "المنتجات", icon: "grid", type: "products", visible: true, order: 1 },
  { id: "orders", label: "طلباتي", icon: "package", type: "orders", visible: true, order: 2 },
  { id: "contact", label: "تواصل معنا", icon: "phone", type: "contact", visible: true, order: 3 },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [registeredCustomers, setRegisteredCustomersState] = useState<User[]>([]);
  const registeredCustomersRef = React.useRef<User[]>([]);
  registeredCustomersRef.current = registeredCustomers;
  const [products, setProductsState] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [tabs, setTabsState] = useState<Tab[]>(DEFAULT_TABS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setThemeState] = useState<AppTheme>("system");
  const [language, setLanguageState] = useState<AppLanguage>("ar");
  const [isLoading, setIsLoading] = useState(true);
  const [roleSwitching, setRoleSwitching] = useState<string | null>(null);
  const [pricingView, setPricingViewState] = useState<"auto" | "wholesale" | "retail">("auto");
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const readNotifIdsRef = React.useRef<Set<string>>(new Set());
  readNotifIdsRef.current = readNotifIds;
  const pendingOrderUpdatesRef = React.useRef<Map<string, number>>(new Map());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error"; visible: boolean }>({ message: "", type: "success", visible: false });
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type, visible: true });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }, []);

  useEffect(() => {
    loadPersistedData();
  }, []);

  // Load per-user read-notification set + per-device pricing view from AsyncStorage
  // whenever the active user changes. This is the source of truth for "is this
  // notification read for ME" — overlays Firestore's shared `read` flag so a
  // failed batchMarkRead does NOT cause notifications to reappear as unread.
  useEffect(() => {
    (async () => {
      try {
        const pvRaw = await AsyncStorage.getItem("pricingView");
        if (pvRaw === "wholesale" || pvRaw === "retail" || pvRaw === "auto") {
          setPricingViewState(pvRaw);
        } else {
          setPricingViewState("auto");
        }
      } catch {}
      const phone = user?.phone;
      if (!phone) {
        setReadNotifIds(new Set());
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(`readNotifIds_${phone}`);
        if (raw) {
          const arr = JSON.parse(raw) as string[];
          setReadNotifIds(new Set(arr));
        } else {
          setReadNotifIds(new Set());
        }
      } catch {
        setReadNotifIds(new Set());
      }
    })();
  }, [user?.phone]);

  const persistReadNotifIds = useCallback(async (next: Set<string>) => {
    const phone = userRef.current?.phone;
    if (!phone) return;
    try {
      // Cap at 1000 ids to avoid unbounded growth
      const arr = [...next];
      const trimmed = arr.length > 1000 ? arr.slice(arr.length - 1000) : arr;
      await AsyncStorage.setItem(`readNotifIds_${phone}`, JSON.stringify(trimmed));
    } catch {}
  }, []);

  // Helper extracted so it can run from both the staff full-collection
  // subscription and any other path that receives a snapshot of customers.
  const applyFreshCustomers = (freshCustomers: any[]) => {
    const groupsByCanon = new Map<string, any[]>();
    for (const c of freshCustomers) {
      const k = canonicalPhone(c.phone) || c.id || c.phone || "_";
      const arr = groupsByCanon.get(k);
      if (arr) arr.push(c);
      else groupsByCanon.set(k, [c]);
    }
    const dedupMap = new Map<string, any>();
    for (const c of freshCustomers) {
      const key = canonicalPhone(c.phone) || c.id || c.phone;
      const existing = dedupMap.get(key);
      const cTime = c.lastUpdated || c.registeredAt || "";
      const eTime = existing ? (existing.lastUpdated || existing.registeredAt || "") : "";
      if (!existing) {
        dedupMap.set(key, c);
      } else {
        if (cTime || eTime) {
          if ((cTime || "") > (eTime || "")) dedupMap.set(key, c);
        } else {
          const roleRank: Record<string, number> = { admin: 5, supervisor: 4, employee: 3, merchant: 2, customer: 1 };
          if ((roleRank[c.role] ?? 0) > (roleRank[existing.role] ?? 0)) dedupMap.set(key, c);
        }
      }
    }
    const deduped = [...dedupMap.values()];
    setRegisteredCustomersState(deduped);
    AsyncStorage.setItem("registered_customers", JSON.stringify(deduped)).catch(() => {});
    for (const [key, group] of groupsByCanon) {
      if (group.length <= 1) continue;
      const winner = dedupMap.get(key);
      if (!winner) continue;
      for (const doc of group) {
        if (doc.phone && doc.phone !== winner.phone) {
          FS.deleteCustomer(doc.phone).catch(() => {});
        }
      }
    }
  };

  // Init listeners — products + settings are needed by everyone (logged in or not)
  // and are small/cheap to subscribe to.
  useEffect(() => {
    let isFirstSettingsLoad = true;
    const unsubSettings = FS.subscribeSettings((freshSettings) => {
      if (!freshSettings && isFirstSettingsLoad) {
        isFirstSettingsLoad = false;
        return;
      }
      isFirstSettingsLoad = false;
      if (freshSettings) {
        setSettingsState({ ...DEFAULT_SETTINGS, ...freshSettings });
        AsyncStorage.setItem("settings", JSON.stringify(freshSettings)).catch(() => {});
      }
    });

    let isFirstProductsLoad = true;
    const unsubProducts = FS.subscribeProducts((freshProducts) => {
      if (freshProducts.length === 0 && isFirstProductsLoad) {
        isFirstProductsLoad = false;
        return;
      }
      isFirstProductsLoad = false;
      const sorted = [...freshProducts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setProductsState(sorted);
      AsyncStorage.setItem("products", JSON.stringify(sorted)).catch(() => {});
    });

    return () => {
      unsubSettings();
      unsubProducts();
    };
  }, []);

  // Role-aware listeners for customers/notifications/returns.
  // STAFF (admin/supervisor/employee): full collection subscriptions — they need
  //   to see everyone's data for management screens.
  // CUSTOMER/MERCHANT: only own customer doc + scoped notifications + scoped
  //   returns. This cuts Firestore reads by 90%+ at scale and keeps each device's
  //   bandwidth tiny regardless of total user count.
  // NO USER (pre-login): no subscriptions at all — login.tsx fetches single docs
  //   on demand via FS.getCustomer.
  useEffect(() => {
    if (!user?.id) {
      // Reset transient state when logged out so a new login starts clean.
      setNotifications([]);
      setReturnRequests([]);
      return;
    }
    const isStaff = user.role !== "customer" && user.role !== "merchant";

    let unsubCustomers: (() => void) | undefined;
    if (isStaff) {
      let isFirstCustomersLoad = true;
      unsubCustomers = FS.subscribeCustomers((freshCustomers) => {
        if (freshCustomers.length === 0 && isFirstCustomersLoad) {
          isFirstCustomersLoad = false;
          return;
        }
        isFirstCustomersLoad = false;
        // If the currently logged-in staff member was removed by an admin,
        // their own customer doc will be missing from the fresh snapshot.
        // Force-logout immediately so they get kicked to the login screen.
        const me = userRef.current;
        if (me?.phone) {
          const stillExists = freshCustomers.some((c: any) => samePhone(c.phone, me.phone));
          if (!stillExists) {
            forceLogoutAccountRemoved();
            return;
          }
        }
        applyFreshCustomers(freshCustomers);
      });
    } else if (user.phone) {
      // Customer/merchant: only listen to OWN doc to receive role/vip/permission
      // changes pushed by admin in real time. If the doc is deleted remotely
      // (admin removed the account), force-logout.
      let isFirstOwnLoad = true;
      unsubCustomers = FS.subscribeCustomerByPhone(user.phone, (own) => {
        if (own) {
          isFirstOwnLoad = false;
          applyFreshCustomers([own]);
        } else if (!isFirstOwnLoad) {
          forceLogoutAccountRemoved();
        } else {
          isFirstOwnLoad = false;
        }
      });
    }

    let isFirstNotifLoad = true;
    const unsubNotifications = FS.subscribeNotificationsForUser(
      user.id,
      user.phone,
      user.role,
      isStaff,
      (freshNotifs) => {
        if (freshNotifs.length === 0 && isFirstNotifLoad) {
          isFirstNotifLoad = false;
          return;
        }
        const prevIds = new Set(notificationsRef.current.map((n) => n.id));
        setNotifications(freshNotifs);
        AsyncStorage.setItem("notifications", JSON.stringify(freshNotifs)).catch(() => {});
        if (!isFirstNotifLoad) {
          const me = userRef.current;
          const meIsStaff = me && me.role !== "customer";
          const newOnes = freshNotifs.filter((n) => !prevIds.has(n.id));
          const forMe = newOnes.filter((n) => {
            if (n.targetUserId === "self") return false;
            if (me && n.sourceUserId === me.id) return false;
            if (n.targetUserId && me && n.targetUserId === me.id) return true;
            if (n.targetRole === "staff" && meIsStaff) return true;
            if (n.targetRole === "all") return true;
            if (n.targetRole && me && n.targetRole === me.role) return true;
            if (!n.targetUserId && !n.targetRole) return true;
            return false;
          });
          if (forMe.length > 0) {
            if (Platform.OS !== "web") {
              import("expo-notifications").then((Notif) => {
                forMe.slice(0, 5).forEach((n) => {
                  Notif.scheduleNotificationAsync({
                    content: {
                      title: n.title,
                      body: n.body,
                      sound: true,
                      data: { id: n.id, orderId: n.linkedOrderId },
                    },
                    trigger: null,
                  }).catch(() => {});
                });
              }).catch(() => {});
            }
          }
        }
        isFirstNotifLoad = false;
      }
    );

    let isFirstReturnsLoad = true;
    const unsubReturns = FS.subscribeReturnRequestsForUser(
      user.phone,
      isStaff,
      (freshReqs) => {
        if (freshReqs.length === 0 && isFirstReturnsLoad) {
          isFirstReturnsLoad = false;
          return;
        }
        isFirstReturnsLoad = false;
        setReturnRequests(freshReqs);
        AsyncStorage.setItem("returnRequests", JSON.stringify(freshReqs)).catch(() => {});
      }
    );

    return () => {
      unsubCustomers?.();
      unsubNotifications();
      unsubReturns();
    };
  }, [user?.id, user?.role, user?.phone]);


  const userRef = React.useRef<User | null>(null);
  userRef.current = user;
  const bannedAlertShownRef = React.useRef<boolean>(false);
  const roleChangeAlertShownRef = React.useRef<boolean>(false);

  // Role-aware orders subscription: customers see only their own orders,
  // staff see all. Re-subscribes when user identity/role changes.
  useEffect(() => {
    if (!user?.id) {
      setOrdersState([]);
      return;
    }
    const isStaff = user.role !== "customer" && user.role !== "merchant";
    const unsub = FS.subscribeOrdersForUser(user.phone, isStaff, (freshOrders) => {
      // Protect optimistic updates: for any order we just changed locally,
      // keep our local version until the in-flight save resolves. This
      // prevents the "I tapped advance but the status snapped back" bug
      // when a stale snapshot arrives before our write commits.
      const pending = pendingOrderUpdatesRef.current;
      let merged = freshOrders;
      if (pending.size > 0) {
        const localById = new Map(ordersRef.current.map((o) => [o.id, o]));
        merged = freshOrders.map((o) => (pending.has(o.id) && localById.has(o.id) ? localById.get(o.id)! : o));
      }
      setOrdersState(merged);
      ordersRef.current = merged;
      AsyncStorage.setItem("orders", JSON.stringify(merged)).catch(() => {});
    });
    return () => unsub();
  }, [user?.id, user?.role]);

  // Real-time single-device session enforcement.
  // When the same phone signs in on another device, Firestore session token changes.
  // We listen and force-logout if the local secure token no longer matches the remote one.
  useEffect(() => {
    if (!user?.phone) return;
    let cancelled = false;
    let unsub: (() => void) | undefined;

    (async () => {
      const localToken = await getSecureItem("sessionToken");
      if (!localToken || cancelled) return;

      unsub = FS.subscribeSession(user.phone, async (remoteToken) => {
        if (cancelled || !remoteToken) return;
        if (remoteToken !== localToken) {
          // Another device took over this account → log out FULLY immediately:
          // clear all per-user state, secure token, then force-navigate to the
          // login screen so the old session can no longer interact with the app.
          try {
            await AsyncStorage.multiRemove([
              "user",
              "notifications",
              "orders",
              "returnRequests",
            ]).catch(() => {});
            await deleteSecureItem("sessionToken");
          } catch {}
          setUserState(null);
          setNotifications([]);
          setOrdersState([]);
          setReturnRequests([]);
          try {
            const { router } = await import("expo-router");
            router.replace("/auth/login" as any);
          } catch {}
          Alert.alert(
            "تم تسجيل الدخول من جهاز آخر",
            "تم تسجيل دخول حسابك على جهاز آخر، فتم إخراجك من هذا الجهاز.",
            [{ text: "حسناً" }]
          );
        }
      });
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [user?.phone]);

  // Presence tracking — heartbeat to Firestore every 30s while logged in.
  // Admins use this to see how many users are currently browsing.
  const [onlineUsers, setOnlineUsers] = useState<{ userId: string; name: string; role: string; phone: string; lastSeen: number }[]>([]);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const beat = () => {
      if (cancelled) return;
      FS.setPresence(user.id, { name: user.name || "", role: user.role, phone: user.phone || "" }).catch(() => {});
    };
    beat();
    const interval = setInterval(beat, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      FS.clearPresence(user.id).catch(() => {});
    };
  }, [user?.id, user?.name, user?.role, user?.phone]);

  useEffect(() => {
    if (user?.role !== "admin") {
      setOnlineUsers([]);
      return;
    }
    const unsub = FS.subscribePresence((entries) => {
      setOnlineUsers(entries);
    });
    return () => unsub();
  }, [user?.role]);

  const ONLINE_WINDOW_MS = 90_000;
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    if (user?.role !== "admin") return;
    const t = setInterval(() => setNowTick(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [user?.role]);
  const onlineCount = useMemo(() => {
    const cutoff = nowTick - ONLINE_WINDOW_MS;
    return onlineUsers.filter((u) => u.lastSeen >= cutoff).length;
  }, [onlineUsers, nowTick]);

  const syncUserWithRecords = useCallback(() => {
    const currentUser = userRef.current;
    if (!currentUser || !currentUser.phone) return;
    const freshRecord = registeredCustomers.find((c) => samePhone(c.phone, currentUser.phone));
    if (!freshRecord) return;
    const roleChanged = freshRecord.role !== currentUser.role;
    const bannedNow = !!freshRecord.banned && !currentUser.banned;
    const changed =
      roleChanged ||
      bannedNow ||
      freshRecord.banned !== currentUser.banned ||
      freshRecord.vip !== currentUser.vip ||
      freshRecord.upgradeStatus !== currentUser.upgradeStatus ||
      freshRecord.name !== currentUser.name ||
      JSON.stringify(freshRecord.permissions ?? []) !== JSON.stringify(currentUser.permissions ?? []);
    if (changed) {
      const synced: User = { ...currentUser, ...freshRecord };

      if (bannedNow) {
        // Order matters: clear in-memory user FIRST so any concurrent
        // persistUserSafe / Firestore writers see null and bail. Then wipe
        // storage. Do NOT call persistUserSafe(synced) on this path — it would
        // re-write the banned record back into AsyncStorage after multiRemove.
        if (bannedAlertShownRef.current) return;
        bannedAlertShownRef.current = true;
        setUserState(null);
        setNotifications([]);
        setOrdersState([]);
        setReturnRequests([]);
        (async () => {
          try {
            await AsyncStorage.multiRemove([
              "user",
              "notifications",
              "orders",
              "returnRequests",
            ]).catch(() => {});
            await deleteSecureItem("sessionToken");
          } catch {}
          Alert.alert(
            "تم حظر الحساب",
            freshRecord.bannedReason
              ? `تم حظر حسابك من قِبل الإدارة.\n\nالسبب: ${freshRecord.bannedReason}`
              : "تم حظر حسابك من قِبل الإدارة. للاستفسار يرجى التواصل مع الدعم.",
            [{ text: "حسناً" }]
          );
          try {
            const { router } = await import("expo-router");
            router.replace("/auth/login" as any);
          } catch {}
        })();
        return;
      }

      if (roleChanged) {
        // Same race-safe order as bannedNow: clear in-memory user FIRST so any
        // concurrent persistUserSafe / Firestore writer sees null and bails.
        // Do NOT call persistUserSafe(synced) — it would re-write the synced
        // record (with the new role) into AsyncStorage after multiRemove, and
        // the next app launch would silently log the user back in.
        if (roleChangeAlertShownRef.current) return;
        roleChangeAlertShownRef.current = true;
        setUserState(null);
        setNotifications([]);
        setOrdersState([]);
        setReturnRequests([]);
        (async () => {
          try {
            await AsyncStorage.multiRemove([
              "user",
              "notifications",
              "orders",
              "returnRequests",
            ]).catch(() => {});
            await deleteSecureItem("sessionToken");
          } catch {}
          Alert.alert(
            "تم تغيير دورك",
            "تم تحديث دورك من قِبل الإدارة. الرجاء تسجيل الدخول مجدداً.",
            [{ text: "حسناً" }]
          );
          try {
            const { router } = await import("expo-router");
            router.replace("/auth/login" as any);
          } catch {}
        })();
        return;
      }

      setUserState(synced);
      persistUserSafe(synced).catch(() => {});
    }
  }, [registeredCustomers]);

  useEffect(() => {
    syncUserWithRecords();
  }, [registeredCustomers, syncUserWithRecords]);

  useEffect(() => {
    if (user) syncUserWithRecords();
  }, [user?.phone]);

  const loadPersistedData = async () => {
    try {
      const [userData, customersData, productsData, ordersData, tabsData, notificationsData, settingsData, themeData, returnRequestsData] =
        await Promise.all([
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("registered_customers"),
          AsyncStorage.getItem("products"),
          AsyncStorage.getItem("orders"),
          AsyncStorage.getItem("tabs"),
          AsyncStorage.getItem("notifications"),
          AsyncStorage.getItem("settings"),
          AsyncStorage.getItem("theme"),
          AsyncStorage.getItem("returnRequests"),
        ]);

      if (userData) {
        const parsedUser: User = JSON.parse(userData);
        // Migrate sessionToken to secure storage on first read
        if (parsedUser.sessionToken) {
          await setSecureItem("sessionToken", parsedUser.sessionToken);
          delete (parsedUser as any).sessionToken;
          await persistUserSafe(parsedUser);
        }
        const secureToken = await getSecureItem("sessionToken");
        try {
          if (parsedUser.phone && secureToken) {
            const remoteToken = await FS.getSession(parsedUser.phone);
            if (remoteToken && remoteToken !== secureToken) {
              await AsyncStorage.removeItem("user");
              await deleteSecureItem("sessionToken");
              setUserState(null);
            } else {
              setUserState(parsedUser);
            }
          } else {
            setUserState(parsedUser);
          }
        } catch {
          setUserState(parsedUser);
        }
      }
      if (customersData) setRegisteredCustomersState(JSON.parse(customersData));
      if (productsData) setProductsState(JSON.parse(productsData));
      if (ordersData) setOrdersState(JSON.parse(ordersData));
      if (tabsData) setTabsState(JSON.parse(tabsData));
      if (notificationsData) setNotifications(JSON.parse(notificationsData));
      if (returnRequestsData) setReturnRequests(JSON.parse(returnRequestsData));
      if (settingsData) {
        const parsed = JSON.parse(settingsData);
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      }
      if (themeData) setThemeState(themeData as AppTheme);
      const langData = await AsyncStorage.getItem("language");
      if (langData) setLanguageState(langData as AppLanguage);
    } catch (e) {
    } finally {
      setIsLoading(false);
    }

    // Fetch settings from Firestore (products are covered by subscribeProducts listener)
    try {
      const fsSettings = await FS.getSettings();
      if (fsSettings) {
        setSettingsState({ ...DEFAULT_SETTINGS, ...fsSettings });
        await AsyncStorage.setItem("settings", JSON.stringify(fsSettings));
      }
    } catch (_e) {}
  };

  // Safely persist a user object to AsyncStorage WITHOUT the sessionToken.
  // Token is moved to secure storage. Use this everywhere instead of raw AsyncStorage.setItem("user", ...).
  const persistUserSafe = async (u: User) => {
    if (u.sessionToken) {
      try { await setSecureItem("sessionToken", u.sessionToken); } catch {}
    }
    const { sessionToken: _omit, ...rest } = u as any;
    await AsyncStorage.setItem("user", JSON.stringify(rest));
  };

  const setUser = useCallback(async (u: User | null) => {
    setUserState(u);
    if (u) {
      // Reset one-shot guards so a future ban/role-change in this app process
      // still fires the alert + forced logout exactly once per event.
      bannedAlertShownRef.current = false;
      roleChangeAlertShownRef.current = false;
      await persistUserSafe(u);
    } else {
      await AsyncStorage.multiRemove([
        "user",
        "notifications",
        "orders",
        "returnRequests",
        "registered_customers",
      ]).catch(() => {});
      await deleteSecureItem("sessionToken");
      setNotifications([]);
      setOrdersState([]);
      setReturnRequests([]);
    }
  }, []);

  // Force logout helper used when the current user's account has been deleted
  // remotely (e.g. admin removes a staff member). Clears local state and shows
  // an Arabic alert, then redirects to the login screen.
  const forceLogoutAccountRemoved = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        "user",
        "notifications",
        "orders",
        "returnRequests",
      ]).catch(() => {});
      await deleteSecureItem("sessionToken");
    } catch {}
    setUserState(null);
    setNotifications([]);
    setOrdersState([]);
    setReturnRequests([]);
    Alert.alert(
      "تم إنهاء حسابك",
      "تم حذف حسابك من قِبل الإدارة. يرجى تسجيل الدخول مجدداً.",
      [{ text: "حسناً" }]
    );
    try {
      const { router } = await import("expo-router");
      router.replace("/auth/login" as any);
    } catch {}
  }, []);

  const findCustomerByPhone = useCallback(
    (phone: string): User | undefined => {
      if (!phone) return undefined;
      // Exact match first (fast path)
      const exact = registeredCustomers.find((c) => c.phone === phone);
      if (exact) return exact;
      // Country-aware canonical matching ONLY — no permissive raw-suffix heuristics
      // (avoids cross-account misidentification during OTP login).
      return registeredCustomers.find((c) => samePhone(c.phone, phone));
    },
    [registeredCustomers]
  );

  const registerCustomer = useCallback(async (newUser: User) => {
    // Match canonically so a re-registration under a different phone format
    // (legacy local vs E.164) updates the existing record instead of forking it.
    const matches = registeredCustomers.filter((c) => samePhone(c.phone, newUser.phone));
    const existing = matches[0];
    // Prefer the existing canonical phone format as the authoritative key —
    // prevents creating a second Firestore doc under a new format.
    const authoritativePhone = existing?.phone ?? newUser.phone;
    const userToSave: User = existing
      ? {
          ...newUser,
          id: existing.id,
          phone: authoritativePhone,
          role: existing.role,
          permissions: existing.permissions ?? newUser.permissions,
          vip: existing.vip ?? newUser.vip,
        }
      : newUser;
    // Drop ALL canonical twins, then add the merged record.
    const updated = [
      ...registeredCustomers.filter((c) => !samePhone(c.phone, newUser.phone)),
      userToSave,
    ];
    setRegisteredCustomersState(updated);
    await AsyncStorage.setItem("registered_customers", JSON.stringify(updated));
    // Await Firestore write so subscribers on other devices (admin panel) see
    // the new doc reliably before the login flow resolves. Don't throw — the
    // local AsyncStorage write already succeeded, so the user can continue.
    try {
      await FS.saveCustomer(userToSave);
    } catch (e) {
      console.warn("[registerCustomer] FS.saveCustomer failed:", (e as any)?.message || e);
    }
    // Hard-delete any orphan Firestore docs stored under a different phone format.
    for (const m of matches) {
      if (m.phone && m.phone !== authoritativePhone) {
        FS.deleteCustomer(m.phone).catch(() => {});
      }
    }
  }, [registeredCustomers]);

  const updateRegisteredCustomer = useCallback((updatedUser: User) => {
    const targetCanon = canonicalPhone(updatedUser.phone);
    setRegisteredCustomersState((prev) => {
      // Match by canonical phone. If a duplicate exists under another format,
      // collapse them into one record (the updated one).
      const matches = prev.filter((c) => samePhone(c.phone, updatedUser.phone));
      let updated: User[];
      if (matches.length === 0) {
        updated = [...prev, updatedUser];
      } else {
        // Drop ALL existing matches, then add the single merged updated record.
        const merged: User = matches.reduce((acc, m) => ({ ...m, ...acc }), updatedUser as User);
        updated = prev.filter((c) => !samePhone(c.phone, updatedUser.phone)).concat(merged);
        // If the existing matches included docs with different phone strings,
        // schedule cleanup of the orphan Firestore docs.
        for (const m of matches) {
          if (m.phone && m.phone !== updatedUser.phone) {
            FS.deleteCustomer(m.phone).catch(() => {});
          }
        }
      }
      AsyncStorage.setItem("registered_customers", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    const currentUser = userRef.current;
    if (currentUser && samePhone(currentUser.phone, updatedUser.phone)) {
      const synced = { ...currentUser, ...updatedUser };
      setUserState(synced);
      persistUserSafe(synced).catch(() => {});
    }
    FS.saveCustomer(updatedUser).catch(() => {});
    // Touch tag for canonical map consumers
    void targetCanon;
  }, []);

  const deleteRegisteredCustomer = useCallback((phone: string) => {
    setRegisteredCustomersState((prev) => {
      // Delete ALL records that match canonically (handles legacy/E.164 twins).
      const toDelete = prev.filter((c) => samePhone(c.phone, phone));
      const updated = prev.filter((c) => !samePhone(c.phone, phone));
      AsyncStorage.setItem("registered_customers", JSON.stringify(updated)).catch(() => {});
      // Delete every distinct Firestore phone-key found.
      const seenKeys = new Set<string>();
      for (const t of toDelete) {
        if (t.phone && !seenKeys.has(t.phone)) {
          seenKeys.add(t.phone);
          FS.deleteCustomer(t.phone).catch(() => {});
        }
      }
      // Always also try the literal phone the caller passed (in case it isn't in local state).
      if (!seenKeys.has(phone)) {
        FS.deleteCustomer(phone).catch(() => {});
      }
      return updated;
    });
  }, []);

  const setProducts = useCallback(async (prods: Product[]) => {
    setProductsState(prods);
    await AsyncStorage.setItem("products", JSON.stringify(prods));
    prods.forEach((p) => FS.saveProduct(p).catch(() => {}));
  }, []);

  // Single-product helpers — avoid re-writing the entire collection on
  // every add/edit/delete. Faster local UX and faster real-time propagation
  // to other clients via the products subscription.
  const addProductOne = useCallback(async (product: Product) => {
    setProductsState((prev) => {
      const next = [product, ...prev];
      AsyncStorage.setItem("products", JSON.stringify(next)).catch(() => {});
      return next;
    });
    await FS.saveProduct(product);
  }, []);

  const updateProductOne = useCallback(async (product: Product) => {
    setProductsState((prev) => {
      const next = prev.map((p) => (p.id === product.id ? product : p));
      AsyncStorage.setItem("products", JSON.stringify(next)).catch(() => {});
      return next;
    });
    await FS.saveProduct(product);
  }, []);

  const deleteProductOne = useCallback(async (productId: string) => {
    setProductsState((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      AsyncStorage.setItem("products", JSON.stringify(next)).catch(() => {});
      return next;
    });
    await FS.deleteProduct(productId);
  }, []);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (c) => c.productId === item.productId && c.colorName === item.colorName && c.orderType === item.orderType
      );
      if (existing) {
        return prev.map((c) =>
          c.productId === item.productId && c.colorName === item.colorName && c.orderType === item.orderType
            ? { ...c, quantity: c.quantity + item.quantity }
            : c
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, colorName: string) => {
    setCart((prev) =>
      prev.filter((c) => !(c.productId === productId && c.colorName === colorName))
    );
  }, []);

  const updateCartItem = useCallback(
    (productId: string, colorName: string, quantity: number) => {
      setCart((prev) =>
        quantity === 0
          ? prev.filter((c) => !(c.productId === productId && c.colorName === colorName))
          : prev.map((c) =>
              c.productId === productId && c.colorName === colorName
                ? { ...c, quantity }
                : c
            )
      );
    },
    []
  );

  const clearCart = useCallback(() => setCart([]), []);

  const setOrders = useCallback(async (ords: Order[]) => {
    setOrdersState(ords);
    await AsyncStorage.setItem("orders", JSON.stringify(ords));
  }, []);

  const ordersRef = useRef<Order[]>([]);
  ordersRef.current = orders;

  const saveOrderReliable = async (order: Order): Promise<boolean> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await FS.saveOrder(order);
        return true;
      } catch (err) {
        console.warn(`saveOrder attempt ${attempt + 1} failed:`, err);
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    try {
      const pendingRaw = await AsyncStorage.getItem("pendingOrderSaves");
      const pending: Order[] = pendingRaw ? JSON.parse(pendingRaw) : [];
      const filtered = pending.filter((o) => o.id !== order.id);
      filtered.push(order);
      await AsyncStorage.setItem("pendingOrderSaves", JSON.stringify(filtered));
    } catch {}
    return false;
  };

  useEffect(() => {
    const flushPending = async () => {
      try {
        const pendingRaw = await AsyncStorage.getItem("pendingOrderSaves");
        if (!pendingRaw) return;
        const pending: Order[] = JSON.parse(pendingRaw);
        if (!pending.length) return;
        const remaining: Order[] = [];
        for (const o of pending) {
          try { await FS.saveOrder(o); } catch { remaining.push(o); }
        }
        await AsyncStorage.setItem("pendingOrderSaves", JSON.stringify(remaining));
      } catch {}
    };
    flushPending();
    const id = setInterval(flushPending, 30000);
    return () => clearInterval(id);
  }, []);

  // Auto-release scheduled orders when working hours start.
  // Runs every 60 seconds; idempotent — safe to run on multiple devices.
  useEffect(() => {
    const releaseDueScheduled = async () => {
      try {
        const wh = settings.workingHours;
        if (!wh || wh.length === 0) return;
        if (!isWithinWorkingHours(wh)) return;
        const due = ordersRef.current.filter((o) => o.status === "scheduled");
        if (due.length === 0) return;
        const nowIso = new Date().toISOString();
        const released: Order[] = due.map((o) => ({
          ...o,
          status: "pending" as OrderStatus,
          releasedAt: nowIso,
        }));
        const updated = ordersRef.current.map((o) => {
          const r = released.find((x) => x.id === o.id);
          return r ?? o;
        });
        setOrdersState(updated);
        ordersRef.current = updated;
        await AsyncStorage.setItem("orders", JSON.stringify(updated));
        for (const order of released) {
          // Persist the new status to Firestore so all devices converge.
          FS.saveOrder(order).catch(() => {});
          // Notify staff (push + in-app).
          const staffNotif: Notification = {
            id: `notif_order_released_${order.id}`,
            title: "🛍️ طلب جديد (مجدول)",
            body: `طلب من ${order.userName} (${order.userPhone}) — كان مجدولاً والآن جاهز`,
            createdAt: nowIso,
            read: false,
            targetRole: "staff",
            sourceUserId: order.userId,
            linkedOrderId: order.id,
          };
          FS.saveNotification(staffNotif).catch(() => {});
          notifyStaffNewOrder(order.id, order.userName).catch(() => {});
          // Notify customer that work has begun on their order.
          const custNotif: Notification = {
            id: `notif_release_cust_${order.id}`,
            title: "✅ بدأ العمل على طلبك",
            body: `طلبك #${order.id.slice(0, 8)} وصل إلى فريق العمل وجارٍ مراجعته الآن`,
            createdAt: nowIso,
            read: false,
            targetUserId: order.userId,
            targetUserPhone: order.userPhone,
            linkedOrderId: order.id,
          };
          FS.saveNotification(custNotif).catch(() => {});
          if (order.userPhone) {
            notifyUserByPhone(
              order.userPhone,
              "✅ بدأ العمل على طلبك",
              `طلبك #${order.id.slice(0, 8)} وصل إلى فريق العمل`,
              { type: "order_released", orderId: order.id }
            ).catch(() => {});
          }
        }
      } catch {}
    };
    releaseDueScheduled();
    const id = setInterval(releaseDueScheduled, 60000);
    return () => clearInterval(id);
  }, [settings.workingHours]);

  const addOrder = useCallback(
    async (order: Order) => {
      const updated = [...ordersRef.current, order];
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      const saved = await saveOrderReliable(order);
      if (!saved) {
        Alert.alert(
          "تنبيه",
          "تم استلام طلبك محلياً، لكن لم يصل للسيرفر بعد. سنحاول إعادة الإرسال تلقائياً عند توفّر الإنترنت."
        );
      }
      // Suppress staff notification for scheduled orders — they'll be notified at release time.
      if (order.status === "scheduled") {
        return;
      }
      const staffNotif: Notification = {
        id: `notif_order_new_${order.id}`,
        title: "🛍️ طلب جديد",
        body: `وصل طلب جديد من ${order.userName} (${order.userPhone})`,
        createdAt: new Date().toISOString(),
        read: false,
        targetRole: "staff",
        sourceUserId: order.userId,
        linkedOrderId: order.id,
      };
      FS.saveNotification(staffNotif).catch(() => {});
      notifyStaffNewOrder(order.id, order.userName).catch(() => {});
    },
    []
  );

  // Best-effort save with retry/backoff. Keeps optimistic UI authoritative
  // for the in-flight window; if all retries fail, surfaces a toast so the
  // user knows the change might not be persisted server-side.
  const saveOrderWithRetry = useCallback((order: Order, orderId: string) => {
    let attempt = 0;
    const tryOnce = () => {
      FS.saveOrder(order)
        .then(() => {
          setTimeout(() => pendingOrderUpdatesRef.current.delete(orderId), 2000);
        })
        .catch(() => {
          attempt += 1;
          if (attempt < 3) {
            setTimeout(tryOnce, 500 * attempt);
          } else {
            pendingOrderUpdatesRef.current.delete(orderId);
            showToast("تعذّر مزامنة حالة الطلب — تحقق من الاتصال", "error");
          }
        });
    };
    tryOnce();
  }, [showToast]);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, assignedToId?: string, assignedToName?: string) => {
      const prevOrder = ordersRef.current.find((o) => o.id === orderId);
      if (!prevOrder) return;
      // Idempotency: same status, same staff → no-op (prevents double-tap glitches)
      if (
        prevOrder.status === status &&
        (status !== "received" || !assignedToId || prevOrder.assignedTo === assignedToId)
      ) {
        return;
      }

      const patch: Partial<Order> = { status };
      const claimerPhone = userRef.current?.id === assignedToId ? userRef.current?.phone : undefined;
      if (status === "received" && assignedToId) {
        patch.assignedTo = assignedToId;
        patch.assignedToName = assignedToName;
        if (claimerPhone) patch.assignedToPhone = claimerPhone;
      }
      if (status === "pending") {
        patch.assignedTo = "";
        patch.assignedToName = "";
        patch.assignedToPhone = "";
      }
      if (status === "delivered") {
        patch.deliveredAt = new Date().toISOString();
      }
      // Shipping invariant: cannot advance to "shipped" without waybill image + provider
      if (status === "shipped" && (prevOrder.fulfillmentType ?? "store") === "shipping") {
        if (!prevOrder.shippingWaybillImage || !prevOrder.shippingProviderId) {
          Alert.alert("بوليصة الشحن مطلوبة", "يجب رفع صورة بوليصة الشحن واختيار شركة الشحن قبل تأكيد الشحن.");
          return;
        }
        patch.shippedAt = new Date().toISOString();
      }

      // INSTANT optimistic UI update FIRST — never wait for Firestore.
      const updated = ordersRef.current.map((o) => (o.id !== orderId ? o : { ...o, ...patch }));
      const updatedOrder = updated.find((o) => o.id === orderId)!;
      setOrdersState(updated);
      ordersRef.current = updated;
      // Mark this order as "in-flight" so the orders subscription won't
      // briefly revert it if a stale snapshot arrives before our write commits.
      pendingOrderUpdatesRef.current.set(orderId, Date.now());
      AsyncStorage.setItem("orders", JSON.stringify(updated)).catch(() => {});

      // Atomic claim runs in BACKGROUND for "received" — UI already moved.
      // If another staff already claimed it, revert UI + alert.
      if (status === "received" && assignedToId) {
        FS.claimOrder(orderId, assignedToId, assignedToName ?? "موظف", claimerPhone).then((claim) => {
          if (!claim.ok && claim.reason === "already_taken") {
            // Someone else got it first → revert our optimistic update
            const reverted = ordersRef.current.map((o) => (o.id === orderId ? prevOrder : o));
            ordersRef.current = reverted;
            setOrdersState(reverted);
            AsyncStorage.setItem("orders", JSON.stringify(reverted)).catch(() => {});
            pendingOrderUpdatesRef.current.delete(orderId);
            Alert.alert("الطلب محجوز", `استلم هذا الطلب الموظف ${claim.takenBy ?? ""} قبل قليل.`);
          } else if (!claim.ok) {
            // Transaction failed (network) — retry via saveOrder as a fallback
            saveOrderWithRetry(updatedOrder, orderId);
          } else {
            // Claim succeeded — clear pending flag after a short grace window
            setTimeout(() => pendingOrderUpdatesRef.current.delete(orderId), 3000);
          }
        }).catch(() => {
          saveOrderWithRetry(updatedOrder, orderId);
        });
      } else {
        saveOrderWithRetry(updatedOrder, orderId);
      }

      // Notifications fire regardless (they're per-status, idempotent by id)
      {
        const statusLabels: Record<string, string> = {
          received: "تم استلام طلبك",
          preparing: "طلبك قيد التجهيز",
          ready: "طلبك جاهز للاستلام",
          ready_to_ship: "طلبك جاهز للشحن",
          shipped: "تم شحن طلبك",
          delivered: "تم تسليم طلبك بنجاح",
          pending: "تم إلغاء استلام طلبك — سيتم مراجعته مجدداً",
        };
        if (statusLabels[status]) {
          const custNotif: Notification = {
            id: `notif_status_${orderId}_${status}_${Date.now()}`,
            title: statusLabels[status],
            body: `تم تحديث حالة طلبك #${orderId.slice(0, 8)}`,
            createdAt: new Date().toISOString(),
            read: false,
            targetUserId: updatedOrder.userId,
            targetUserPhone: updatedOrder.userPhone,
            linkedOrderId: orderId,
          };
          FS.saveNotification(custNotif).catch(() => {});
          if (updatedOrder.userPhone) {
            notifyUserByPhone(
              updatedOrder.userPhone,
              statusLabels[status],
              `طلبك #${orderId.slice(0, 8)} — ${statusLabels[status]}`,
              { type: "order_status", orderId, status }
            ).catch(() => {});
          }
        }
      }
    },
    []
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      const target = ordersRef.current.find((o) => o.id === orderId);
      const updated = ordersRef.current.filter((o) => o.id !== orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      FS.deleteOrder(orderId).catch(() => {});
      const me = userRef.current;
      if (me) {
        FS.appendAuditLog({
          actorId: me.id,
          actorName: me.name ?? "—",
          actorRole: me.role,
          action: "order.delete",
          targetId: orderId,
          targetType: "order",
          details: target ? { customerName: target.userName, total: target.total } : {},
        }).catch(() => {});
      }
    },
    []
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const updated = ordersRef.current.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as OrderStatus } : o));
      const cancelled = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (cancelled) await FS.saveOrder(cancelled);
    },
    []
  );

  const sendOrderMessage = useCallback(
    async (orderId: string, message: string) => {
      const order = ordersRef.current.find((o) => o.id === orderId);
      if (!order) return;
      const notif: Notification = {
        id: `notif_msg_${orderId}_${Date.now()}`,
        title: `رسالة بخصوص طلبك #${orderId.slice(0, 8)}`,
        body: message,
        createdAt: new Date().toISOString(),
        read: false,
        targetUserId: order.userId,
        targetUserPhone: order.userPhone,
      };
      const updated = [notif, ...notificationsRef.current];
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
      FS.saveNotification(notif).catch(() => {});
      if (order.userPhone) {
        notifyUserByPhone(
          order.userPhone,
          notif.title,
          message,
          { type: "order_message", orderId }
        ).catch(() => {});
      }
    },
    []
  );

  const setOrderEditable = useCallback(
    async (orderId: string, editable: boolean) => {
      const updated = ordersRef.current.map((o) =>
        o.id === orderId ? { ...o, editable } : o
      );
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) {
        FS.saveOrder(updatedOrder).catch(() => {});
        if (editable) {
          const notif: Notification = {
            id: `notif_editable_${orderId}_${Date.now()}`,
            title: "يمكنك تعديل طلبك",
            body: `الخامة غير متوفرة — يمكنك تعديل طلبك #${orderId.slice(0, 8)} واختيار بديل`,
            createdAt: new Date().toISOString(),
            read: false,
            targetUserId: updatedOrder.userId,
            targetUserPhone: updatedOrder.userPhone,
          };
          const updatedNotifs = [notif, ...notificationsRef.current];
          setNotifications(updatedNotifs);
          await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs));
          FS.saveNotification(notif).catch(() => {});
          if (updatedOrder.userPhone) {
            notifyUserByPhone(
              updatedOrder.userPhone,
              notif.title,
              notif.body,
              { type: "order_editable", orderId }
            ).catch(() => {});
          }
        }
      }
    },
    []
  );

  const setOrderInvoiceImage = useCallback(
    async (orderId: string, imageUri: string | null) => {
      const updated = ordersRef.current.map((o) => {
        if (o.id !== orderId) return o;
        if (imageUri === null) {
          const { invoiceImage, ...rest } = o;
          return rest as typeof o;
        }
        return { ...o, invoiceImage: imageUri };
      });
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) {
        FS.saveOrder(updatedOrder).catch(() => {});
        if (imageUri) {
          const notif: Notification = {
            id: `notif_invoice_${orderId}_${Date.now()}`,
            title: "تم رفع فاتورة طلبك 🧾",
            body: `تم إرفاق فاتورة طلبك #${orderId.slice(0, 8)} — يمكنك عرضها من صفحة الطلب`,
            createdAt: new Date().toISOString(),
            read: false,
            targetUserId: updatedOrder.userId,
            targetUserPhone: updatedOrder.userPhone,
            linkedOrderId: orderId,
          };
          const updatedNotifs = [notif, ...notificationsRef.current];
          setNotifications(updatedNotifs);
          AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs)).catch(() => {});
          FS.saveNotification(notif).catch(() => {});
          if (updatedOrder.userPhone) {
            notifyUserByPhone(
              updatedOrder.userPhone,
              notif.title,
              notif.body,
              { type: "invoice_uploaded", orderId }
            ).catch(() => {});
          }
        }
      }
    },
    []
  );

  const setOrderTransferProof = useCallback(
    async (orderId: string, imageUri: string | null) => {
      const updated = ordersRef.current.map((o) => {
        if (o.id !== orderId) return o;
        if (imageUri === null) {
          const { transferProofImage, ...rest } = o;
          return rest as typeof o;
        }
        return { ...o, transferProofImage: imageUri };
      });
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) {
        await FS.saveOrder(updatedOrder);
        if (imageUri) {
          const notif: Notification = {
            id: `notif_proof_${orderId}_${Date.now()}`,
            title: "📸 العميل أرسل إثبات تحويل",
            body: `العميل ${updatedOrder.userName} أرفق صورة التحويل للطلب #${orderId.slice(0, 8)}`,
            createdAt: new Date().toISOString(),
            read: false,
            targetRole: "staff" as any,
            sourceUserId: updatedOrder.userId,
            linkedOrderId: orderId,
          };
          const updatedNotifs = [notif, ...notificationsRef.current];
          setNotifications(updatedNotifs);
          AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs)).catch(() => {});
          FS.saveNotification(notif).catch(() => {});
        }
      }
    },
    []
  );

  const setOrderShipping = useCallback(
    async (orderId: string, data: { providerId?: ShippingProviderId | null; providerName?: string | null; waybillImage?: string | null; waybillNumber?: string | null }) => {
      const updated = ordersRef.current.map((o) => {
        if (o.id !== orderId) return o;
        const next = { ...o };
        if (data.providerId !== undefined) {
          if (data.providerId === null) delete next.shippingProviderId;
          else next.shippingProviderId = data.providerId;
        }
        if (data.providerName !== undefined) {
          if (data.providerName === null) delete next.shippingProviderName;
          else next.shippingProviderName = data.providerName;
        }
        if (data.waybillImage !== undefined) {
          if (data.waybillImage === null) delete next.shippingWaybillImage;
          else next.shippingWaybillImage = data.waybillImage;
        }
        if (data.waybillNumber !== undefined) {
          if (!data.waybillNumber) delete next.shippingWaybillNumber;
          else next.shippingWaybillNumber = data.waybillNumber;
        }
        return next;
      });
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) await FS.saveOrder(updatedOrder);
    },
    []
  );

  const setOrderPaymentMethod = useCallback(
    async (orderId: string, method: PaymentMethod) => {
      const ewalletPct = settings.payment?.ewalletFeePercent ?? 1;
      const updated = ordersRef.current.map((o) => {
        if (o.id !== orderId) return o;
        const fee = method === "ewallet" ? Math.ceil(o.total * ewalletPct / 100) : 0;
        return { ...o, paymentMethod: method, paymentFee: fee, totalWithFee: o.total + fee };
      });
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) await FS.saveOrder(updatedOrder);
    },
    [settings]
  );

  const setOrderPaymentOverride = useCallback(
    async (orderId: string, handle: string | null, name?: string | null) => {
      const updated = ordersRef.current.map((o) => {
        if (o.id !== orderId) return o;
        if (handle === null) {
          const { paymentOverrideHandle, paymentOverrideName, ...rest } = o;
          return rest as typeof o;
        }
        return { ...o, paymentOverrideHandle: handle, paymentOverrideName: name || "" };
      });
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) await FS.saveOrder(updatedOrder);
    },
    []
  );

  const hashPin = (pin: string): string => {
    let h = 0x811c9dc5;
    for (let i = 0; i < pin.length; i++) {
      h ^= pin.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return "p_" + h.toString(16);
  };

  const setCustomerPin = useCallback(
    async (phone: string, pin: string) => {
      const hashed = hashPin(pin);
      const existing = registeredCustomersRef.current.find((c) => samePhone(c.phone, phone));
      if (existing) {
        const updated = { ...existing, pin: hashed };
        updateRegisteredCustomer(updated);
      }
      const cur = userRef.current;
      if (cur && samePhone(cur.phone, phone)) {
        const synced = { ...cur, pin: hashed };
        setUserState(synced);
        await persistUserSafe(synced);
      }
    },
    [updateRegisteredCustomer]
  );

  const verifyCustomerPin = useCallback(
    (phone: string, pin: string): boolean => {
      const c = registeredCustomersRef.current.find((x) => samePhone(x.phone, phone));
      if (!c?.pin) return false;
      return c.pin === hashPin(pin);
    },
    []
  );

  const updateOrderItems = useCallback(
    async (orderId: string, items: CartItem[], total: number, staffEdit?: boolean, notes?: string, fulfillment?: { fulfillmentType?: FulfillmentType; branchId?: string; branchName?: string }) => {
      const updated = ordersRef.current.map((o) => {
        if (o.id !== orderId) return o;
        const ewalletPct = settings.payment?.ewalletFeePercent ?? 1;
        const fee = o.paymentMethod === "ewallet" ? Math.ceil(total * ewalletPct / 100) : 0;
        return {
          ...o,
          items,
          total,
          paymentFee: fee,
          totalWithFee: total + fee,
          ...(notes !== undefined ? { notes } : {}),
          ...(fulfillment?.fulfillmentType !== undefined ? { fulfillmentType: fulfillment.fulfillmentType } : {}),
          ...(fulfillment?.branchId !== undefined ? { branchId: fulfillment.branchId } : {}),
          ...(fulfillment?.branchName !== undefined ? { branchName: fulfillment.branchName } : {}),
          ...(staffEdit ? {} : { editable: false, edited: true, editedAt: new Date().toISOString() }),
        };
      });
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) {
        const ok = await saveOrderReliable(updatedOrder);
        if (!ok) {
          throw new Error("save_failed");
        }
        if (!staffEdit) {
          const assignedStaffId = updatedOrder.assignedTo;
          const assignedStaffPhone = updatedOrder.assignedToPhone;
          const staffNotif: Notification = {
            id: `notif_edited_${orderId}_${Date.now()}`,
            title: "تم تعديل الطلب من قبل العميل ✏️",
            body: `العميل ${updatedOrder.userName} عدّل طلبه #${orderId.slice(0, 8)} — يرجى مراجعة التعديلات ومتابعة التجهيز`,
            createdAt: new Date().toISOString(),
            read: false,
            sourceUserId: updatedOrder.userId,
            ...(assignedStaffId
              ? { targetUserId: assignedStaffId, ...(assignedStaffPhone ? { targetUserPhone: assignedStaffPhone } : {}) }
              : { targetRole: "staff" as any }),
            linkedOrderId: orderId,
          };
          const updatedNotifs = [staffNotif, ...notificationsRef.current];
          setNotifications(updatedNotifs);
          await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs));
          FS.saveNotification(staffNotif).catch(() => {});
          if (assignedStaffId) {
            const staffRecord = registeredCustomersRef.current.find((c) => c.id === assignedStaffId);
            if (staffRecord?.phone) {
              notifyUserByPhone(
                staffRecord.phone,
                "تم تعديل الطلب ✏️",
                `العميل ${updatedOrder.userName} عدّل طلبه #${orderId.slice(0, 8)} — راجع التعديلات`,
                { type: "order_edited", orderId }
              ).catch(() => {});
            }
          }
        }
      }
    },
    [settings]
  );

  const addReturnRequest = useCallback(
    async (req: ReturnRequest) => {
      const updated = [req, ...returnRequests];
      setReturnRequests(updated);
      await AsyncStorage.setItem("returnRequests", JSON.stringify(updated));
      FS.saveReturnRequest(req).catch(() => {});
      const staffNotif: Notification = {
        id: `notif_return_${req.orderId}_${Date.now()}`,
        title: "طلب استرجاع جديد",
        body: `العميل ${req.userName} يطلب استرجاع من الطلب #${req.orderId.slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        read: false,
        targetRole: "employee" as any,
        linkedOrderId: req.orderId,
        linkedReturnId: req.id,
      };
      const updatedNotifs = [staffNotif, ...notificationsRef.current];
      setNotifications(updatedNotifs);
      await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs));
      FS.saveNotification(staffNotif).catch(() => {});
    },
    [returnRequests]
  );

  const updateReturnStatus = useCallback(
    async (reqId: string, status: ReturnStatus) => {
      const updated = returnRequests.map((r) => (r.id === reqId ? { ...r, status } : r));
      setReturnRequests(updated);
      await AsyncStorage.setItem("returnRequests", JSON.stringify(updated));
      const req = updated.find((r) => r.id === reqId);
      if (req) {
        FS.saveReturnRequest(req).catch(() => {});
        const custNotif: Notification = {
          id: `notif_return_${reqId}_${status}_${Date.now()}`,
          title: status === "returned" ? "تم استرجاع الطلب" : status === "settled" ? "تمت المخالصة" : "طلب الاسترجاع قيد المراجعة",
          body: `طلب الاسترجاع للطلب #${req.orderId.slice(0, 8)} — ${status === "returned" ? "تم الاسترجاع" : "تمت المخالصة"}`,
          createdAt: new Date().toISOString(),
          read: false,
          targetUserId: req.userId,
          targetUserPhone: req.userPhone,
          linkedOrderId: req.orderId,
          linkedReturnId: req.id,
        };
        const updatedNotifs = [custNotif, ...notificationsRef.current];
        setNotifications(updatedNotifs);
        await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs));
        FS.saveNotification(custNotif).catch(() => {});
      }
    },
    [returnRequests]
  );

  const cancelReturnRequest = useCallback(
    async (reqId: string, reason?: string) => {
      const nowIso = new Date().toISOString();
      const updated = returnRequests.map((r) =>
        r.id === reqId
          ? {
              ...r,
              status: "cancelled" as ReturnStatus,
              cancelReason: reason || "",
              cancelledAt: nowIso,
              cancelledByName: userRef.current?.name || "موظف",
            }
          : r
      );
      setReturnRequests(updated);
      await AsyncStorage.setItem("returnRequests", JSON.stringify(updated));
      const req = updated.find((r) => r.id === reqId);
      if (req) {
        FS.saveReturnRequest(req).catch(() => {});
        const custNotif: Notification = {
          id: `notif_return_cancel_${reqId}_${Date.now()}`,
          title: "تم إلغاء طلب الاسترجاع",
          body: reason
            ? `تم إلغاء طلب الاسترجاع للطلب #${req.orderId.slice(0, 8)} — السبب: ${reason}`
            : `تم إلغاء طلب الاسترجاع للطلب #${req.orderId.slice(0, 8)}`,
          createdAt: new Date().toISOString(),
          read: false,
          targetUserId: req.userId,
          targetUserPhone: req.userPhone,
          linkedOrderId: req.orderId,
          linkedReturnId: req.id,
        };
        const updatedNotifs = [custNotif, ...notificationsRef.current];
        setNotifications(updatedNotifs);
        await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs));
        FS.saveNotification(custNotif).catch(() => {});
        notifyUserByPhone(
          req.userPhone,
          "تم إلغاء طلب الاسترجاع ❌",
          reason
            ? `تم إلغاء طلب استرجاعك للطلب #${req.orderId.slice(0, 8)} — السبب: ${reason}`
            : `تم إلغاء طلب استرجاعك للطلب #${req.orderId.slice(0, 8)}`,
          { type: "return_cancelled", orderId: req.orderId }
        ).catch(() => {});
      }
    },
    [returnRequests]
  );

  const deleteReturnRequest = useCallback(
    async (reqId: string) => {
      const updated = returnRequests.filter((r) => r.id !== reqId);
      setReturnRequests(updated);
      await AsyncStorage.setItem("returnRequests", JSON.stringify(updated));
    },
    [returnRequests]
  );

  const setTabs = useCallback(async (t: Tab[]) => {
    setTabsState(t);
    await AsyncStorage.setItem("tabs", JSON.stringify(t));
  }, []);

  const notificationsRef = useRef<Notification[]>([]);
  notificationsRef.current = notifications;

  const addNotification = useCallback(
    async (notification: Notification) => {
      const updated = [notification, ...notificationsRef.current];
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
      FS.saveNotification(notification).catch(() => {});

      // Trigger phone notification tray + elegant sound for the current device.
      // Targeted notifications only fire locally if they're for current user (or broadcast).
      const currentUser = userRef.current;
      const isForMe =
        !notification.targetUserId ||
        notification.targetUserId === "self" ||
        notification.targetUserId === currentUser?.id;
      if (isForMe) {
        if (Platform.OS !== "web") {
          try {
            const Notif = await import("expo-notifications");
            await Notif.scheduleNotificationAsync({
              content: {
                title: notification.title,
                body: notification.body,
                sound: true,
                data: { id: notification.id },
              },
              trigger: null,
            });
          } catch {}
        }
      }
    },
    []
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      // Track in per-user local set so we don't depend on Firestore's shared
      // `read` flag for broadcast notifications. This prevents "notifications
      // reappear" bug when batchMarkRead fails silently or when the doc is
      // shared across users.
      const next = new Set(readNotifIdsRef.current);
      next.add(id);
      setReadNotifIds(next);
      persistReadNotifIds(next);
      const updated = notificationsRef.current.map((n) => (n.id === id ? { ...n, read: true } : n));
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
      FS.markNotificationReadFlag(id).catch(() => {});
    },
    [persistReadNotifIds]
  );

  const markAllNotificationsRead = useCallback(
    async () => {
      const localSet = readNotifIdsRef.current;
      const unreadIds = notificationsRef.current
        .filter((n) => !n.read && !localSet.has(n.id))
        .map((n) => n.id);
      if (unreadIds.length === 0) return;
      const next = new Set(localSet);
      for (const id of unreadIds) next.add(id);
      setReadNotifIds(next);
      persistReadNotifIds(next);
      const updated = notificationsRef.current.map((n) => ({ ...n, read: true }));
      setNotifications(updated);
      AsyncStorage.setItem("notifications", JSON.stringify(updated)).catch(() => {});
      FS.batchMarkRead(unreadIds).catch(() => {});
    },
    [persistReadNotifIds]
  );

  const isNotifReadForUser = useCallback(
    (n: Notification) => {
      if (n.read) return true;
      return readNotifIdsRef.current.has(n.id);
    },
    []
  );

  const setPricingView = useCallback(async (mode: "auto" | "wholesale" | "retail") => {
    setPricingViewState(mode);
    try { await AsyncStorage.setItem("pricingView", mode); } catch {}
  }, []);

  const updateCartWeight = useCallback(
    (productId: string, colorName: string, weight: number) => {
      setCart((prev) =>
        weight <= 0
          ? prev.filter((c) => !(c.productId === productId && c.colorName === colorName))
          : prev.map((c) =>
              c.productId === productId && c.colorName === colorName
                ? { ...c, weight }
                : c
            )
      );
    },
    []
  );

  const setSettings = useCallback(async (s: AppSettings) => {
    setSettingsState(s);
    await AsyncStorage.setItem("settings", JSON.stringify(s));
    try {
      await FS.saveSettings(s);
    } catch (e: any) {
      console.warn("[Settings] Firebase save failed:", e?.code || e?.message || e);
      throw new Error(
        "تعذّر حفظ الإعدادات على السيرفر — تأكد من تسجيل الدخول كأدمن. سيتم حفظها على هذا الجهاز فقط."
      );
    }
  }, []);

  const setTheme = useCallback(async (t: AppTheme) => {
    setThemeState(t);
    await AsyncStorage.setItem("theme", t);
  }, []);

  const setLanguage = useCallback(async (l: AppLanguage) => {
    setLanguageState(l);
    await AsyncStorage.setItem("language", l);
  }, []);

  // Effective price mode: customer/non-staff non-merchant => retail.
  // merchant => wholesale (always).
  // admin/staff: defaults to wholesale, but if pricingView is set explicitly
  // and the user has permission to toggle, use that.
  const canTogglePricing = useMemo(() => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "supervisor" || user.role === "employee") {
      return (user.permissions ?? []).includes("toggle_price_view");
    }
    return false;
  }, [user?.role, user?.permissions]);

  const effectivePriceMode: "wholesale" | "retail" = useMemo(() => {
    if (!user) return "retail";
    if (user.role === "customer") return "retail";
    if (user.role === "merchant") return "wholesale";
    // staff/admin
    if (canTogglePricing && (pricingView === "wholesale" || pricingView === "retail")) {
      return pricingView;
    }
    return "wholesale";
  }, [user?.role, pricingView, canTogglePricing]);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        registeredCustomers,
        findCustomerByPhone,
        registerCustomer,
        updateRegisteredCustomer,
        deleteRegisteredCustomer,
        products,
        setProducts,
        addProductOne,
        updateProductOne,
        deleteProductOne,
        cart,
        setCart,
        addToCart,
        removeFromCart,
        updateCartItem,
        clearCart,
        orders,
        setOrders,
        addOrder,
        updateOrderStatus,
        deleteOrder,
        cancelOrder,
        sendOrderMessage,
        setOrderEditable,
        setOrderInvoiceImage,
        setOrderTransferProof,
        setOrderShipping,
        setOrderPaymentMethod,
        setOrderPaymentOverride,
        setCustomerPin,
        verifyCustomerPin,
        updateOrderItems,
        editingOrderId,
        setEditingOrderId,
        returnRequests,
        addReturnRequest,
        updateReturnStatus,
        cancelReturnRequest,
        deleteReturnRequest,
        tabs,
        setTabs,
        notifications,
        addNotification,
        onlineCount,
        onlineUsers,
        markNotificationRead,
        markAllNotificationsRead,
        updateCartWeight,
        settings,
        setSettings,
        theme,
        setTheme,
        language,
        setLanguage,
        isLoading,
        roleSwitching,
        showToast,
        toast,
        pricingView,
        setPricingView,
        effectivePriceMode,
        canTogglePricing,
        isNotifReadForUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
