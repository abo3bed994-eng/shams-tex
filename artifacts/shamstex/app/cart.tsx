import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
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
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, Order, CartItem, PaymentMethod, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

const PAYMENT_METHODS: { key: PaymentMethod; short: string; desc: string }[] = [
  { key: "cash", short: "كاش", desc: "الدفع عند استلام البضاعة" },
  { key: "bank_transfer", short: "تحويل بنكي", desc: "تحويل على الحساب البنكي" },
  { key: "ewallet", short: "محفظة", desc: "فودافون كاش / أورنج / اتصالات" },
  { key: "instapay", short: "انستاباي", desc: "تحويل فوري بدون رسوم" },
];

export default function CartScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cart, removeFromCart, updateCartItem, clearCart, user, addOrder, orders, updateOrderItems, setCart, settings, editingOrderId, setEditingOrderId, updateCartWeight, products } = useApp();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const params = useLocalSearchParams<{ editOrderId?: string }>();
  const paramEditId = params.editOrderId;
  const editOrderId = paramEditId || editingOrderId;
  const editOrder = editOrderId ? orders.find((o) => o.id === editOrderId) : null;

  const editLoadedRef = useRef(false);
  useEffect(() => {
    if (paramEditId && !editLoadedRef.current) {
      editLoadedRef.current = true;
      setEditingOrderId(paramEditId);
      const order = orders.find((o) => o.id === paramEditId);
      if (order) {
        setCart([...order.items]);
        if (order.notes) setNotes(order.notes);
      }
    }
  }, [paramEditId]);

  const handleBack = () => {
    if (editingOrderId) {
      setEditingOrderId(null);
      clearCart();
      editLoadedRef.current = false;
    }
    router.back();
  };

  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 24 : 0);

  const totalPieces = cart.reduce((a, b) => a + b.quantity, 0);
  const weightTotal = cart
    .filter((i) => i.orderType === "weight")
    .reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
  const piecesEstTotal = cart
    .filter((i) => i.orderType === "pieces")
    .reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
  const totalPrice = weightTotal + piecesEstTotal;

  const hasPiecesOrder = cart.some((i) => i.orderType === "pieces");

  const paymentSettings = settings.payment;
  const ewalletFee = paymentSettings?.ewalletFeePercent ?? 1;
  const feeAmount = selectedPayment === "ewallet" ? Math.ceil(totalPrice * ewalletFee / 100) : 0;
  const totalWithFee = totalPrice + feeAmount;

  const isStaff = user?.role === "admin" || user?.role === "employee" || user?.role === "supervisor";

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCheckout = async () => {
    if (isStaff) {
      Alert.alert("غير مسموح", "أعضاء فريق العمل لا يمكنهم تقديم طلبات شراء.");
      return;
    }
    if (cart.length === 0) return;

    if (!editOrderId && !selectedPayment) {
      Alert.alert("طريقة الدفع", "يرجى اختيار طريقة الدفع قبل إتمام الطلب.");
      return;
    }

    const weightItems = cart.filter((i) => i.orderType === "weight");
    for (const item of weightItems) {
      const prod = products.find((p) => p.id === item.productId);
      const minW = prod?.unit === "meter" ? 50 : 20;
      const unitName = prod?.unit === "meter" ? "متر" : "كغ";
      if ((item.weight ?? 0) < minW) {
        Alert.alert("الحد الأدنى", `الحد الأدنى للطلب هو ${minW} ${unitName}\n(${item.productName} — ${item.colorName}: ${item.weight ?? 0} ${unitName})`);
        return;
      }
    }

    await placeOrder();
  };

  const placeOrder = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setShowPaymentModal(false);
    await new Promise((r) => setTimeout(r, 800));

    try {
      if (editOrderId) {
        await updateOrderItems(editOrderId, [...cart], totalPrice);
        clearCart();
        setEditingOrderId(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("تم تعديل الطلب!", "تم تحديث طلبك بنجاح وسيتم إشعار مسؤول الطلب.", [
          { text: "استمرار التسوق", style: "cancel", onPress: () => router.replace("/(tabs)/products") },
          { text: "عرض الطلب", onPress: () => router.replace(`/order/${editOrderId}`) },
        ]);
      } else {
        const order: Order = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          userId: user?.id ?? "guest",
          userName: user?.name ?? "عميل",
          userPhone: user?.phone ?? "",
          items: [...cart],
          total: totalPrice,
          status: "pending",
          createdAt: new Date().toISOString(),
          notes,
          paymentMethod: selectedPayment ?? "cash",
          paymentFee: feeAmount,
          totalWithFee: totalWithFee,
        };
        await addOrder(order);
        clearCart();
        setSelectedPayment(null);
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

  const renderCopyRow = (label: string, value: string, fieldKey: string) => (
    <Pressable
      key={fieldKey}
      onPress={() => copyToClipboard(value, fieldKey)}
      style={[styles.copyRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
    >
      <View style={styles.copyRowContent}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right" }}>
          {label}
        </Text>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 15, textAlign: "right", letterSpacing: 0.5 }}>
          {value}
        </Text>
      </View>
      <View style={[styles.copyBtn, { backgroundColor: copiedField === fieldKey ? "#27AE60" + "22" : colors.gold + "11" }]}>
        <Icon
          name={copiedField === fieldKey ? "check" : "copy"}
          size={16}
          color={copiedField === fieldKey ? "#27AE60" : colors.gold}
        />
      </View>
    </Pressable>
  );

  const renderPaymentModal = () => {
    if (!selectedPayment || selectedPayment === "cash") return null;

    const pm = paymentSettings;

    return (
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: colors.radius + 4 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => setShowPaymentModal(false)} style={styles.modalCloseBtn}>
                <Icon name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 18, flex: 1, textAlign: "right" }}>
                {selectedPayment === "bank_transfer" && "بيانات التحويل البنكي"}
                {selectedPayment === "ewallet" && "بيانات المحفظة الإلكترونية"}
                {selectedPayment === "instapay" && "بيانات الانستاباي"}
              </Text>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedPayment === "bank_transfer" && pm && (
                <View style={styles.paymentInfoSection}>
                  <View style={[styles.paymentInfoBanner, { backgroundColor: colors.gold + "11", borderColor: colors.gold + "33", borderRadius: colors.radius - 4 }]}>
                    <Icon name="credit-card" size={20} color={colors.gold} />
                    <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, textAlign: "right" }}>
                      قم بالتحويل ثم اضغط "تأكيد الطلب"
                    </Text>
                  </View>
                  {renderCopyRow("اسم البنك", pm.bankName, "bank")}
                  {renderCopyRow("اسم الحساب", pm.bankAccountName, "accName")}
                  {renderCopyRow("رقم الحساب", pm.bankAccountNumber, "accNum")}
                  {renderCopyRow("IBAN", pm.bankIBAN, "iban")}

                  <View style={[styles.amountBox, { backgroundColor: colors.gold + "11", borderColor: colors.gold + "44", borderRadius: colors.radius - 4 }]}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>المبلغ المطلوب</Text>
                    <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 24 }}>{totalPrice.toLocaleString("ar-EG")} ج.م</Text>
                  </View>
                </View>
              )}

              {selectedPayment === "ewallet" && pm && (
                <View style={styles.paymentInfoSection}>
                  <View style={[styles.paymentInfoBanner, { backgroundColor: "#9B59B6" + "15", borderColor: "#9B59B6" + "33", borderRadius: colors.radius - 4 }]}>
                    <Icon name="smartphone" size={20} color="#9B59B6" />
                    <Text style={{ color: "#9B59B6", fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, textAlign: "right" }}>
                      حوّل على الرقم التالي ثم اضغط "تأكيد الطلب"
                    </Text>
                  </View>
                  {renderCopyRow("رقم المحفظة", pm.ewalletNumber, "wallet")}
                  {renderCopyRow("الاسم", pm.ewalletName, "walletName")}

                  <View style={[styles.amountBox, { backgroundColor: "#9B59B6" + "11", borderColor: "#9B59B6" + "33", borderRadius: colors.radius - 4 }]}>
                    <View style={styles.feeBreakdown}>
                      <View style={styles.feeRow}>
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{totalPrice.toLocaleString("ar-EG")} ج.م</Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>سعر الطلب</Text>
                      </View>
                      <View style={styles.feeRow}>
                        <Text style={{ color: "#E74C3C", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>+{feeAmount.toLocaleString("ar-EG")} ج.م</Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>رسوم المحفظة ({ewalletFee}%)</Text>
                      </View>
                      <View style={[styles.feeDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.feeRow}>
                        <Text style={{ color: "#9B59B6", fontFamily: "Inter_700Bold", fontSize: 22 }}>{totalWithFee.toLocaleString("ar-EG")} ج.م</Text>
                        <Text style={{ color: "#9B59B6", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>الإجمالي</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {selectedPayment === "instapay" && pm && (
                <View style={styles.paymentInfoSection}>
                  <View style={[styles.paymentInfoBanner, { backgroundColor: "#2ECC71" + "15", borderColor: "#2ECC71" + "33", borderRadius: colors.radius - 4 }]}>
                    <Icon name="zap" size={20} color="#2ECC71" />
                    <Text style={{ color: "#2ECC71", fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, textAlign: "right" }}>
                      حوّل عبر انستاباي ثم اضغط "تأكيد الطلب"
                    </Text>
                  </View>
                  {renderCopyRow("رقم الانستاباي", pm.instapayNumber, "instapay")}
                  {renderCopyRow("الاسم", pm.instapayName, "instapayName")}

                  <View style={[styles.amountBox, { backgroundColor: "#2ECC71" + "11", borderColor: "#2ECC71" + "33", borderRadius: colors.radius - 4 }]}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }}>المبلغ المطلوب</Text>
                    <Text style={{ color: "#2ECC71", fontFamily: "Inter_700Bold", fontSize: 24 }}>{totalPrice.toLocaleString("ar-EG")} ج.م</Text>
                    <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 4 }}>
                      <Icon name="check-circle" size={14} color="#2ECC71" />
                      <Text style={{ color: "#2ECC71", fontFamily: "Inter_500Medium", fontSize: 12 }}>بدون رسوم إضافية</Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <GoldButton
                label="تأكيد الطلب"
                onPress={placeOrder}
                loading={loading}
                style={{ width: "100%" }}
                size="lg"
              />
              <Pressable onPress={() => setShowPaymentModal(false)} style={styles.modalCancelBtn}>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }}>رجوع</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const PAYMENT_COLORS: Record<PaymentMethod, string> = {
    cash: "#27AE60",
    bank_transfer: colors.gold,
    ewallet: "#9B59B6",
    instapay: "#2ECC71",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader
        title={editOrderId ? "تعديل الطلب" : "سلة الطلبات"}
        subtitle={editOrderId ? `تعديل طلب #${editOrderId.slice(0, 8)}` : `${totalPieces} قطعة`}
        onBack={handleBack}
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
            contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 220 }]}
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
                      {item.unitPrice * (item.weight ?? 1)} ج.م
                    </Text>
                  ) : (
                    <View style={{ gap: 2, alignItems: "flex-end" }}>
                      <Text style={[styles.itemPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                        ≈ {item.quantity * 20 * item.unitPrice} ج.م
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                        تقديري ({item.quantity} × 20كغ × {item.unitPrice})
                      </Text>
                    </View>
                  )}

                  {item.orderType === "weight" && (() => {
                    const prod = products.find((p) => p.id === item.productId);
                    const unitLabel = prod?.unit === "meter" ? "متر" : "كغ";
                    return (
                    <View style={styles.qtyControls}>
                      <Pressable
                        onPress={() => updateCartWeight(item.productId, item.colorName, (item.weight ?? 1) - 1)}
                        style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Icon name="minus" size={14} color={colors.gold} />
                      </Pressable>
                      <Text style={[styles.qty, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                        {item.weight ?? 1} {unitLabel}
                      </Text>
                      <Pressable
                        onPress={() => updateCartWeight(item.productId, item.colorName, (item.weight ?? 1) + 1)}
                        style={[styles.qtyBtn, { backgroundColor: colors.gold }]}
                      >
                        <Icon name="plus" size={14} color={colors.background} />
                      </Pressable>
                    </View>
                    );
                  })()}

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

                {item.orderType === "weight" && (() => {
                  const prod = products.find((p) => p.id === item.productId);
                  const minW = prod?.unit === "meter" ? 50 : 20;
                  const unitName = prod?.unit === "meter" ? "متر" : "كغ";
                  return (item.weight ?? 0) < minW ? (
                    <Text style={{ color: "#C0392B", fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right", paddingHorizontal: 4 }}>
                      الحد الأدنى {minW} {unitName}
                    </Text>
                  ) : null;
                })()}
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

            {editOrderId && (
              <Pressable
                onPress={() => router.push("/(tabs)/products")}
                style={[styles.browseBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
              >
                <Icon name="package-plus" size={16} color={colors.gold} />
                <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  تصفح المنتجات لإضافة بديل
                </Text>
              </Pressable>
            )}

            {hasPiecesOrder && !editOrderId && (
              <View style={[styles.salesNote, { backgroundColor: colors.gold + "11", borderColor: colors.gold + "33", borderRadius: colors.radius }]}>
                <View style={styles.salesNoteInfoRow}>
                  <Icon name="info" size={16} color={colors.gold} />
                  <Text style={[styles.salesNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    الوزن التقديري لكل ثوب 20 كغ — الوزن الفعلي يُحدد عند التجهيز
                  </Text>
                </View>
                {cart.filter(i => i.orderType === "pieces").map((item, idx) => (
                  <View key={idx} style={{ flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingVertical: 2 }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right", flex: 1 }}>
                      {item.productName} ({item.colorName}) × {item.quantity}
                    </Text>
                    <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                      ≈ {item.quantity * 20 * item.unitPrice} ج.م
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!editOrderId && (
              <View style={[styles.paymentSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
                <View style={styles.paymentHeader}>
                  <Icon name="wallet" size={18} color={colors.gold} />
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 16, flex: 1, textAlign: "right" }}>
                    طريقة الدفع
                  </Text>
                </View>

                <View style={styles.paymentGrid}>
                  {PAYMENT_METHODS.map((pm) => {
                    const isSelected = selectedPayment === pm.key;
                    const pmColor = PAYMENT_COLORS[pm.key];
                    return (
                      <Pressable
                        key={pm.key}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedPayment(pm.key);
                        }}
                        style={[
                          styles.paymentOption,
                          {
                            backgroundColor: isSelected ? pmColor + "15" : colors.surface,
                            borderColor: isSelected ? pmColor : colors.border,
                            borderRadius: colors.radius - 4,
                            borderWidth: isSelected ? 1.5 : 1,
                          },
                        ]}
                      >
                        <View style={[styles.paymentOptionIcon, { backgroundColor: isSelected ? pmColor + "22" : colors.border + "44" }]}>
                          <Icon name={PAYMENT_METHOD_ICONS[pm.key]} size={18} color={isSelected ? pmColor : colors.mutedForeground} />
                        </View>
                        <Text style={{
                          color: isSelected ? pmColor : colors.foreground,
                          fontFamily: isSelected ? "Inter_700Bold" : "Inter_500Medium",
                          fontSize: 13,
                        }}>
                          {pm.short}
                        </Text>
                        <Text style={{
                          color: colors.mutedForeground + (isSelected ? "" : "99"),
                          fontFamily: "Inter_400Regular",
                          fontSize: 10,
                        }}>
                          {pm.desc}
                        </Text>
                        {isSelected && (
                          <View style={[styles.paymentCheck, { backgroundColor: pmColor }]}>
                            <Icon name="check" size={10} color="#FFF" />
                          </View>
                        )}
                        {pm.key === "ewallet" && isSelected && totalPrice > 0 && (
                          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3, marginTop: 2 }}>
                            <Icon name="alert-circle" size={10} color="#E74C3C" />
                            <Text style={{ color: "#E74C3C", fontFamily: "Inter_400Regular", fontSize: 9 }}>+{ewalletFee}% رسوم</Text>
                          </View>
                        )}
                        {pm.key === "instapay" && isSelected && (
                          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 3, marginTop: 2 }}>
                            <Icon name="check-circle" size={10} color="#2ECC71" />
                            <Text style={{ color: "#2ECC71", fontFamily: "Inter_400Regular", fontSize: 9 }}>بدون رسوم</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
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
            <View style={{ gap: 4 }}>
              {totalPrice > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {hasPiecesOrder ? "الإجمالي التقديري" : "المجموع الكلي"}
                  </Text>
                  <View style={{ alignItems: "flex-start" }}>
                    {selectedPayment === "ewallet" && feeAmount > 0 ? (
                      <>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textDecorationLine: "line-through" }}>
                          {hasPiecesOrder ? "≈ " : ""}{totalPrice.toLocaleString("ar-EG")} ج.م
                        </Text>
                        <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                          {hasPiecesOrder ? "≈ " : ""}{totalWithFee.toLocaleString("ar-EG")} ج.م
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                        {hasPiecesOrder ? "≈ " : ""}{totalPrice.toLocaleString("ar-EG")} ج.م
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
            {selectedPayment && !editOrderId && (
              <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingVertical: 2 }}>
                <Icon name={PAYMENT_METHOD_ICONS[selectedPayment]} size={14} color={PAYMENT_COLORS[selectedPayment]} />
                <Text style={{ color: PAYMENT_COLORS[selectedPayment], fontFamily: "Inter_500Medium", fontSize: 12 }}>
                  {PAYMENT_METHODS.find(p => p.key === selectedPayment)?.short}
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

          {renderPaymentModal()}
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
  browseBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
  },
  salesNote: {
    gap: 10,
    padding: 14,
    borderWidth: 1,
  },
  salesNoteInfoRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },
  salesNoteText: { flex: 1, fontSize: 13, textAlign: "right", lineHeight: 20 },
  callSalesBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  paymentSection: {
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  paymentHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  paymentGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentOption: {
    width: "48%" as any,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 12,
    alignItems: "center",
    gap: 6,
    position: "relative",
  },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentCheck: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 14 },
  totalPrice: { fontSize: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    maxHeight: "85%",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    gap: 10,
    alignItems: "center",
  },
  modalCancelBtn: {
    paddingVertical: 8,
  },
  paymentInfoSection: {
    gap: 12,
  },
  paymentInfoBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  copyRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  copyRowContent: {
    flex: 1,
    gap: 3,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  amountBox: {
    padding: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  feeBreakdown: {
    width: "100%",
    gap: 8,
  },
  feeRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeDivider: {
    height: 1,
    width: "100%",
    marginVertical: 4,
  },
});
