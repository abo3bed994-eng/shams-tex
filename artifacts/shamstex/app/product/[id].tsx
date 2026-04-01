import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, CartItem } from "@/context/AppContext";
import GoldButton from "@/components/GoldButton";
import GoldHeader from "@/components/GoldHeader";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, user, addToCart } = useApp();

  const product = products.find((p) => p.id === id);
  const [selectedColors, setSelectedColors] = useState<Record<string, number>>({});
  const [orderType, setOrderType] = useState<"weight" | "pieces">("pieces");
  const [weight, setWeight] = useState(1);
  const [showColors, setShowColors] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GoldHeader title="المنتج" onBack={() => router.back()} />
        <View style={styles.notFound}>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            المنتج غير موجود
          </Text>
        </View>
      </View>
    );
  }

  const displayPrice =
    user?.role === "merchant" || user?.role === "admin"
      ? product.wholesalePrice
      : product.retailPrice;

  const totalPieces = Object.values(selectedColors).reduce((a, b) => a + b, 0);
  const totalPrice =
    orderType === "weight" ? displayPrice * weight : null;

  const addColorPiece = (colorName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColors((prev) => ({ ...prev, [colorName]: (prev[colorName] ?? 0) + 1 }));
  };

  const removeColorPiece = (colorName: string) => {
    setSelectedColors((prev) => {
      const current = prev[colorName] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[colorName];
        return next;
      }
      return { ...prev, [colorName]: current - 1 };
    });
  };

  const handleAddToCart = () => {
    if (orderType === "pieces" && totalPieces === 0) {
      Alert.alert("تنبيه", "الرجاء اختيار ألوان وكميات");
      return;
    }

    const items: CartItem[] = Object.entries(selectedColors).map(([colorName, qty]) => {
      const colorInfo = product.colors.find((c) => c.name === colorName);
      return {
        productId: product.id,
        productName: product.name,
        colorName,
        colorHex: colorInfo?.hex ?? "#CCCCCC",
        quantity: qty,
        unitPrice: displayPrice,
        orderType,
        weight: orderType === "weight" ? weight : undefined,
      };
    });

    if (items.length === 0 && orderType === "weight") {
      addToCart({
        productId: product.id,
        productName: product.name,
        colorName: "بدون تحديد لون",
        colorHex: colors.gold,
        quantity: 1,
        unitPrice: displayPrice,
        orderType: "weight",
        weight,
      });
    } else {
      items.forEach(addToCart);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("تم", "تمت الإضافة إلى السلة", [
      { text: "متابعة التسوق" },
      { text: "الذهاب للسلة", onPress: () => router.push("/cart") },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader
        title={product.name}
        subtitle={product.category}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 120 }]}
      >
        <View
          style={[
            styles.imagePlaceholder,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather name="layers" size={60} color={colors.goldDark} />
          <Text style={[styles.category, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
            {product.category}
          </Text>
        </View>

        <View style={styles.priceSection}>
          <View>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {user?.role === "merchant" ? "سعر الجملة" : "السعر"}
            </Text>
            <Text style={[styles.price, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
              {displayPrice} ج.م / متر
            </Text>
          </View>
          {product.description && (
            <Text style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {product.description}
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            طريقة الطلب
          </Text>
          <View style={styles.orderTypeRow}>
            <Pressable
              onPress={() => setOrderType("pieces")}
              style={({ pressed }) => [
                styles.typeBtn,
                {
                  flex: 1,
                  backgroundColor: orderType === "pieces" ? colors.gold : colors.surface,
                  borderColor: orderType === "pieces" ? colors.gold : colors.border,
                  borderRadius: colors.radius - 4,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  {
                    color: orderType === "pieces" ? colors.background : colors.foreground,
                    fontFamily: orderType === "pieces" ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                بالثوب
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setOrderType("weight")}
              style={({ pressed }) => [
                styles.typeBtn,
                {
                  flex: 1,
                  backgroundColor: orderType === "weight" ? colors.gold : colors.surface,
                  borderColor: orderType === "weight" ? colors.gold : colors.border,
                  borderRadius: colors.radius - 4,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBtnText,
                  {
                    color: orderType === "weight" ? colors.background : colors.foreground,
                    fontFamily: orderType === "weight" ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                بالكيلو
              </Text>
            </Pressable>
          </View>

          {orderType === "weight" ? (
            <View style={styles.weightSection}>
              <Text style={[styles.weightLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                الوزن بالكيلو
              </Text>
              <View style={styles.weightControls}>
                <Pressable
                  onPress={() => setWeight((w) => Math.max(1, w - 1))}
                  style={[styles.counterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Feather name="minus" size={18} color={colors.gold} />
                </Pressable>
                <Text style={[styles.weightValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {weight} كغ
                </Text>
                <Pressable
                  onPress={() => setWeight((w) => w + 1)}
                  style={[styles.counterBtn, { backgroundColor: colors.gold }]}
                >
                  <Feather name="plus" size={18} color={colors.background} />
                </Pressable>
              </View>
              <Text style={[styles.calcPrice, { color: colors.gold, fontFamily: "Inter_600SemiBold" }]}>
                الإجمالي: {displayPrice * weight} ج.م
              </Text>
            </View>
          ) : (
            <View style={styles.colorsSection}>
              <Pressable
                onPress={() => setShowColors(!showColors)}
                style={[
                  styles.colorsDropdown,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                  },
                ]}
              >
                <Feather
                  name={showColors ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.dropdownText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {totalPieces > 0 ? `${totalPieces} أثواب مختارة` : "اختر الألوان"}
                </Text>
              </Pressable>

              {showColors && (
                <View style={[styles.colorsList, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
                  {product.colors.map((color) => {
                    const qty = selectedColors[color.name] ?? 0;
                    return (
                      <View
                        key={color.name}
                        style={[styles.colorRow, { borderBottomColor: colors.border }]}
                      >
                        <View style={styles.colorRowLeft}>
                          {qty > 0 ? (
                            <>
                              <Pressable
                                onPress={() => removeColorPiece(color.name)}
                                style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                              >
                                <Feather name="minus" size={14} color={colors.gold} />
                              </Pressable>
                              <Text style={[styles.qtyText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                                {qty}
                              </Text>
                            </>
                          ) : null}
                          <Pressable
                            onPress={() => addColorPiece(color.name)}
                            style={[styles.qtyBtn, { backgroundColor: colors.gold }]}
                          >
                            <Feather name="plus" size={14} color={colors.background} />
                          </Pressable>
                        </View>
                        <View style={styles.colorRowRight}>
                          <Text style={[styles.colorName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                            {color.name}
                          </Text>
                          <View
                            style={[
                              styles.colorSwatch,
                              {
                                backgroundColor: color.hex,
                                borderColor: colors.border,
                                borderWidth: color.hex === "#FFFFFF" || color.hex === "#FEFEFE" ? 1 : 0,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {totalPieces > 0 && (
                <View style={[styles.piecesNote, { backgroundColor: colors.gold + "11", borderColor: colors.gold + "33", borderRadius: colors.radius - 4 }]}>
                  <Feather name="info" size={14} color={colors.gold} />
                  <Text style={[styles.piecesNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    الرجاء التواصل مع مسؤول المبيعات لتأكيد السعر
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 16,
          },
        ]}
      >
        <GoldButton
          label={orderType === "weight" ? `إضافة للسلة - ${displayPrice * weight} ج.م` : totalPieces > 0 ? `إضافة ${totalPieces} أثواب للسلة` : "إضافة للسلة"}
          onPress={handleAddToCart}
          style={{ flex: 1 }}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16, padding: 16 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  imagePlaceholder: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  category: { fontSize: 14, letterSpacing: 1 },
  priceSection: { gap: 10 },
  priceLabel: { fontSize: 12, textAlign: "right" },
  price: { fontSize: 24, textAlign: "right" },
  desc: { fontSize: 14, textAlign: "right", lineHeight: 22 },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionTitle: { fontSize: 16, textAlign: "right" },
  orderTypeRow: { flexDirection: "row-reverse", gap: 10 },
  typeBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  typeBtnText: { fontSize: 14 },
  weightSection: { gap: 12 },
  weightLabel: { fontSize: 13, textAlign: "right" },
  weightControls: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  weightValue: { fontSize: 22, minWidth: 80, textAlign: "center" },
  calcPrice: { fontSize: 18, textAlign: "center" },
  colorsSection: { gap: 10 },
  colorsDropdown: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 10,
  },
  dropdownText: { flex: 1, fontSize: 14 },
  colorsList: {
    borderWidth: 1,
    overflow: "hidden",
  },
  colorRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  colorRowRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
  },
  colorRowLeft: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  colorSwatch: { width: 26, height: 26, borderRadius: 13 },
  colorName: { fontSize: 14 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qtyText: { fontSize: 16, minWidth: 24, textAlign: "center" },
  piecesNote: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  piecesNoteText: { fontSize: 12, flex: 1, textAlign: "right" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
