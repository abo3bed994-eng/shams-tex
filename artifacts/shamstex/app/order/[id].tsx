import React, { useState } from "react";
import { Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, OrderStatus, PaymentMethod, PAYMENT_METHOD_LABELS, PAYMENT_METHOD_ICONS } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { persistImageUri } from "@/utils/persistImage";

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: "pending", label: "بانتظار الاستلام", icon: "clock" },
  { key: "received", label: "تم استلام الطلب", icon: "inbox" },
  { key: "preparing", label: "جاري تجهيز الطلب", icon: "package" },
  { key: "ready", label: "الطلب جاهز للاستلام", icon: "gift" },
  { key: "delivered", label: "تم التسليم", icon: "check-circle" },
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "#9B59B6",
  received: "#3498DB",
  preparing: "#F39C12",
  ready: "#27AE60",
  delivered: "#2ECC71",
  cancelled: "#E74C3C",
};

const NEXT_ACTION: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pending:   { next: "received",  label: "استلام الطلب" },
  received:  { next: "preparing", label: "بدء التجهيز" },
  preparing: { next: "ready",     label: "تأكيد الجاهزية" },
  ready:     { next: "delivered", label: "تأكيد التسليم" },
};
const PREV_ACTION: Partial<Record<OrderStatus, { prev: OrderStatus; label: string }>> = {
  received:  { prev: "pending",   label: "إلغاء الاستلام" },
  preparing: { prev: "received",  label: "رجوع لاستلام" },
  ready:     { prev: "preparing", label: "رجوع لتجهيز" },
  delivered: { prev: "ready",     label: "رجوع لجاهز" },
};

