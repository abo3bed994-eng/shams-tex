import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type UserRole = "customer" | "merchant" | "employee" | "admin";
export type EmployeePermission =
  | "view_orders"
  | "edit_orders"
  | "view_products"
  | "edit_products"
  | "view_users"
  | "send_notifications";

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  vip?: boolean;
  permissions?: EmployeePermission[];
  upgradeStatus?: "pending" | "approved" | "rejected";
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
  colors: ColorOption[];
  description?: string;
  inStock: boolean;
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

export type OrderStatus = "received" | "preparing" | "ready";

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
  featuredProductIds: string[];
  bannerImageUri?: string;
  globalColors: ColorOption[];
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
  ],
  aboutTitle: "شمس تكس",
  aboutText:
    "شركة متخصصة في توريد أفخر أنواع الأقمشة، نخدم عملاءنا منذ أكثر من 15 عاماً بجودة لا مثيل لها وخدمة على أعلى مستوى.",
  categories: ["الكل", "حرير", "قطن", "ساتان", "كتان", "فيلفيت", "شيفون"],
  featuredProductIds: ["1", "2", "3"],
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
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
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
  const [products, setProductsState] = useState<Product[]>(SAMPLE_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrdersState] = useState<Order[]>([]);
  const [tabs, setTabsState] = useState<Tab[]>(DEFAULT_TABS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPersistedData();
  }, []);

  const loadPersistedData = async () => {
    try {
      const [userData, productsData, ordersData, tabsData, notificationsData, settingsData, themeData] =
        await Promise.all([
          AsyncStorage.getItem("user"),
          AsyncStorage.getItem("products"),
          AsyncStorage.getItem("orders"),
          AsyncStorage.getItem("tabs"),
          AsyncStorage.getItem("notifications"),
          AsyncStorage.getItem("settings"),
          AsyncStorage.getItem("theme"),
        ]);

      if (userData) setUserState(JSON.parse(userData));
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
  };

  const setUser = useCallback(async (u: User | null) => {
    setUserState(u);
    if (u) await AsyncStorage.setItem("user", JSON.stringify(u));
    else await AsyncStorage.removeItem("user");
  }, []);

  const setProducts = useCallback(async (prods: Product[]) => {
    setProductsState(prods);
    await AsyncStorage.setItem("products", JSON.stringify(prods));
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
    },
    [orders]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
      setOrdersState(updated);
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
    },
    [orders]
  );

  const deleteOrder = useCallback(
    async (orderId: string) => {
      const updated = orders.filter((o) => o.id !== orderId);
      setOrdersState(updated);
      await AsyncStorage.setItem("orders", JSON.stringify(updated));
    },
    [orders]
  );

  const setTabs = useCallback(async (t: Tab[]) => {
    setTabsState(t);
    await AsyncStorage.setItem("tabs", JSON.stringify(t));
  }, []);

  const addNotification = useCallback(
    async (notification: Notification) => {
      const updated = [notification, ...notifications];
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
    },
    [notifications]
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      setNotifications(updated);
      await AsyncStorage.setItem("notifications", JSON.stringify(updated));
    },
    [notifications]
  );

  const setSettings = useCallback(async (s: AppSettings) => {
    setSettingsState(s);
    await AsyncStorage.setItem("settings", JSON.stringify(s));
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
