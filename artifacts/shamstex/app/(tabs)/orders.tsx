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

type FilterType = "all" | "pending" | "received" | "preparing" | "ready";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, orders, updateOrderStatus, deleteOrder, cancelOrder } = useApp();
  const [filter, setFilter] = useState<FilterType>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isStaff = user?.role === "admin" || user?.role === "employee" || user?.role === "supervisor";
  const canEditStatus = user?.role === "admin" || user?.role === "supervisor" || user?.role === "employee";

  const myOrders = isStaff ? orders : orders.filter((o) => o.userId === user?.id);
  const filtered = filter === "all" ? myOrders : myOrders.filter((o) => o.status === filter);

  // Returns true if customer can still cancel (within 5 minutes of creation)
  const canCancelOrder = (order: Order) => {
    const created = new Date(order.createdAt).getTime();
    return Date.now() - created < 5 * 60 * 1000;
  };

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "pending", label: "جديد" },
    { key: "received", label: "مستلم" },
    { key: "preparing", label: "تجهيز" },
    { key: "ready", label: "جاهز" },
  ];

  const handleCancelOrder = (order: Order) => {
    Alert.alert(
      "إلغاء الطلب",
      "هل أنت متأكد من إلغاء هذا الطلب؟ سيظهر الطلب كملغي.",
      [
        { text: "لا، ابقِه", style: "cancel" },
        {
          text: "نعم، إلغاء الطلب",
          style: "destructive",
          onPress: () => cancelOrder(order.id),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          {isStaff ? "إدارة الطلبات" : "طلباتي"}
        </Text>
        {!isStaff && (
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
              {isStaff ? "لا توجد طلبات" : "لا توجد طلبات بعد"}
            </Text>
            {!isStaff && (
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
          filtered.map((order) => {
            // Admin can control all orders
            // Employee/supervisor can control only if: no assignedTo yet, OR they are the one assigned
            const userCanControlThisOrder =
              user?.role === "admin"
              || (canEditStatus && (!order.assignedTo || order.assignedTo === user?.id));

            return (
            <View key={order.id}>
              <OrderCard
                order={order}
                isAdmin={canEditStatus}
                canControl={userCanControlThisOrder}
                onPress={() => router.push(`/order/${order.id}`)}
                onStatusChange={
                  canEditStatus && order.status !== "cancelled" && userCanControlThisOrder
                    ? (status: OrderStatus) => {
                        // When employee/supervisor receives order, assign it to them
                        if (status === "received" && user?.role !== "admin") {
                          updateOrderStatus(order.id, status, user?.id, user?.name);
                        } else {
                          updateOrderStatus(order.id, status);
                        }
                      }
                    : undefined
                }
                onPrevStatus={
                  user?.role === "admin" && order.status !== "cancelled" && userCanControlThisOrder
                    ? (status: OrderStatus) => updateOrderStatus(order.id, status)
                    : undefined
                }
              />
              {/* Customer cancel button — only within 5 minutes and for pending orders */}
              {!isStaff && order.status === "pending" && canCancelOrder(order) && (
                <Pressable
                  onPress={() => handleCancelOrder(order)}
                  style={[
                    styles.deleteOrderBtn,
                    { borderColor: "#E74C3C44", backgroundColor: "#E74C3C11" },
                  ]}
                >
                  <Icon name="x-circle" size={14} color="#E74C3C" />
                  <Text style={[{ color: "#E74C3C", fontFamily: "Inter_500Medium", fontSize: 13 }]}>
                    إلغاء الطلب (متاح 5 دقائق)
                  </Text>
                </Pressable>
              )}
              {/* Admin delete button */}
              {isStaff && user?.role === "admin" && (
                <Pressable
                  onPress={() => Alert.alert("حذف نهائي", "هل تريد حذف هذا الطلب نهائياً؟", [
                    { text: "إلغاء", style: "cancel" },
                    { text: "حذف", style: "destructive", onPress: () => deleteOrder(order.id) },
                  ])}
                  style={[styles.deleteOrderBtn, { borderColor: "#C0392B44", backgroundColor: "#C0392B11" }]}
                >
                  <Icon name="trash-2" size={14} color="#C0392B" />
                  <Text style={[{ color: "#C0392B", fontFamily: "Inter_500Medium", fontSize: 13 }]}>
                    حذف الطلب نهائياً
                  </Text>
                </Pressable>
              )}
            </View>
          );
          })
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
