import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, Order, OrderStatus } from "@/context/AppContext";
import OrderCard from "@/components/OrderCard";

type FilterType = "all" | "received" | "preparing" | "ready";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, orders, updateOrderStatus, deleteOrder } = useApp();
  const [filter, setFilter] = useState<FilterType>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isAdmin = user?.role === "admin" || user?.role === "employee";

  const myOrders = isAdmin ? orders : orders.filter((o) => o.userId === user?.id);
  const filtered = filter === "all" ? myOrders : myOrders.filter((o) => o.status === filter);

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "received", label: "مستلم" },
    { key: "preparing", label: "تجهيز" },
    { key: "ready", label: "جاهز" },
  ];

  const handleDeleteOrder = (order: Order) => {
    Alert.alert(
      "حذف الطلب",
      "هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: () => deleteOrder(order.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {isAdmin ? "إدارة الطلبات" : "طلباتي"}
        </Text>
        {!isAdmin && (
          <Pressable
            onPress={() => router.push("/cart")}
            style={({ pressed }) => [styles.cartBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="shopping-cart" size={22} color={colors.foreground} />
          </Pressable>
        )}
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {FILTERS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[
              styles.filterBtn,
              { borderBottomWidth: filter === key ? 2 : 0, borderBottomColor: colors.gold },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filter === key ? colors.gold : colors.mutedForeground,
                  fontFamily: filter === key ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="package" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              {isAdmin ? "لا توجد طلبات" : "لا توجد طلبات بعد"}
            </Text>
            {!isAdmin && (
              <Pressable
                onPress={() => router.push("/(tabs)/products")}
                style={({ pressed }) => [
                  styles.shopBtn,
                  { backgroundColor: colors.gold, borderRadius: colors.radius, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.shopBtnText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
                  تصفح المنتجات
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          filtered.map((order) => (
            <View key={order.id}>
              <OrderCard
                order={order}
                isAdmin={isAdmin}
                onPress={() => router.push(`/order/${order.id}`)}
                onStatusChange={
                  isAdmin
                    ? (status: OrderStatus) => updateOrderStatus(order.id, status)
                    : undefined
                }
              />
              {!isAdmin && order.status === "received" && (
                <Pressable
                  onPress={() => handleDeleteOrder(order)}
                  style={[
                    styles.deleteOrderBtn,
                    { borderColor: colors.destructive + "44", backgroundColor: colors.destructive + "11" },
                  ]}
                >
                  <Icon name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[{ color: colors.destructive, fontFamily: "Inter_500Medium", fontSize: 13 }]}>
                    إلغاء الطلب
                  </Text>
                </Pressable>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22 },
  cartBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row-reverse", borderBottomWidth: 1 },
  filterBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  filterText: { fontSize: 13 },
  list: { padding: 16, gap: 4 },
  empty: { alignItems: "center", paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16 },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  shopBtnText: { fontSize: 15 },
  deleteOrderBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
});
