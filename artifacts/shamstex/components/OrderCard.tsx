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
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string }> = {
  pending: { label: "بانتظار الاستلام", color: "#9B59B6", icon: "clock" },
  received: { label: "تم استلام الطلب", color: "#3498DB", icon: "inbox" },
  preparing: { label: "جاري التجهيز", color: "#F39C12", icon: "package" },
  ready: { label: "جاهز للاستلام", color: "#27AE60", icon: "check-circle" },
};

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pending: { next: "received", label: "استلام" },
  received: { next: "preparing", label: "تجهيز" },
  preparing: { next: "ready", label: "جاهز" },
};

export default function OrderCard({ order, onPress, isAdmin, onStatusChange }: OrderCardProps) {
  const colors = useColors();
  const statusInfo = STATUS_CONFIG[order.status];
  const nextAction = NEXT_STATUS[order.status];

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const date = new Date(order.createdAt).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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

        {isAdmin && nextAction && onStatusChange && (
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
  details: { flexDirection: "row-reverse", gap: 16 },
  detailItem: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  detailText: { fontSize: 13 },
  footer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  total: { fontSize: 16 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  actionText: { fontSize: 13 },
});