async function pickImage(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      "اختر مصدر الصورة",
      "من أين تريد رفع الصورة؟",
      [
        {
          text: "الكاميرا",
          onPress: async () => {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) {
              Alert.alert("خطأ", "يرجى السماح بالوصول للكاميرا");
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              allowsEditing: true,
            });
            if (!result.canceled && result.assets[0]) {
              const uploaded = await persistImageUri(result.assets[0].uri);
              resolve(uploaded);
            } else {
              resolve(null);
            }
          },
        },
        {
          text: "المعرض",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.7,
              allowsEditing: true,
            });
            if (!result.canceled && result.assets[0]) {
              const uploaded = await persistImageUri(result.assets[0].uri);
              resolve(uploaded);
            } else {
              resolve(null);
            }
          },
        },
        { text: "إلغاء", style: "cancel", onPress: () => resolve(null) },
      ]
    );
  });
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders, user, updateOrderStatus, deleteOrder, sendOrderMessage, setOrderEditable, setOrderInvoiceImage, updateOrderItems, returnRequests, addReturnRequest, updateReturnStatus, setEditingOrderId, settings, products } = useApp();
  const [showMsgInput, setShowMsgInput] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [editingOrder, setEditingOrder] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnSelectedItems, setReturnSelectedItems] = useState<Record<number, boolean>>({});
  const [returnItemWeights, setReturnItemWeights] = useState<Record<number, number>>({});
  const [weightTexts, setWeightTexts] = useState<Record<string, string>>({});
  const [returnWeightTexts, setReturnWeightTexts] = useState<Record<number, string>>({});
  const [showInvoiceImage, setShowInvoiceImage] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [returnInvoiceImage, setReturnInvoiceImage] = useState<string | null>(null);
  const [uploadingReturnInvoice, setUploadingReturnInvoice] = useState(false);

  const order = orders.find((o) => o.id === id);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isStaff = user?.role === "admin" || user?.role === "employee" || user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const isCustomer = user?.role === "customer" || user?.role === "merchant";
  const isAssignedToMe = order?.assignedTo === user?.id;
  const isLockedByOther = order?.assignedTo && !isAssignedToMe && !isAdmin;

  const isCancelled = order?.status === "cancelled";
  const currentStep = isCancelled ? 0 : STATUS_STEPS.findIndex((s) => s.key === order?.status);

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GoldHeader title="تفاصيل الطلب" onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Text style={{ color: colors.mutedForeground }}>الطلب غير موجود</Text>
        </View>
      </View>
    );
  }

  const date = new Date(order.createdAt).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const activeColor = STATUS_COLORS[order.status];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader
        title="تفاصيل الطلب"
        subtitle={`#${order.id.slice(0, 10)}`}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        <View style={[styles.statusCard, { backgroundColor: activeColor + "11", borderColor: activeColor + "44", borderRadius: colors.radius }]}>
          <Icon name={isCancelled ? "x-circle" : STATUS_STEPS[currentStep].icon as any} size={28} color={activeColor} />
          <Text style={[styles.statusLabel, { color: activeColor, fontFamily: "Inter_700Bold" }]}>
            {isCancelled ? "تم إلغاء الطلب" : STATUS_STEPS[currentStep].label}
          </Text>
          <Text style={[styles.orderDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {date}
          </Text>
        </View>

        {order.edited && isStaff && (
          <View style={[{ backgroundColor: "#F39C1215", borderColor: "#F39C1244", borderWidth: 1, borderRadius: colors.radius, padding: 12, flexDirection: "row-reverse", alignItems: "center", gap: 10 }]}>
            <Icon name="edit-3" size={18} color="#F39C12" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#F39C12", fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "right" }}>
                تم تعديل الطلب من قبل العميل
              </Text>
              {order.editedAt && (
                <Text style={{ color: "#F39C1299", fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>
                  {new Date(order.editedAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })} — {new Date(order.editedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.stepsRow}>
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStep;
            const stepColor = isCompleted ? activeColor : colors.border;
            return (
              <React.Fragment key={step.key}>
                <View style={styles.step}>
                  <View
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor: isCompleted ? stepColor : colors.surface,
                        borderColor: stepColor,
                      },
                    ]}
                  >
                    {isCompleted && <Icon name="check" size={10} color="#fff" />}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isCompleted ? colors.foreground : colors.mutedForeground,
                        fontFamily: isCompleted ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {step.label}
                  </Text>
                </View>
                {index < STATUS_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      { backgroundColor: index < currentStep ? activeColor : colors.border },
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {isStaff && (
          <View style={[styles.customerInfo, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              معلومات العميل
            </Text>
            <View style={styles.infoRow}>
              <Icon name="user" size={15} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {order.userName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Icon name="phone" size={15} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                {order.userPhone}
              </Text>
            </View>
            {order.userPhone && (
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "اتصال بالعميل",
                    `هل تريد الاتصال بـ ${order.userName}؟\n${order.userPhone}`,
                    [
                      { text: "إلغاء", style: "cancel" },
                      { text: "اتصال", onPress: () => {
                        import("expo-linking").then((Linking) => Linking.openURL(`tel:${order.userPhone.replace(/\s/g, "")}`)).catch(() => {});
                      }},
                    ]
                  );
                }}
                style={({ pressed }) => [{
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 10,
                  marginTop: 8,
                  backgroundColor: colors.gold + "15",
                  borderColor: colors.gold + "44",
                  borderWidth: 1,
                  borderRadius: colors.radius - 4,
                  opacity: pressed ? 0.7 : 1,
                }]}
              >
                <Icon name="phone" size={16} color={colors.gold} />
                <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  اتصال بالعميل
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={[styles.itemsSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            المنتجات المطلوبة
          </Text>
          {order.items.map((item, index) => (
            <View
              key={index}
              style={[styles.orderItem, { borderBottomColor: colors.border }]}
            >
              <View style={styles.orderItemRight}>
                <View style={[styles.colorSwatch, { backgroundColor: item.colorHex, borderColor: colors.border }]} />
                <View style={styles.orderItemInfo}>
                  <Text style={[styles.orderItemName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {item.productName}
                  </Text>
                  <Text style={[styles.orderItemColor, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {item.colorName}
                  </Text>
                  <Text style={{ color: colors.gold + "99", fontFamily: "Inter_500Medium", fontSize: 11 }}>
                    {item.unitPrice} ج.م/كغ
                  </Text>
                </View>
              </View>
              <View style={[styles.orderItemLeft, { gap: 10 }]}>
                {item.orderType === "weight" ? (
                  <View style={{ alignItems: "flex-start", gap: 4 }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                      {item.weight ?? 1} {(() => { const p = products.find(pp => pp.id === item.productId); return p?.unit === "meter" ? "متر" : "كغ"; })()}
                    </Text>
                    <Text style={[styles.orderItemPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                      {item.unitPrice * (item.weight ?? 1)} ج.م
                    </Text>
                    {isStaff && order.status === "preparing" && !isLockedByOther && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Pressable
                          onPress={() => {
                            const newWeight = Math.max(1, (item.weight ?? 1) - 1);
                            const newItems = order.items.map((it, i) => i === index ? { ...it, weight: newWeight } : it);
                            const weightTotal = newItems.filter(i => i.orderType === "weight").reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                            const piecesTotal = newItems.filter(i => i.orderType === "pieces").reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                            updateOrderItems(order.id, newItems, weightTotal + piecesTotal, true);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
                        >
                          <Icon name="minus" size={12} color={colors.gold} />
                        </Pressable>
                        <TextInput
                          style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 13, minWidth: 40, textAlign: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 }}
                          value={weightTexts[`w_${index}`] !== undefined ? weightTexts[`w_${index}`] : String(item.weight ?? 1)}
                          keyboardType="decimal-pad"
                          onChangeText={(txt) => {
                            if (!/^\d*\.?\d*$/.test(txt)) return;
                            setWeightTexts(p => ({ ...p, [`w_${index}`]: txt }));
                            const val = parseFloat(txt);
                            if (isNaN(val) || val <= 0) return;
                            const newW = Math.max(0.1, val);
                            const newItems = order.items.map((it, i) => i === index ? { ...it, weight: newW } : it);
                            const weightTotal = newItems.filter(i => i.orderType === "weight").reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                            const piecesTotal = newItems.filter(i => i.orderType === "pieces").reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                            updateOrderItems(order.id, newItems, weightTotal + piecesTotal, true);
                          }}
                          onBlur={() => setWeightTexts(p => { const n={...p}; delete n[`w_${index}`]; return n; })}
                        />
                        <Pressable
                          onPress={() => {
                            const newWeight = (item.weight ?? 1) + 1;
                            const newItems = order.items.map((it, i) => i === index ? { ...it, weight: newWeight } : it);
                            const weightTotal = newItems.filter(i => i.orderType === "weight").reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                            const piecesTotal = newItems.filter(i => i.orderType === "pieces").reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                            updateOrderItems(order.id, newItems, weightTotal + piecesTotal, true);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}
                        >
                          <Icon name="plus" size={12} color={colors.background} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ alignItems: "flex-start", gap: 4 }}>
                    <Text style={[styles.orderItemQty, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                      x{item.quantity} ثوب
                    </Text>
                    {item.actualWeight ? (
                      <View style={{ gap: 2 }}>
                        <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 13 }}>
                          {item.actualWeight} كغ
                        </Text>
                        <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 12 }}>
                          {item.actualWeight * item.unitPrice} ج.م
                        </Text>
                      </View>
                    ) : (
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                        ≈ {item.quantity * 20 * item.unitPrice} ج.م (تقديري)
                      </Text>
                    )}
                    {isStaff && order.status === "preparing" && !isLockedByOther && (
                      <View style={{ gap: 4, marginTop: 2 }}>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 10 }}>
                          الوزن الفعلي (كغ):
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Pressable
                            onPress={() => {
                              const curW = item.actualWeight ?? (item.quantity * 20);
                              const newW = Math.max(1, curW - 1);
                              const newItems = order.items.map((it, i) => i === index ? { ...it, actualWeight: newW } : it);
                              const weightTotal = newItems.filter(i => i.orderType === "weight").reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                              const piecesTotal = newItems.filter(i => i.orderType === "pieces").reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                              updateOrderItems(order.id, newItems, weightTotal + piecesTotal, true);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
                          >
                            <Icon name="minus" size={12} color={colors.gold} />
                          </Pressable>
                          <TextInput
                            style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 13, minWidth: 40, textAlign: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 2 }}
                            value={weightTexts[`a_${index}`] !== undefined ? weightTexts[`a_${index}`] : String(item.actualWeight ?? (item.quantity * 20))}
                            keyboardType="decimal-pad"
                            onChangeText={(txt) => {
                              if (!/^\d*\.?\d*$/.test(txt)) return;
                              setWeightTexts(p => ({ ...p, [`a_${index}`]: txt }));
                              const val = parseFloat(txt);
                              if (isNaN(val) || val <= 0) return;
                              const newW = Math.max(0.1, val);
                              const newItems = order.items.map((it, i) => i === index ? { ...it, actualWeight: newW } : it);
                              const weightTotal = newItems.filter(i => i.orderType === "weight").reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                              const piecesTotal = newItems.filter(i => i.orderType === "pieces").reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                              updateOrderItems(order.id, newItems, weightTotal + piecesTotal, true);
                            }}
                          />
                          <Pressable
                            onPress={() => {
                              const curW = item.actualWeight ?? (item.quantity * 20);
                              const newW = curW + 1;
                              const newItems = order.items.map((it, i) => i === index ? { ...it, actualWeight: newW } : it);
                              const weightTotal = newItems.filter(i => i.orderType === "weight").reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                              const piecesTotal = newItems.filter(i => i.orderType === "pieces").reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                              updateOrderItems(order.id, newItems, weightTotal + piecesTotal, true);
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" }}
                          >
                            <Icon name="plus" size={12} color={colors.background} />
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                )}
                {isStaff && order.editable && order.items.length > 1 && (
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "حذف الصنف",
                        `هل تريد حذف "${item.productName} — ${item.colorName}" من الطلب؟`,
                        [
                          { text: "إلغاء", style: "cancel" },
                          { text: "حذف", style: "destructive", onPress: () => {
                            const newItems = order.items.filter((_, i) => i !== index);
                            const weightTotal = newItems.filter(i => i.orderType === "weight").reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                            const piecesTotal = newItems.filter(i => i.orderType === "pieces").reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                            updateOrderItems(order.id, newItems, weightTotal + piecesTotal);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }},
                        ]
                      );
                    }}
                    hitSlop={8}
                  >
                    <Icon name="trash-2" size={14} color={colors.destructive} />
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </View>

        {order.notes && (
          <View style={[styles.notesCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              ملاحظات
            </Text>
            <Text style={[styles.notesText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {order.notes}
            </Text>
          </View>
        )}

        <View style={[styles.totalCard, { backgroundColor: colors.card, borderColor: colors.gold + "33", borderRadius: colors.radius }]}>
          {(() => {
            const weightTotal = order.items
              .filter((i) => i.orderType === "weight")
              .reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
            const hasPieces = order.items.some((i) => i.orderType === "pieces");

            const piecesActualTotal = order.items
              .filter((i) => i.orderType === "pieces" && i.actualWeight)
              .reduce((a, b) => a + (b.actualWeight! * b.unitPrice), 0);
            const piecesEstimate = order.items
              .filter((i) => i.orderType === "pieces" && !i.actualWeight)
              .reduce((a, b) => a + b.quantity * 20 * b.unitPrice, 0);
            const allPiecesWeighed = hasPieces && order.items.filter((i) => i.orderType === "pieces").every((i) => i.actualWeight);

            if (weightTotal > 0 && hasPieces) {
              return (
                <View style={{ gap: 10 }}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                      {weightTotal} ج.م
                    </Text>
                    <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      مجموع الكيلو
                    </Text>
                  </View>
                  {piecesActualTotal > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 16 }]}>
                        {piecesActualTotal} ج.م
                      </Text>
                      <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        مجموع الأثواب (وزن فعلي)
                      </Text>
                    </View>
                  )}
                  {piecesEstimate > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={[styles.totalPrice, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 14 }]}>
                        ≈ {piecesEstimate} ج.م
                      </Text>
                      <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }]}>
                        تقديري (لم يوزن بعد)
                      </Text>
                    </View>
                  )}
                  <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }]}>
                    <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                      {allPiecesWeighed ? "" : "≈ "}{weightTotal + piecesActualTotal + piecesEstimate} ج.م
                    </Text>
                    <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {allPiecesWeighed ? "الإجمالي النهائي" : "الإجمالي التقديري"}
                    </Text>
                  </View>
                </View>
              );
            }
            if (weightTotal > 0) {
              return (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                    {weightTotal} ج.م
                  </Text>
                  <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    المجموع الكلي
                  </Text>
                </View>
              );
            }
            return (
              <View style={{ gap: 6 }}>
                {piecesActualTotal > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalPrice, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                      {piecesActualTotal} ج.م
                    </Text>
                    <Text style={[styles.totalLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {allPiecesWeighed ? "الإجمالي النهائي" : "مجموع الموزون"}
                    </Text>
                  </View>
                )}
                {piecesEstimate > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalPrice, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                      ≈ {piecesEstimate} ج.م
                    </Text>
                    <Text style={[styles.totalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }]}>
                      تقديري (لم يوزن بعد)
                    </Text>
                  </View>
                )}
                {!allPiecesWeighed && (
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" }}>
                    تقدير بناءً على 20كغ لكل ثوب — الوزن الفعلي يحدده الطاقم
                  </Text>
                )}
              </View>
            );
          })()}
        </View>

        {order.invoiceImage && (
          <View style={[styles.invoiceCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name="file-text" size={18} color={colors.gold} />
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 15, flex: 1, textAlign: "right" }}>
                الفاتورة
              </Text>
            </View>
            <Pressable onPress={() => setShowInvoiceImage(true)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <Image
                source={{ uri: order.invoiceImage }}
                style={{ width: "100%", height: 200, borderRadius: colors.radius - 4, backgroundColor: colors.surface }}
                resizeMode="cover"
              />
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center", marginTop: 6 }}>
                اضغط لعرض الفاتورة بالحجم الكامل
              </Text>
            </Pressable>
          </View>
        )}

        {isStaff && order.status === "ready" && !isLockedByOther && (
          <Pressable
            onPress={async () => {
              try {
                setUploadingInvoice(true);
                const uri = await pickImage();
                if (uri) {
                  await setOrderInvoiceImage(order.id, uri);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert("تم", "تم رفع صورة الفاتورة وإشعار العميل");
                }
              } catch {
                Alert.alert("خطأ", "تعذّر رفع الصورة");
              } finally {
                setUploadingInvoice(false);
              }
            }}
            style={({ pressed }) => [{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              backgroundColor: order.invoiceImage ? colors.surface : colors.gold + "15",
              borderColor: order.invoiceImage ? colors.border : colors.gold + "44",
              borderWidth: 1,
              borderRadius: colors.radius - 4,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Icon name={order.invoiceImage ? "refresh-cw" : "camera"} size={16} color={order.invoiceImage ? colors.mutedForeground : colors.gold} />
            <Text style={{ color: order.invoiceImage ? colors.mutedForeground : colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {uploadingInvoice ? "جاري الرفع..." : order.invoiceImage ? "تغيير صورة الفاتورة" : "رفع صورة الفاتورة"}
            </Text>
          </Pressable>
        )}

        {isStaff && order.invoiceImage && order.status === "ready" && !isLockedByOther && (
          <Pressable
            onPress={() => {
              Alert.alert(
                "حذف الصورة",
                "هل تريد حذف صورة الفاتورة؟",
                [
                  { text: "إلغاء", style: "cancel" },
                  {
                    text: "حذف",
                    style: "destructive",
                    onPress: async () => {
                      await setOrderInvoiceImage(order.id, null);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                  },
                ]
              );
            }}
            style={({ pressed }) => [{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 10,
              backgroundColor: "#C0392B11",
              borderColor: "#C0392B44",
              borderWidth: 1,
              borderRadius: colors.radius - 4,
              opacity: pressed ? 0.7 : 1,
            }]}
          >
            <Icon name="trash-2" size={14} color="#C0392B" />
            <Text style={{ color: "#C0392B", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              حذف صورة الفاتورة
            </Text>
          </Pressable>
        )}

        {order.paymentMethod && (() => {
          const pm = order.paymentMethod as PaymentMethod;
          const pmColors: Record<PaymentMethod, string> = {
            cash: "#27AE60",
            bank_transfer: colors.gold,
            ewallet: "#9B59B6",
            instapay: "#2ECC71",
          };
          const pmShort: Record<PaymentMethod, string> = {
            cash: "كاش (الدفع عند الاستلام)",
            bank_transfer: "تحويل بنكي",
            ewallet: "محفظة إلكترونية",
            instapay: "انستاباي",
          };
          const pmColor = pmColors[pm] ?? colors.gold;
          return (
            <View style={[styles.paymentMethodCard, { backgroundColor: pmColor + "11", borderColor: pmColor + "33", borderRadius: colors.radius }]}>
              <View style={styles.paymentMethodRow}>
                <View style={[styles.paymentMethodIcon, { backgroundColor: pmColor + "22" }]}>
                  <Icon name={PAYMENT_METHOD_ICONS[pm] ?? "credit-card"} size={18} color={pmColor} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>طريقة الدفع</Text>
                  <Text style={{ color: pmColor, fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "right" }}>
                    {pmShort[pm] ?? pm}
                  </Text>
                </View>
              </View>
              {pm === "ewallet" && (order.paymentFee ?? 0) > 0 && (
                <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: pmColor + "22", paddingTop: 8, marginTop: 4 }}>
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>رسوم المحفظة</Text>
                    <Text style={{ color: "#E74C3C", fontFamily: "Inter_600SemiBold", fontSize: 12 }}>+{order.paymentFee} ج.م</Text>
                  </View>
                  <View style={{ flexDirection: "row-reverse", justifyContent: "space-between" }}>
                    <Text style={{ color: pmColor, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>الإجمالي مع الرسوم</Text>
                    <Text style={{ color: pmColor, fontFamily: "Inter_700Bold", fontSize: 15 }}>{order.totalWithFee} ج.م</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        {isStaff && !!order.assignedToName && (
          <View style={[styles.assignedCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Icon name="user-check" size={15} color={colors.gold} />
            <Text style={[styles.assignedText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              استلمه: {order.assignedToName}
            </Text>
          </View>
        )}

        {isStaff && order.status !== "cancelled" && (() => {
          const nextAction = NEXT_ACTION[order.status];
          const prevAction = PREV_ACTION[order.status];
          return (
            <View style={styles.actionRow}>
              {(isAdmin || (isStaff && (user?.permissions ?? []).includes("edit_orders"))) && prevAction && (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "تأكيد",
                      `هل تريد ${prevAction.label}؟`,
                      [
                        { text: "إلغاء", style: "cancel" },
                        { text: "نعم", onPress: () => updateOrderStatus(order.id, prevAction.prev) },
                      ]
                    );
                  }}
                  style={[styles.prevBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
                >
                  <Icon name="chevron-right" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.prevBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {prevAction.label}
                  </Text>
                </Pressable>
              )}
              {nextAction && !isLockedByOther && (
                <GoldButton
                  label={nextAction.label}
                  onPress={() => {
                    Alert.alert(
                      "تأكيد",
                      `هل تريد "${nextAction.label}"؟`,
                      [
                        { text: "إلغاء", style: "cancel" },
                        { text: "نعم", onPress: () => {
                          if (nextAction.next === "ready") {
                            const hasPiecesWithoutWeight = order.items.some(
                              (i) => i.orderType === "pieces" && !i.actualWeight
                            );
                            if (hasPiecesWithoutWeight) {
                              const newItems = order.items.map((i) => {
                                if (i.orderType === "pieces" && !i.actualWeight) {
                                  return { ...i, actualWeight: i.quantity * 20 };
                                }
                                return i;
                              });
                              const weightTotal = newItems
                                .filter((i) => i.orderType === "weight")
                                .reduce((a, b) => a + b.unitPrice * (b.weight ?? 1), 0);
                              const piecesTotal = newItems
                                .filter((i) => i.orderType === "pieces")
                                .reduce((a, b) => a + (b.actualWeight ?? (b.quantity * 20)) * b.unitPrice, 0);
                              updateOrderItems(order.id, newItems, weightTotal + piecesTotal, true);
                            }
                          }
                          if (nextAction.next === "received" && user?.role !== "admin") {
                            updateOrderStatus(order.id, nextAction.next, user?.id, user?.name);
                          } else {
                            updateOrderStatus(order.id, nextAction.next);
                          }
                        }},
                      ]
                    );
                  }}
                  style={{ flex: 1 }}
                />
              )}
              {nextAction && isLockedByOther && (
                <View style={[styles.lockedMsg, { backgroundColor: colors.surface, borderRadius: colors.radius - 4 }]}>
                  <Icon name="lock" size={14} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "right" }}>
                    هذا الطلب مستلم من {order.assignedToName ?? "موظف آخر"}
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {isStaff && order.status === "preparing" && !isLockedByOther && (
          <Pressable
            onPress={() => {
              setOrderEditable(order.id, !order.editable);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Alert.alert(
                order.editable ? "تم إغلاق التعديل" : "تم السماح بالتعديل",
                order.editable
                  ? "لن يستطيع العميل تعديل الطلب الآن"
                  : "يمكن للعميل الآن تعديل الطلب واختيار بديل"
              );
            }}
            style={[styles.editableBtn, {
              backgroundColor: order.editable ? "#F39C1222" : colors.surface,
              borderColor: order.editable ? "#F39C12" : colors.border,
              borderRadius: colors.radius - 4,
            }]}
          >
            <Icon name={order.editable ? "x-circle" : "edit-3"} size={14} color={order.editable ? "#F39C12" : colors.gold} />
            <Text style={{ color: order.editable ? "#F39C12" : colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {order.editable ? "إغلاق تعديل العميل" : "خامة غير متوفرة — السماح بالتعديل"}
            </Text>
          </Pressable>
        )}

        {isStaff && order.status !== "cancelled" && (
          <View style={[styles.msgSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {!showMsgInput ? (
              <Pressable
                onPress={() => setShowMsgInput(true)}
                style={[styles.msgToggleBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
              >
                <Icon name="message-square" size={16} color={colors.gold} />
                <Text style={[styles.msgToggleBtnText, { color: colors.gold, fontFamily: "Inter_600SemiBold" }]}>
                  إرسال رسالة للعميل
                </Text>
              </Pressable>
            ) : (
              <View style={styles.msgInputContainer}>
                <Text style={[styles.msgLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  إرسال رسالة + إشعار للعميل
                </Text>
                <TextInput
                  style={[styles.msgInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular", borderRadius: colors.radius - 4 }]}
                  placeholder="مثال: الصنف غير متوفر حالياً..."
                  placeholderTextColor={colors.mutedForeground}
                  value={msgText}
                  onChangeText={setMsgText}
                  multiline
                  textAlign="right"
                />
                <View style={styles.msgBtnRow}>
                  <Pressable
                    onPress={() => { setShowMsgInput(false); setMsgText(""); }}
                    style={[styles.msgCancelBtn, { borderColor: colors.border, borderRadius: colors.radius - 4 }]}
                  >
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>إلغاء</Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => {
                      if (!msgText.trim()) return;
                      setSendingMsg(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      await sendOrderMessage(order.id, msgText.trim());
                      setSendingMsg(false);
                      setShowMsgInput(false);
                      setMsgText("");
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert("تم", "تم إرسال الرسالة والإشعار للعميل بنجاح");
                    }}
                    disabled={sendingMsg || !msgText.trim()}
                    style={[styles.msgSendBtn, { backgroundColor: colors.gold, borderRadius: colors.radius - 4, opacity: sendingMsg || !msgText.trim() ? 0.5 : 1 }]}
                  >
                    <Icon name="send" size={14} color={colors.background} />
                    <Text style={{ color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      {sendingMsg ? "جاري الإرسال..." : "إرسال"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        )}

        {isCustomer && order.editable && (
          <View style={[styles.editableCustomerCard, { backgroundColor: "#F39C1218", borderColor: "#F39C12", borderRadius: colors.radius }]}>
            <View style={styles.editableCustomerHeader}>
              <Icon name="alert-triangle" size={16} color="#F39C12" />
              <Text style={{ color: "#F39C12", fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "right", flex: 1 }}>
                خامة غير متوفرة — يمكنك تعديل طلبك
              </Text>
            </View>
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "right", lineHeight: 20 }}>
              تم إعلامك بأن أحد الأصناف غير متوفر. يمكنك الآن تعديل الطلب واختيار بديل أو تعديل الكميات.
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                router.push({ pathname: "/cart", params: { editOrderId: order.id } } as any);
              }}
              style={[styles.browseAlternativeBtn, { backgroundColor: colors.gold, borderRadius: colors.radius }]}
            >
              <Icon name="refresh-cw" size={20} color={colors.background} />
              <Text style={{ color: colors.background, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                اختيار منتجات بديلة
              </Text>
            </Pressable>
          </View>
        )}

        {(() => {
          const contactPhone = (isCustomer || order.orderType === "pieces")
            ? settings.contacts?.find((c) => c.label.includes("مبيعات") || c.label.includes("عملاء"))?.number
            : (user?.role === "merchant")
              ? settings.contacts?.find((c) => c.label.includes("جملة") || c.label.includes("تاجر"))?.number
              : null;
          const contactLabel = (isCustomer || order.orderType === "pieces") ? "مسؤول المبيعات" : "مسؤول الجملة";

          if (!contactPhone || isStaff) return null;
          return (
            <Pressable
              onPress={() => {
                const url = `tel:${contactPhone}`;
                import("expo-linking").then((Linking) => Linking.openURL(url)).catch(() => {});
              }}
              style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 }]}
            >
              <Icon name="phone" size={13} color={colors.mutedForeground + "99"} />
              <Text style={{ color: colors.mutedForeground + "99", fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>
                {contactLabel} · {contactPhone}
              </Text>
            </Pressable>
          );
        })()}

        {(() => {
          const orderReturn = returnRequests.find((r) => r.orderId === order.id && r.status !== "cancelled");
          const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : null;
          const hoursSinceDelivery = deliveredAt ? (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60) : 0;
          const canReturn = isCustomer && order.status === "delivered" && order.deliveredAt && !orderReturn && hoursSinceDelivery >= 1;
          const daysSinceDelivery = deliveredAt ? Math.floor((Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24)) : 999;
          const withinReturnWindow = daysSinceDelivery <= 15;

          return (
            <>
              {orderReturn && (
                <Pressable
                  onPress={() => router.push(`/return/${orderReturn.id}`)}
                  style={({ pressed }) => [styles.returnStatusCard, {
                    backgroundColor: "#C0392B11",
                    borderColor: "#C0392B44",
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                  }]}
                >
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                    <Icon name="rotate-ccw" size={18} color="#C0392B" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#C0392B", fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "right" }}>
                        يوجد طلب استرجاع لهذا الطلب
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right" }}>
                        {orderReturn.status === "settled" ? "تمت المخالصة" : orderReturn.status === "returned" ? "تم الاسترجاع — بانتظار المخالصة" : "قيد المراجعة"}
                      </Text>
                    </View>
                    <Icon name="chevron-left" size={16} color="#C0392B" />
                  </View>
                </Pressable>
              )}

              {canReturn && withinReturnWindow && !showReturnForm && (
                <Pressable
                  onPress={() => setShowReturnForm(true)}
                  style={[styles.returnBtn, { backgroundColor: "#C0392B18", borderColor: "#C0392B", borderRadius: colors.radius }]}
                >
                  <Icon name="rotate-ccw" size={16} color="#C0392B" />
                  <Text style={{ color: "#C0392B", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                    طلب استرجاع
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                    متاح خلال {15 - daysSinceDelivery} يوم
                  </Text>
                </Pressable>
              )}

              {canReturn && !withinReturnWindow && (
                <View style={[styles.returnExpired, { backgroundColor: colors.surface, borderRadius: colors.radius }]}>
                  <Icon name="clock" size={14} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
                    انتهت مهلة الاسترجاع (15 يوم من التسليم)
                  </Text>
                </View>
              )}

              {showReturnForm && (
                <View style={[styles.returnFormCard, { backgroundColor: colors.card, borderColor: "#C0392B", borderRadius: colors.radius }]}>
                  <Text style={{ color: "#C0392B", fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "right" }}>
                    طلب استرجاع
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right", marginTop: 4 }}>
                    اختر الأصناف التي تريد استرجاعها واكتب السبب
                  </Text>

                  <View style={{ gap: 6, marginTop: 8 }}>
                    <Pressable
                      onPress={() => {
                        const allSelected = order.items.every((_, i) => returnSelectedItems[i]);
                        const newState: Record<number, boolean> = {};
                        order.items.forEach((_, i) => { newState[i] = !allSelected; });
                        setReturnSelectedItems(newState);
                      }}
                      style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, paddingVertical: 6 }}
                    >
                      <View style={{
                        width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                        borderColor: order.items.every((_, i) => returnSelectedItems[i]) ? "#C0392B" : colors.border,
                        backgroundColor: order.items.every((_, i) => returnSelectedItems[i]) ? "#C0392B" : "transparent",
                        alignItems: "center", justifyContent: "center",
                      }}>
                        {order.items.every((_, i) => returnSelectedItems[i]) && <Icon name="check" size={12} color="#fff" />}
                      </View>
                      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>تحديد الكل</Text>
                    </Pressable>

                    {order.items.map((item, index) => {
                      const isWeight = item.orderType === "weight";
                      const maxVal = isWeight ? (item.weight ?? 1) : item.quantity;
                      const curVal = returnItemWeights[index] ?? maxVal;
                      const unitLabel = isWeight
                        ? ((item as any).unit === "meter" || products.find(p => p.id === item.productId)?.unit === "meter" ? "متر" : "كغ")
                        : "ثوب";
                      return (
                        <View key={index} style={{ gap: 4 }}>
                          <Pressable
                            onPress={() => {
                              setReturnSelectedItems((prev) => ({ ...prev, [index]: !prev[index] }));
                              if (!returnItemWeights[index]) {
                                setReturnItemWeights((prev) => ({ ...prev, [index]: maxVal }));
                              }
                            }}
                            style={[{
                              flexDirection: "row-reverse",
                              alignItems: "center",
                              gap: 10,
                              paddingVertical: 8,
                              paddingHorizontal: 8,
                              borderRadius: 8,
                              backgroundColor: returnSelectedItems[index] ? "#C0392B11" : colors.surface,
                              borderWidth: 1,
                              borderColor: returnSelectedItems[index] ? "#C0392B44" : colors.border,
                            }]}
                          >
                            <View style={{
                              width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                              borderColor: returnSelectedItems[index] ? "#C0392B" : colors.border,
                              backgroundColor: returnSelectedItems[index] ? "#C0392B" : "transparent",
                              alignItems: "center", justifyContent: "center",
                            }}>
                              {returnSelectedItems[index] && <Icon name="check" size={12} color="#fff" />}
                            </View>
                            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: item.colorHex, borderWidth: 1, borderColor: colors.border }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "right" }}>
                                {item.productName}
                              </Text>
                              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>
                                {item.colorName} — {isWeight ? `${item.weight ?? 1} ${unitLabel}` : `${item.quantity} ${unitLabel}`}
                              </Text>
                            </View>
                          </Pressable>
                          {returnSelectedItems[index] && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 }}>
                              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 11 }}>
                                الكمية للاسترجاع:
                              </Text>
                              <Pressable
                                onPress={() => {
                                  const nv = Math.max(1, curVal - 1);
                                  setReturnItemWeights((prev) => ({ ...prev, [index]: nv }));
                                }}
                                style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
                              >
                                <Icon name="minus" size={10} color="#C0392B" />
                              </Pressable>
                              <TextInput
                                style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 12, minWidth: 36, textAlign: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 1 }}
                                value={returnWeightTexts[index] !== undefined ? returnWeightTexts[index] : String(curVal)}
                                keyboardType="decimal-pad"
                                onChangeText={(txt) => {
                                  if (!/^\d*\.?\d*$/.test(txt)) return;
                                  setReturnWeightTexts(p => ({ ...p, [index]: txt }));
                                  const val = parseFloat(txt);
                                  if (isNaN(val) || val <= 0 || val > maxVal) return;
                                  setReturnItemWeights((prev) => ({ ...prev, [index]: val }));
                                }}
                                onBlur={() => setReturnWeightTexts(p => { const n={...p}; delete n[index]; return n; })}
                              />
                              <Pressable
                                onPress={() => {
                                  const nv = Math.min(maxVal, curVal + 1);
                                  setReturnItemWeights((prev) => ({ ...prev, [index]: nv }));
                                }}
                                style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#C0392B", alignItems: "center", justifyContent: "center" }}
                              >
                                <Icon name="plus" size={10} color="#fff" />
                              </Pressable>
                              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10 }}>
                                {unitLabel} (من {maxVal})
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <TextInput
                    style={[styles.returnInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular", borderRadius: colors.radius - 4 }]}
                    placeholder="سبب الاسترجاع..."
                    placeholderTextColor={colors.mutedForeground}
                    value={returnReason}
                    onChangeText={setReturnReason}
                    multiline
                    textAlign="right"
                  />

                  <View style={{ marginTop: 10, gap: 8 }}>
                    <Pressable
                      onPress={async () => {
                        try {
                          setUploadingReturnInvoice(true);
                          const uri = await pickImage();
                          if (uri) {
                            setReturnInvoiceImage(uri);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }
                        } catch {
                          Alert.alert("خطأ", "تعذّر رفع الصورة");
                        } finally {
                          setUploadingReturnInvoice(false);
                        }
                      }}
                      style={({ pressed }) => [{
                        flexDirection: "row-reverse",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingVertical: 10,
                        backgroundColor: returnInvoiceImage ? "#C0392B11" : colors.surface,
                        borderColor: returnInvoiceImage ? "#C0392B44" : colors.border,
                        borderWidth: 1,
                        borderRadius: colors.radius - 4,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <Icon name={returnInvoiceImage ? "check-circle" : "camera"} size={16} color={returnInvoiceImage ? "#C0392B" : colors.mutedForeground} />
                      <Text style={{ color: returnInvoiceImage ? "#C0392B" : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                        {uploadingReturnInvoice ? "جاري الرفع..." : returnInvoiceImage ? "تم رفع صورة الفاتورة — تغيير" : "رفع صورة الفاتورة (اختياري)"}
                      </Text>
                    </Pressable>
                    {returnInvoiceImage && (
                      <Image
                        source={{ uri: returnInvoiceImage }}
                        style={{ width: "100%", height: 120, borderRadius: colors.radius - 4, backgroundColor: colors.surface }}
                        resizeMode="cover"
                      />
                    )}
                  </View>

                  <View style={{ flexDirection: "row-reverse", gap: 10, marginTop: 8 }}>
                    <GoldButton
                      label={submittingReturn ? "جاري الإرسال..." : "إرسال طلب الاسترجاع"}
                      onPress={async () => {
                        const selectedItems = order.items
                          .map((item, i) => {
                            if (!returnSelectedItems[i]) return null;
                            const isW = item.orderType === "weight";
                            const retQty = returnItemWeights[i] ?? (isW ? (item.weight ?? 1) : item.quantity);
                            return {
                              ...item,
                              ...(isW ? { weight: retQty } : { quantity: retQty }),
                            };
                          })
                          .filter(Boolean) as typeof order.items;
                        if (selectedItems.length === 0) {
                          Alert.alert("خطأ", "يرجى اختيار صنف واحد على الأقل");
                          return;
                        }
                        if (!returnReason.trim()) {
                          Alert.alert("خطأ", "يرجى كتابة سبب الاسترجاع");
                          return;
                        }
                        setSubmittingReturn(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        await addReturnRequest({
                          id: `ret_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                          orderId: order.id,
                          userId: user?.id ?? "",
                          userName: user?.name ?? "",
                          userPhone: user?.phone ?? "",
                          items: selectedItems,
                          reason: returnReason.trim(),
                          status: "pending",
                          createdAt: new Date().toISOString(),
                          ...(returnInvoiceImage ? { invoiceImage: returnInvoiceImage } : {}),
                        });
                        setSubmittingReturn(false);
                        setShowReturnForm(false);
                        setReturnReason("");
                        setReturnSelectedItems({});
                        setReturnItemWeights({});
                        setReturnInvoiceImage(null);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert("تم", "تم إرسال طلب الاسترجاع وسيتم مراجعته");
                      }}
                      style={{ flex: 1 }}
                    />
                    <Pressable
                      onPress={() => { setShowReturnForm(false); setReturnReason(""); setReturnSelectedItems({}); setReturnItemWeights({}); setReturnInvoiceImage(null); }}
                      style={[styles.msgCancelBtn, { borderColor: colors.border, borderRadius: colors.radius - 4 }]}
                    >
                      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>إلغاء</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          );
        })()}

        {isAdmin && (
          <Pressable
            onPress={() =>
              Alert.alert(
                "حذف نهائي",
                `هل أنت متأكد من حذف الطلب #${order.id.slice(0, 8)} نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`,
                [
                  { text: "إلغاء", style: "cancel" },
                  {
                    text: "حذف نهائياً",
                    style: "destructive",
                    onPress: () => {
                      deleteOrder(order.id);
                      router.back();
                    },
                  },
                ]
              )
            }
            style={[styles.deleteBtn, { borderColor: "#C0392B44", backgroundColor: "#C0392B11" }]}
          >
            <Icon name="trash-2" size={14} color="#C0392B" />
            <Text style={[styles.deleteBtnText, { color: "#C0392B", fontFamily: "Inter_500Medium" }]}>
              حذف الطلب نهائياً
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {order.invoiceImage && (
        <Modal visible={showInvoiceImage} transparent animationType="fade" onRequestClose={() => setShowInvoiceImage(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" }}>
            <Pressable
              onPress={() => setShowInvoiceImage(false)}
              style={{ position: "absolute", top: insets.top + 16, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="x" size={22} color="#fff" />
            </Pressable>
            <Image
              source={{ uri: order.invoiceImage }}
              style={{ width: "92%", height: "70%", borderRadius: 12 }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 16 },
  statusCard: {
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  statusLabel: { fontSize: 18 },
  orderDate: { fontSize: 13 },
  stepsRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    paddingHorizontal: 8,
  },
  step: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: {
    fontSize: 10,
    textAlign: "center",
    lineHeight: 14,
  },
  stepLine: {
    height: 2,
    flex: 1,
    marginTop: 11,
    marginHorizontal: -4,
  },
  customerInfo: { padding: 16, gap: 10, borderWidth: 1 },
  infoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  infoText: { fontSize: 14 },
  itemsSection: { borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 15, padding: 14, textAlign: "right" },
  orderItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  orderItemRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
  },
  orderItemInfo: { gap: 2 },
  orderItemName: { fontSize: 14 },
  orderItemColor: { fontSize: 12 },
  orderItemLeft: { alignItems: "flex-end" },
  orderItemPrice: { fontSize: 15 },
  orderItemQty: { fontSize: 15 },
  notesCard: { borderWidth: 1, padding: 16, gap: 8 },
  notesText: { fontSize: 13, textAlign: "right", lineHeight: 20 },
  totalCard: { borderWidth: 1, padding: 16 },
  invoiceCard: { borderWidth: 1, padding: 16, gap: 4 },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 16 },
  totalPrice: { fontSize: 24 },
  salesContact: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  contactCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  paymentMethodCard: {
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  paymentMethodRow: {
    flexDirection: "row-reverse" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  paymentMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  assignedCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
  },
  assignedText: { fontSize: 14 },
  lockedMsg: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
  },
  editableBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  editableCustomerCard: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  editableCustomerHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  browseAlternativeBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionRow: {
    flexDirection: "row-reverse",
    gap: 10,
    alignItems: "center",
  },
  prevBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  prevBtnText: { fontSize: 13 },
  deleteBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 4,
  },
  deleteBtnText: { fontSize: 13 },
  msgSection: { borderWidth: 1, padding: 14 },
  msgToggleBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  msgToggleBtnText: { fontSize: 14 },
  msgInputContainer: { gap: 10 },
  msgLabel: { fontSize: 14, textAlign: "right" },
  msgInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: "top",
  },
  msgBtnRow: { flexDirection: "row-reverse", gap: 10 },
  msgCancelBtn: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  msgSendBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: "center",
  },
  returnStatusCard: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderWidth: 1,
  },
  returnBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1,
  },
  returnExpired: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  returnFormCard: {
    borderWidth: 1,
    padding: 16,
  },
  returnInput: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: "top",
    marginTop: 12,
  },
});
