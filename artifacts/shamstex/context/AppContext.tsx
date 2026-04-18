import AsyncStorage from "@react-native-async-storage/async-storage";
import { setSecureItem, getSecureItem, deleteSecureItem } from "@/lib/secureStorage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { FS } from "@/lib/firebase";
import { notifyStaffNewOrder, notifyUserByPhone, notifyByRoles, notifyAll } from "@/lib/pushService";
import { playNotificationAlert } from "@/lib/notificationSound";

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
  | "manage_settings";

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

export type OrderStatus = "pending" | "received" | "preparing" | "ready" | "delivered" | "cancelled";

export type PaymentMethod = "cash" | "bank_transfer" | "ewallet" | "instapay";

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
  editable?: boolean;
  edited?: boolean;
  editedAt?: string;
  paymentMethod?: PaymentMethod;
  paymentFee?: number;
  totalWithFee?: number;
  paymentConfirmed?: boolean;
  invoiceImage?: string;
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
  targetRole?: UserRole;
  targetUserId?: string;
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

export type AppTheme = "dark" | "light";
export type AppLanguage = "ar" | "en";

export interface PaymentSettings {
  ewalletNumber: string;
  ewalletName: string;
  instapayNumber: string;
  instapayName: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIBAN: string;
  ewalletFeePercent: number;
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
  logoUri?: string;
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
    ewalletNumber: "01000000001",
    ewalletName: "شمس تكس",
    instapayNumber: "01000000001",
    instapayName: "شمس تكس",
    bankName: "البنك الأهلي المصري",
    bankAccountName: "شمس تكس للأقمشة",
    bankAccountNumber: "1234567890123",
    bankIBAN: "EG000012345678901234567890",
    ewalletFeePercent: 1,
  },
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
  updateOrderItems: (orderId: string, items: CartItem[], total: number, staffEdit?: boolean, notes?: string) => Promise<void>;
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
  showToast: (message: string, type?: "success" | "error") => void;
  toast: { message: string; type: "success" | "error"; visible: boolean };
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
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [language, setLanguageState] = useState<AppLanguage>("ar");
  const [isLoading, setIsLoading] = useState(true);
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

  // Real-time Firestore listeners — update UI instantly without reloading
  useEffect(() => {
    const unsubOrders = FS.subscribeOrders((freshOrders) => {
      // Always sync — even if list becomes empty (e.g. all orders deleted)
      setOrdersState(freshOrders);
      AsyncStorage.setItem("orders", JSON.stringify(freshOrders)).catch(() => {});
    });

    const unsubCustomers = FS.subscribeCustomers((freshCustomers) => {
      if (freshCustomers.length > 0) {
        // Deduplicate by phone — keep the most recently updated record per phone
        const dedupMap = new Map<string, any>();
        for (const c of freshCustomers) {
          const existing = dedupMap.get(c.phone);
          const cTime = c.lastUpdated || c.registeredAt || "";
          const eTime = existing ? (existing.lastUpdated || existing.registeredAt || "") : "";
          if (!existing || cTime > eTime) {
            dedupMap.set(c.phone, c);
          }
        }
        const deduped = [...dedupMap.values()];
        setRegisteredCustomersState(deduped);
        AsyncStorage.setItem("registered_customers", JSON.stringify(deduped)).catch(() => {});
      }
    });

    let isFirstNotifLoad = true;
    const unsubNotifications = FS.subscribeNotifications((freshNotifs) => {
      if (freshNotifs.length > 0) {
        const prevIds = new Set(notificationsRef.current.map((n) => n.id));
        setNotifications(freshNotifs);
        AsyncStorage.setItem("notifications", JSON.stringify(freshNotifs)).catch(() => {});
        if (!isFirstNotifLoad) {
          const me = userRef.current;
          const isStaff = me && me.role !== "customer";
          const newOnes = freshNotifs.filter((n) => !prevIds.has(n.id));
          const forMe = newOnes.filter((n) => {
            if (n.targetUserId === "self") return false;
            if (n.targetUserId && me && n.targetUserId === me.id) return true;
            if (n.targetRole === "staff" && isStaff) return true;
            if (n.targetRole && me && n.targetRole === me.role) return true;
            if (!n.targetUserId && !n.targetRole) return true;
            return false;
          });
          if (forMe.length > 0) {
            playNotificationAlert();
            if (Platform.OS !== "web") {
              import("expo-notifications").then((Notif) => {
                forMe.slice(0, 5).forEach((n) => {
                  Notif.scheduleNotificationAsync({
                    content: {
                      title: n.title,
                      body: n.body,
                      sound: "notification.wav",
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
    });

    const unsubReturns = FS.subscribeReturnRequests((freshReqs) => {
      if (freshReqs.length > 0) {
        setReturnRequests(freshReqs);
        AsyncStorage.setItem("returnRequests", JSON.stringify(freshReqs)).catch(() => {});
      }
    });

    const unsubProducts = FS.subscribeProducts((freshProducts) => {
      if (freshProducts.length > 0) {
        const sorted = [...freshProducts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setProductsState(sorted);
        AsyncStorage.setItem("products", JSON.stringify(sorted)).catch(() => {});
      }
    });

    return () => {
      unsubOrders();
      unsubCustomers();
      unsubNotifications();
      unsubReturns();
      unsubProducts();
    };
  }, []);

  const userRef = React.useRef<User | null>(null);
  userRef.current = user;

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
          // Another device took over this account → log out immediately
          try {
            await AsyncStorage.removeItem("user");
            await deleteSecureItem("sessionToken");
          } catch {}
          setUserState(null);
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
    const freshRecord = registeredCustomers.find((c) => c.phone === currentUser.phone);
    if (!freshRecord) return;
    const roleChanged = freshRecord.role !== currentUser.role;
    const changed =
      roleChanged ||
      freshRecord.vip !== currentUser.vip ||
      freshRecord.upgradeStatus !== currentUser.upgradeStatus ||
      freshRecord.name !== currentUser.name ||
      JSON.stringify(freshRecord.permissions ?? []) !== JSON.stringify(currentUser.permissions ?? []);
    if (changed) {
      const synced: User = { ...currentUser, ...freshRecord };
      setUserState(synced);
      persistUserSafe(synced).catch(() => {});

      if (roleChanged) {
        const roleNames: Record<string, string> = {
          customer: "زبون",
          merchant: "تاجر",
          employee: "موظف",
          supervisor: "مشرف",
          admin: "مدير",
        };
        const roleName = roleNames[freshRecord.role] || freshRecord.role;
        if (Platform.OS === "web") {
          setTimeout(() => {
            window.alert(`تم تغيير دورك إلى: ${roleName}\nسيتم إعادة تحميل التطبيق لتحديث الأسعار`);
            window.location.reload();
          }, 300);
        } else {
          Alert.alert(
            "تم تغيير دورك",
            `تم تغيير دورك إلى: ${roleName}\nسيتم إعادة تسجيل الدخول لتحديث الأسعار`,
            [{
              text: "حسناً",
              onPress: async () => {
                await persistUserSafe(synced);
                setUserState(null);
                setTimeout(() => setUserState(synced), 500);
              },
            }]
          );
        }
      }
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
      await persistUserSafe(u);
    } else {
      await AsyncStorage.removeItem("user");
      await deleteSecureItem("sessionToken");
    }
  }, []);

  const findCustomerByPhone = useCallback(
    (phone: string): User | undefined => {
      if (!phone) return undefined;
      // Exact match
      const exact = registeredCustomers.find((c) => c.phone === phone);
      if (exact) return exact;
      // Format-agnostic match: compare digits only and also try with/without country prefix.
      const digits = phone.replace(/\D/g, "");
      return registeredCustomers.find((c) => {
        const cd = (c.phone || "").replace(/\D/g, "");
        if (cd === digits) return true;
        // E.164 vs local: e.g. +201221131138 ↔ 01221131138
        if (cd.length > digits.length && cd.endsWith(digits.replace(/^0+/, ""))) return true;
        if (digits.length > cd.length && digits.endsWith(cd.replace(/^0+/, ""))) return true;
        return false;
      });
    },
    [registeredCustomers]
  );

  const registerCustomer = useCallback(async (newUser: User) => {
    const existing = registeredCustomers.find((c) => c.phone === newUser.phone);
    const userToSave = existing
      ? { ...newUser, id: existing.id, role: existing.role, permissions: existing.permissions ?? newUser.permissions, vip: existing.vip ?? newUser.vip }
      : newUser;
    const updated = [...registeredCustomers.filter((c) => c.phone !== newUser.phone), userToSave];
    setRegisteredCustomersState(updated);
    await AsyncStorage.setItem("registered_customers", JSON.stringify(updated));
    FS.saveCustomer(userToSave).catch(() => {});
  }, [registeredCustomers]);

  const updateRegisteredCustomer = useCallback((updatedUser: User) => {
    setRegisteredCustomersState((prev) => {
      const updated = prev.map((c) => c.phone === updatedUser.phone ? updatedUser : c);
      AsyncStorage.setItem("registered_customers", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    const currentUser = userRef.current;
    if (currentUser && currentUser.phone === updatedUser.phone) {
      const synced = { ...currentUser, ...updatedUser };
      setUserState(synced);
      persistUserSafe(synced).catch(() => {});
    }
    FS.saveCustomer(updatedUser).catch(() => {});
  }, []);

  const deleteRegisteredCustomer = useCallback((phone: string) => {
    setRegisteredCustomersState((prev) => {
      const updated = prev.filter((c) => c.phone !== phone);
      AsyncStorage.setItem("registered_customers", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    FS.deleteCustomer(phone).catch(() => {});
  }, []);

  const setProducts = useCallback(async (prods: Product[]) => {
    setProductsState(prods);
    await AsyncStorage.setItem("products", JSON.stringify(prods));
    prods.forEach((p) => FS.saveProduct(p).catch(() => {}));
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

  const addOrder = useCallback(
    async (order: Order) => {
      const updated = [...ordersRef.current, order];
      setOrdersState(updated);
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      FS.saveOrder(order).catch(() => {});
      const staffNotif: Notification = {
        id: `notif_order_new_${order.id}`,
        title: "🛍️ طلب جديد",
        body: `وصل طلب جديد من ${order.userName} (${order.userPhone})`,
        createdAt: new Date().toISOString(),
        read: false,
        targetRole: "staff",
        linkedOrderId: order.id,
      };
      FS.saveNotification(staffNotif).catch(() => {});
      notifyStaffNewOrder(order.id, order.userName).catch(() => {});
    },
    []
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, assignedToId?: string, assignedToName?: string) => {
      const patch: Partial<Order> = { status };
      if (status === "received" && assignedToId) {
        patch.assignedTo = assignedToId;
        patch.assignedToName = assignedToName;
      }
      if (status === "pending") {
        patch.assignedTo = "";
        patch.assignedToName = "";
      }
      if (status === "delivered") {
        patch.deliveredAt = new Date().toISOString();
      }
      const updated = ordersRef.current.map((o) => (o.id !== orderId ? o : { ...o, ...patch }));
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) {
        FS.saveOrder(updatedOrder).catch(() => {});
        const statusLabels: Record<string, string> = {
          received: "تم استلام طلبك",
          preparing: "طلبك قيد التجهيز",
          ready: "طلبك جاهز للاستلام",
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
      const updated = ordersRef.current.filter((o) => o.id !== orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      FS.deleteOrder(orderId).catch(() => {});
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
      if (cancelled) FS.saveOrder(cancelled).catch(() => {});
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

  const updateOrderItems = useCallback(
    async (orderId: string, items: CartItem[], total: number, staffEdit?: boolean, notes?: string) => {
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
          ...(staffEdit ? {} : { editable: false, edited: true, editedAt: new Date().toISOString() }),
        };
      });
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) {
        FS.saveOrder(updatedOrder).catch(() => {});
        if (!staffEdit) {
          const assignedStaffId = updatedOrder.assignedTo;
          const staffNotif: Notification = {
            id: `notif_edited_${orderId}_${Date.now()}`,
            title: "تم تعديل الطلب من قبل العميل ✏️",
            body: `العميل ${updatedOrder.userName} عدّل طلبه #${orderId.slice(0, 8)} — يرجى مراجعة التعديلات ومتابعة التجهيز`,
            createdAt: new Date().toISOString(),
            read: false,
            ...(assignedStaffId ? { targetUserId: assignedStaffId } : { targetRole: "employee" as any }),
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
      const updated = returnRequests.map((r) => (r.id === reqId ? { ...r, status: "cancelled" as ReturnStatus } : r));
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
        playNotificationAlert();
        if (Platform.OS !== "web") {
          try {
            const Notif = await import("expo-notifications");
            await Notif.scheduleNotificationAsync({
              content: {
                title: notification.title,
                body: notification.body,
                sound: "notification.wav",
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
      const updated = notificationsRef.current.map((n) => (n.id === id ? { ...n, read: true } : n));
      const notif = updated.find((n) => n.id === id);
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
      if (notif) FS.saveNotification(notif).catch(() => {});
    },
    []
  );

  const markAllNotificationsRead = useCallback(
    async () => {
      const unreadIds = notificationsRef.current.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const updated = notificationsRef.current.map((n) => ({ ...n, read: true }));
      setNotifications(updated);
      AsyncStorage.setItem("notifications", JSON.stringify(updated)).catch(() => {});
      FS.batchMarkRead(unreadIds).catch(() => {});
    },
    []
  );

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
    FS.saveSettings(s).catch(() => {});
  }, []);

  const setTheme = useCallback(async (t: AppTheme) => {
    setThemeState(t);
    await AsyncStorage.setItem("theme", t);
  }, []);

  const setLanguage = useCallback(async (l: AppLanguage) => {
    setLanguageState(l);
    await AsyncStorage.setItem("language", l);
  }, []);

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
        showToast,
        toast,
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
