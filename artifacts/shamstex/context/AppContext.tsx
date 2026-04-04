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

export type OrderStatus = "pending" | "received" | "preparing" | "ready" | "cancelled";

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  notes?: string;
  assignedTo?: string;      // employee/supervisor id who received this order
  assignedToName?: string;  // their display name
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
  tabs: Tab[];
  setTabs: (tabs: Tab[]) => Promise<void>;
  notifications: Notification[];
  addNotification: (notification: Notification) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
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
      if (freshOrders.length > 0) {
        setOrdersState(freshOrders);
        AsyncStorage.setItem("orders", JSON.stringify(freshOrders)).catch(() => {});
      }
    });

    const unsubCustomers = FS.subscribeCustomers((freshCustomers) => {
      if (freshCustomers.length > 0) {
        setRegisteredCustomersState(freshCustomers);
        AsyncStorage.setItem("registered_customers", JSON.stringify(freshCustomers)).catch(() => {});
      }
    });

    const unsubNotifications = FS.subscribeNotifications((freshNotifs) => {
      if (freshNotifs.length > 0) {
        setNotifications(freshNotifs);
        AsyncStorage.setItem("notifications", JSON.stringify(freshNotifs)).catch(() => {});
      }
    });

    return () => {
      unsubOrders();
      unsubCustomers();
      unsubNotifications();
    };
  }, []);

  const loadPersistedData = async () => {
    try {
      const [userData, customersData, productsData, ordersData, tabsData, notificationsData, settingsData, themeData] =
        await Promise.all([
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("registered_customers"),
          AsyncStorage.getItem("products"),
          AsyncStorage.getItem("orders"),
          AsyncStorage.getItem("tabs"),
          AsyncStorage.getItem("notifications"),
          AsyncStorage.getItem("settings"),
          AsyncStorage.getItem("theme"),
        ]);

      if (userData) {
        const parsedUser: User = JSON.parse(userData);
        // Validate session token against Firestore (prevents two sessions with same phone)
        try {
          if (parsedUser.phone && parsedUser.sessionToken) {
            const remoteToken = await FS.getSession(parsedUser.phone);
            if (remoteToken && remoteToken !== parsedUser.sessionToken) {
              // Another device logged in with the same phone — force logout
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
      if (settingsData) {
        const parsed = JSON.parse(settingsData);
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      }
      if (themeData) setThemeState(themeData as AppTheme);
    } catch (e) {
    } finally {
      setIsLoading(false);
    }

    // Fetch products & settings from Firestore (not covered by listeners)
    try {
      const [fsProducts, fsSettings] = await Promise.all([
        FS.getAllProducts(),
        FS.getSettings(),
      ]);
      if (fsProducts.length > 0) {
        setProductsState(fsProducts);
        await AsyncStorage.setItem("products", JSON.stringify(fsProducts));
      }
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
    const updated = [...registeredCustomers.filter((c) => c.phone !== newUser.phone), newUser];
    setRegisteredCustomersState(updated);
    await AsyncStorage.setItem("registered_customers", JSON.stringify(updated));
    FS.saveCustomer(newUser).catch(() => {});
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
        (c) => c.productId === item.productId && c.colorName === item.colorName
      );
      if (existing) {
        return prev.map((c) =>
          c.productId === item.productId && c.colorName === item.colorName
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

  const addOrder = useCallback(
    async (order: Order) => {
      const updated = [...orders, order];
      setOrdersState(updated);
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      FS.saveOrder(order).catch(() => {});
      // Notify staff about new order (in-app via Firestore)
      const staffNotif: Notification = {
        id: `notif_order_new_${order.id}`,
        title: "طلب جديد",
        body: `وصل طلب جديد من ${order.userName} (${order.userPhone})`,
        createdAt: new Date().toISOString(),
        read: false,
        targetRole: "employee",
      };
      const staffNotifSupervisor: Notification = { ...staffNotif, id: `${staffNotif.id}_sv`, targetRole: "supervisor" };
      FS.saveNotification(staffNotif).catch(() => {});
      FS.saveNotification(staffNotifSupervisor).catch(() => {});
      // Push notification to all employees & supervisors (even outside app)
      notifyStaffNewOrder(order.id, order.userName).catch(() => {});
    },
    [orders]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus, assignedToId?: string, assignedToName?: string) => {
      const updated = orders.map((o) => {
        if (o.id !== orderId) return o;
        const patch: Partial<Order> = { status };
        // When an employee/supervisor receives an order, assign it to them
        if (status === "received" && assignedToId) {
          patch.assignedTo = assignedToId;
          patch.assignedToName = assignedToName;
        }
        // When reverting back to pending, release assignment
        if (status === "pending") {
          patch.assignedTo = undefined;
          patch.assignedToName = undefined;
        }
        return { ...o, ...patch };
      });
      setOrdersState(updated);
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      const updatedOrder = updated.find((o) => o.id === orderId);
      if (updatedOrder) {
        FS.saveOrder(updatedOrder).catch(() => {});
        // Notify customer about status change
        const statusLabels: Record<string, string> = {
          received: "تم استلام طلبك",
          preparing: "طلبك قيد التجهيز",
          ready: "طلبك جاهز للاستلام",
        };
        if (statusLabels[status]) {
          const custNotif: Notification = {
            id: `notif_status_${orderId}_${status}_${Date.now()}`,
            title: statusLabels[status],
            body: `تم تحديث حالة طلبك #${orderId.slice(0, 8)} إلى: ${statusLabels[status]}`,
            createdAt: new Date().toISOString(),
            read: false,
            targetUserId: updatedOrder.userId,
          };
          // Save to Firestore — listener will push it to customer's device instantly
          FS.saveNotification(custNotif).catch(() => {});
          // Also send real push notification to customer's device
          if (updatedOrder.userPhone) {
            notifyUserByPhone(
              updatedOrder.userPhone,
              statusLabels[status],
              `تم تحديث حالة طلبك #${orderId.slice(0, 8)}`,
              { type: "order_status", orderId, status }
            ).catch(() => {});
          }
        }
      }
    },
    [orders]
  );

  // Admin: fully remove order
  const deleteOrder = useCallback(
    async (orderId: string) => {
      const updated = orders.filter((o) => o.id !== orderId);
      setOrdersState(updated);
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      FS.deleteOrder(orderId).catch(() => {});
    },
    [orders]
  );

  // Customer: mark order as cancelled (keeps record, shows as cancelled)
  const cancelOrder = useCallback(
    async (orderId: string) => {
      const updated = orders.map((o) => (o.id === orderId ? { ...o, status: "cancelled" as OrderStatus } : o));
      setOrdersState(updated);
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
      const cancelled = updated.find((o) => o.id === orderId);
      if (cancelled) FS.saveOrder(cancelled).catch(() => {});
    },
    [orders]
  );

  const setTabs = useCallback(async (t: Tab[]) => {
    setTabsState(t);
    await AsyncStorage.setItem("tabs", JSON.stringify(t));
  }, []);

  const addNotification = useCallback(
    async (notification: Notification) => {
      // Optimistic local update
      const updated = [notification, ...notifications];
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
      // Persist to Firestore so all clients receive it via real-time listener
      FS.saveNotification(notification).catch(() => {});
    },
    [notifications]
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
      // Sync read status to Firestore
      const notif = updated.find((n) => n.id === id);
      if (notif) FS.saveNotification(notif).catch(() => {});
    },
    [notifications]
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
        tabs,
        setTabs,
        notifications,
        addNotification,
        markNotificationRead,
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
