import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Icon from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, Order, CartItem } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cart, removeFromCart, updateCartItem, clearCart, user, addOrder, orders, updateOrderItems, setCart } = useApp();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const params = useLocalSearchParams<{ editOrderId?: string }>();
  const editOrderId = params.editOrderId;
  const editOrder = editOrderId ? orders.find((o) => o.id === editOrderId) : null;
  const loaded = useRef(false);

  useEffect(() => {
    if (editOrder && !loaded.current) {
      loaded.current = true;
      clearCart();
      editOrder.items.forEach((item) => {
        (cart as CartItem[]).push(item);
      });
      setCart([...editOrder.items]);
    }
  }, [editOrder]);

  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 24 : 0);

  const totalPieces = cart.reduce((a, b) => a + b.quantity, 0);
  const totalPrice = cart
    .filter((i) => i.orderType === "weight")
    .reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);

  const hasPiecesOrder = cart.some((i) => i.orderType === "pieces");

  const isStaff = user?.role === "admin" || user?.role === "employee" || user?.role === "supervisor";

  const handleCheckout = async () => {
    if (isStaff) {
      Alert.alert("غير مسموح", "أعضاء فريق العمل لا يمكنهم تقديم طلبات شراء.");
      return;
    }
    if (cart.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    try {
      if (editOrderId) {
        await updateOrderItems(editOrderId, [...cart], hasPiecesOrder ? 0 : totalPrice);
        clearCart();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("تم تعديل الطلب!", "تم تحديث طلبك بنجاح.", [
          { text: "عرض الطلب", onPress: () => router.replace(`/order/${editOrderId}`) },
        ]);
      } else {
        const order: Order = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          userId: user?.id ?? "guest",
          userName: user?.name ?? "عميل",
          userPhone: user?.phone ?? "",
          items: [...cart],
          total: hasPiecesOrder ? 0 : totalPrice,
          status: "pending",
          createdAt: new Date().toISOString(),
          notes,
        };
        await addOrder(order);
        clearCart();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("تم إرسال الطلب!", "سيتواصل معك فريق المبيعات قريباً.", [
          { text: "عرض الطلب", onPress: () => router.replace(`/order/${order.id}`) },
        ]);
      }
    } catch {
      Alert.alert("خطأ", "تعذّر إرسال الطلب. يُرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader
        title={editOrderId ? "تعديل الطلب" : "سلة الطلبات"}
        subtitle={editOrderId ? `تعديل طلب #${editOrderId.slice(0, 8)}` : `${totalPieces} قطعة`}
        onBack={() => router.back()}
      />

      {cart.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="shopping-cart" size={56} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            السلة فارغة
          </Text>
          <GoldButton
            label="تصفح المنتجات"
            onPress={() => router.push("/(tabs)/products")}
            variant="outline"
          />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 180 }]}
          >
            {cart.map((item, index) => (
              <View
                key={`${item.productId}-${item.colorName}-${index}`}
                style={[
                  styles.cartItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <View style={styles.itemHeader}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      removeFromCart(item.productId, item.colorName);
                    }}
                    style={({ pressed }) => [
                      styles.deleteBtn,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Icon name="trash-2" size={16} color={colors.destructive} />
                  </Pressable>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {item.productName}
                    </Text>
                    <View style={styles.colorInfo}>
                      <Text style={[styles.colorLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                        {item.colorName}
                      </Text>
                      <View
                        style={[
                          styles.colorDot,
                          {
                            backgroundColor: item.colorHex,
                            borderColor: colors.border,
                            borderWidth: item.colorHex === "#FFFFFF" ? 1 : 0,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.itemFooter}>
                  {item.orderType === "weight" ? (
                    <Text style={[styles.itemPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                      {item.unitPrice * (item.weight ?? 1)} ج.م ({item.weight} كغ)
                    </Text>
                  ) : (
                    <Text style={[styles.contactSales, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      الرجاء التواصل مع مسؤول المبيعات
                    </Text>
                  )}

                  {item.orderType === "pieces" && (
                    <View style={styles.qtyControls}>
                      <Pressable
                        onPress={() => updateCartItem(item.productId, item.colorName, item.quantity - 1)}
                        style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Icon name="minus" size={14} color={colors.gold} />
                      </Pressable>
                      <Text style={[styles.qty, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateCartItem(item.productId, item.colorName, item.quantity + 1)}
                        style={[styles.qtyBtn, { backgroundColor: colors.gold }]}
                      >
                        <Icon name="plus" size={14} color={colors.background} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            ))}

            <View style={[styles.notesSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
              <Text style={[styles.notesLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                ملاحظات
              </Text>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                placeholder="أي تفاصيل أو متطلبات خاصة..."
                placeholderTextColor={colors.mutedForeground}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                textAlign="right"
              />
            </View>

            {hasPiecesOrder && (
              <View style={[styles.salesNote, { backgroundColor: colors.gold + "11", borderColor: colors.gold + "33", borderRadius: colors.radius }]}>
                <Icon name="info" size={16} color={colors.gold} />
                <Text style={[styles.salesNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  الطلبات بالثوب يتم تسعيرها من قبل مسؤول المبيعات بعد تأكيد الطلب
                </Text>
              </View>
            )}
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
                paddingBottom: bottomPad,
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
              },
            ]}
          >
            {totalPrice > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  المجموع الكلي
                </Text>
                <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                  {totalPrice} ج.م
                </Text>
              </View>
            )}
            <GoldButton
              label={editOrderId ? "تأكيد التعديل" : "إرسال الطلب"}
              onPress={handleCheckout}
              loading={loading}
              style={{ width: "100%" }}
              size="lg"
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  emptyText: { fontSize: 18 },
  list: { padding: 16, gap: 12 },
  cartItem: { borderWidth: 1, padding: 14, gap: 12 },
  itemHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  itemInfo: { flex: 1, gap: 4, alignItems: "flex-end" },
  itemName: { fontSize: 15, textAlign: "right" },
  colorInfo: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  colorLabel: { fontSize: 13 },
  colorDot: { width: 16, height: 16, borderRadius: 8 },
  deleteBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  itemFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemPrice: { fontSize: 15 },
  contactSales: { fontSize: 12, flex: 1, textAlign: "right" },
  qtyControls: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qty: { fontSize: 16, minWidth: 24, textAlign: "center" },
  notesSection: { borderWidth: 1, padding: 14, gap: 10 },
  notesLabel: { fontSize: 15, textAlign: "right" },
  notesInput: {
    borderWidth: 1,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
  },
  salesNote: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderWidth: 1,
  },
  salesNoteText: { flex: 1, fontSize: 13, textAlign: "right", lineHeight: 20 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 14 },
  totalPrice: { fontSize: 20 },
});
