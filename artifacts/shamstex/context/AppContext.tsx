import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { FS } from "@/lib/firebase";
import { notifyStaffNewOrder, notifyUserByPhone, notifyByRoles, notifyAll } from "@/lib/pushService";

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
  | "delete_orders";

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
}

export type OrderStatus = "pending" | "received" | "preparing" | "ready" | "delivered" | "cancelled";

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
}

export type ReturnStatus = "pending" | "returned" | "settled";

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
  updateRegisteredCustomer: (user: User) => Promise<void>;
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
  updateOrderItems: (orderId: string, items: CartItem[], total: number) => Promise<void>;
  editingOrderId: string | null;
  setEditingOrderId: (id: string | null) => void;
  returnRequests: ReturnRequest[];
  addReturnRequest: (req: ReturnRequest) => Promise<void>;
  updateReturnStatus: (reqId: string, status: ReturnStatus) => Promise<void>;
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => Promise<void>;
  notifications: Notification[];
  addNotification: (notification: Notification) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateCartWeight: (productId: string, colorName: string, weight: number) => void;
  settings: AppSettings;
  setSettings: (settings: AppSettings) => Promise<void>;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => Promise<void>;
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
  const [products, setProductsState] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [tabs, setTabsState] = useState<Tab[]>(DEFAULT_TABS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setThemeState] = useState<AppTheme>("dark");
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

    const unsubNotifications = FS.subscribeNotifications((freshNotifs) => {
      if (freshNotifs.length > 0) {
        setNotifications(freshNotifs);
        AsyncStorage.setItem("notifications", JSON.stringify(freshNotifs)).catch(() => {});
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

  // Auto-sync logged-in user when their customer record changes in Firestore
  // (fixes VIP badge, role upgrade, upgradeStatus not reflecting for logged-in customer)
  const userRef = React.useRef<User | null>(null);
  userRef.current = user;
  useEffect(() => {
    const currentUser = userRef.current;
    if (!currentUser || !currentUser.phone) return;
    // Find current user in the freshly-updated registeredCustomers list
    const freshRecord = registeredCustomers.find((c) => c.phone === currentUser.phone);
    if (!freshRecord) return;
    // Only update if something relevant actually changed
    const changed =
      freshRecord.role !== currentUser.role ||
      freshRecord.vip !== currentUser.vip ||
      freshRecord.upgradeStatus !== currentUser.upgradeStatus ||
      freshRecord.name !== currentUser.name ||
      JSON.stringify(freshRecord.permissions ?? []) !== JSON.stringify(currentUser.permissions ?? []);
    if (changed) {
      const synced: User = { ...currentUser, ...freshRecord };
      setUserState(synced);
      AsyncStorage.setItem("user", JSON.stringify(synced)).catch(() => {});
    }
  }, [registeredCustomers]);

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
        try {
          if (parsedUser.phone && parsedUser.sessionToken) {
            const remoteToken = await FS.getSession(parsedUser.phone);
            if (remoteToken && remoteToken !== parsedUser.sessionToken) {
              await AsyncStorage.removeItem("user");
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

  const setUser = useCallback(async (u: User | null) => {
    setUserState(u);
    if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
    else await AsyncStorage.removeItem("user");
  }, []);

  const findCustomerByPhone = useCallback(
    (phone: string): User | undefined => registeredCustomers.find((c) => c.phone === phone),
    [registeredCustomers]
  );

  const registerCustomer = useCallback(async (newUser: User) => {
    // If this phone already exists, preserve their existing ID and permissions
    const existing = registeredCustomers.find((c) => c.phone === newUser.phone);
    // Preserve existing permissions — ?? means: only fallback if existing.permissions is null/undefined
    const userToSave = existing
      ? { ...newUser, id: existing.id, permissions: existing.permissions ?? newUser.permissions }
      : newUser;
    const updated = [...registeredCustomers.filter((c) => c.phone !== newUser.phone), userToSave];
    setRegisteredCustomersState(updated);
    await AsyncStorage.setItem("registered_customers", JSON.stringify(updated));
    FS.saveCustomer(userToSave).catch(() => {});
  }, [registeredCustomers]);

  const updateRegisteredCustomer = useCallback(async (updatedUser: User) => {
    const updated = registeredCustomers.map((c) => c.phone === updatedUser.phone ? updatedUser : c);
    setRegisteredCustomersState(updated);
    await AsyncStorage.setItem("registered_customers", JSON.stringify(updated));
    FS.saveCustomer(updatedUser).catch(() => {});
    // If the updated user is the currently logged-in user, sync their session too
    if (user && user.phone === updatedUser.phone) {
      const synced = { ...user, ...updatedUser };
      setUserState(synced);
      await AsyncStorage.setItem("user", JSON.stringify(synced));
    }
  }, [registeredCustomers, user]);

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

  const updateOrderItems = useCallback(
    async (orderId: string, items: CartItem[], total: number) => {
      const updated = ordersRef.current.map((o) =>
        o.id === orderId ? { ...o, items, total, editable: false } : o
      );
      const updatedOrder = updated.find((o) => o.id === orderId);
      setOrdersState(updated);
      ordersRef.current = updated;
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      if (updatedOrder) {
        FS.saveOrder(updatedOrder).catch(() => {});
        const staffNotif: Notification = {
          id: `notif_edited_${orderId}_${Date.now()}`,
          title: "تم تعديل الطلب من قبل العميل",
          body: `العميل عدّل طلبه #${orderId.slice(0, 8)} — يرجى المراجعة`,
          createdAt: new Date().toISOString(),
          read: false,
          targetRole: "employee" as any,
          linkedOrderId: orderId,
        };
        const updatedNotifs = [staffNotif, ...notificationsRef.current];
        setNotifications(updatedNotifs);
        await AsyncStorage.setItem("notifications", JSON.stringify(updatedNotifs));
        FS.saveNotification(staffNotif).catch(() => {});
      }
    },
    []
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
      const updated = notificationsRef.current.map((n) => ({ ...n, read: true }));
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
      for (const n of updated) {
        FS.saveNotification(n).catch(() => {});
      }
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

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        registeredCustomers,
        findCustomerByPhone,
        registerCustomer,
        updateRegisteredCustomer,
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
        updateOrderItems,
        editingOrderId,
        setEditingOrderId,
        returnRequests,
        addReturnRequest,
        updateReturnStatus,
        tabs,
        setTabs,
        notifications,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        updateCartWeight,
        settings,
        setSettings,
        theme,
        setTheme,
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
