import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { Order, OrderStatus } from "@/context/AppContext";

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
  isAdmin?: boolean;
  onStatusChange?: (status: OrderStatus) => void;
  onPrevStatus?: (status: OrderStatus) => void;
  canControl?: boolean; // whether this user can change this specific order
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending: { label: "بانتظار الاستلام", color: "#9B59B6", icon: "clock" },
  received: { label: "تم استلام الطلب", color: "#3498DB", icon: "inbox" },
  preparing: { label: "جاري التجهيز", color: "#F39C12", icon: "package" },
  ready: { label: "جاهز للاستلام", color: "#27AE60", icon: "check-circle" },
  delivered: { label: "تم التسليم", color: "#2ECC71", icon: "check-circle" },
  cancelled: { label: "ملغي من الزبون", color: "#E74C3C", icon: "x-circle" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pending: { next: "received", label: "استلام" },
  received: { next: "preparing", label: "تجهيز" },
  preparing: { next: "ready", label: "جاهز" },
  ready: { next: "delivered", label: "تسليم" },
};

const PREV_STATUS: Partial<Record<OrderStatus, { prev: OrderStatus; label: string }>> = {
  received: { prev: "pending", label: "إلغاء الاستلام" },
  preparing: { prev: "received", label: "رجوع لاستلام" },
  ready: { prev: "preparing", label: "رجوع لتجهيز" },
  delivered: { prev: "ready", label: "رجوع لجاهز" },
};

export default function OrderCard({ order, onPress, isAdmin, onStatusChange, onPrevStatus, canControl }: OrderCardProps) {
  const colors = useColors();
  const statusInfo = STATUS_CONFIG[order.status];
  const nextAction = NEXT_STATUS[order.status];
  const prevAction = PREV_STATUS[order.status];

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const date = new Date(order.createdAt).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Show "locked by" info when order is assigned to someone else
  const showAssigned = isAdmin && order.assignedTo && order.assignedToName;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: order.status === "pending" ? "#9B59B644" : colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "22" }]}>
          <Icon name={statusInfo.icon as any} size={12} color={statusInfo.color} />
          <Text style={[styles.statusText, { color: statusInfo.color, fontFamily: "Inter_600SemiBold" }]}>
            {statusInfo.label}
          </Text>
        </View>
        <Text style={[styles.orderId, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          #{order.id.slice(0, 8)}
        </Text>
      </View>

      {isAdmin && (
        <Text style={[styles.customerName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {order.userName} - {order.userPhone}
        </Text>
      )}

      {/* Assigned employee info */}
      {showAssigned && (
        <View style={[styles.assignedRow, { backgroundColor: "#3498DB11", borderColor: "#3498DB33" }]}>
          <Icon name="user" size={12} color="#3498DB" />
          <Text style={{ color: "#3498DB", fontFamily: "Inter_500Medium", fontSize: 12 }}>
            مُستلَم بواسطة: {order.assignedToName}
          </Text>
        </View>
      )}

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Icon name="shopping-bag" size={14} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {totalItems} قطعة
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={[styles.detailText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {date}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.total, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
          {order.total > 0 ? `${order.total} ج.م` : "يرجى التواصل مع المبيعات"}
        </Text>

        <View style={styles.actionGroup}>
          {/* Back button — shown to admin or assigned employee */}
          {isAdmin && prevAction && onPrevStatus && canControl && (
            <Pressable
              onPress={() => onPrevStatus(prevAction.prev)}
              style={({ pressed }) => [
                styles.prevBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 4,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Icon name="chevron-right" size={12} color={colors.mutedForeground} />
              <Text style={[styles.prevText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {prevAction.label}
              </Text>
            </Pressable>
          )}

          {/* Next status button */}
          {isAdmin && nextAction && onStatusChange && canControl && (
            <Pressable
              onPress={() => onStatusChange(nextAction.next)}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: colors.gold,
                  borderRadius: colors.radius - 4,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: colors.background, fontFamily: "Inter_600SemiBold" }]}>
                {nextAction.label}
              </Text>
            </Pressable>
          )}

          {/* Locked — assigned to someone else */}
          {isAdmin && order.assignedTo && !canControl && order.status !== "cancelled" && nextAction && (
            <View style={[styles.lockedBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="lock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.prevText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                مُقفَل
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: { fontSize: 12 },
  orderId: { fontSize: 12 },
  customerName: { fontSize: 14, textAlign: "right" },
  assignedRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  details: { flexDirection: "row-reverse", gap: 16 },
  detailItem: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  detailText: { fontSize: 13 },
  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 8,
  },
  total: { fontSize: 16, flex: 1 },
  actionGroup: { flexDirection: "row-reverse", gap: 6, alignItems: "center" },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  actionText: { fontSize: 13 },
  prevBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  prevText: { fontSize: 12 },
  lockedBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
});
