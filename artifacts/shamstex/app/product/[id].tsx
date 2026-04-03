import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Icon from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, CartItem } from "@/context/AppContext";
import GoldButton from "@/components/GoldButton";
import GoldHeader from "@/components/GoldHeader";

const KG_STEP = 0.5;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, user, addToCart, showToast } = useApp();

  const { width: windowWidth } = useWindowDimensions();
  const imgScrollRef = useRef<ScrollView>(null);
  const product = products.find((p) => p.id === id);

  const [selectedColors, setSelectedColors] = useState<Record<string, number>>({});
  const [colorWeights, setColorWeights] = useState<Record<string, number>>({});
  const [orderType, setOrderType] = useState<"weight" | "pieces">("pieces");
  const [imgIdx, setImgIdx] = useState(0);
  const [showColors, setShowColors] = useState(true);
  const imgWidth = windowWidth - 32;

  useEffect(() => {
    const imgs = product?.images ?? [];
    if (imgs.length < 2) return;
    const timer = setInterval(() => {
      setImgIdx((prev) => {
        const next = (prev + 1) % imgs.length;
        imgScrollRef.current?.scrollTo({ x: next * imgWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [product?.images?.length, imgWidth]);

  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 16 : 16);

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
  const selectedColorCount = Object.keys(selectedColors).length;

  const totalWeight = Object.values(colorWeights).reduce((a, b) => a + b, 0);
  const weightColorCount = Object.keys(colorWeights).filter((k) => colorWeights[k] > 0).length;

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

  const addColorWeight = (colorName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setColorWeights((prev) => ({
      ...prev,
      [colorName]: parseFloat(((prev[colorName] ?? 0) + KG_STEP).toFixed(1)),
    }));
  };

  const removeColorWeight = (colorName: string) => {
    setColorWeights((prev) => {
      const current = prev[colorName] ?? 0;
      if (current <= KG_STEP) {
        const next = { ...prev };
        delete next[colorName];
        return next;
      }
      return {
        ...prev,
        [colorName]: parseFloat((current - KG_STEP).toFixed(1)),
      };
    });
  };

  const isStaff = user?.role === "admin" || user?.role === "employee" || user?.role === "supervisor";

  const handleAddToCart = () => {
    if (isStaff) {
      Alert.alert("للعرض فقط", "أعضاء فريق العمل يمكنهم عرض المنتجات فقط ولا يمكنهم الطلب.");
      return;
    }
    if (orderType === "pieces") {
      if (selectedColorCount === 0 || totalPieces === 0) {
        Alert.alert("تنبيه", "الرجاء اختيار لون وتحديد الكمية");
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
          orderType: "pieces",
        };
      });
      items.forEach(addToCart);
    } else {
      if (weightColorCount === 0 || totalWeight === 0) {
        Alert.alert("تنبيه", "الرجاء تحديد الوزن لكل لون");
        return;
      }
      const items: CartItem[] = Object.entries(colorWeights)
        .filter(([_, w]) => w > 0)
        .map(([colorName, w]) => {
          const colorInfo = product.colors.find((c) => c.name === colorName);
          return {
            productId: product.id,
            productName: product.name,
            colorName,
            colorHex: colorInfo?.hex ?? "#CCCCCC",
            quantity: 1,
            unitPrice: displayPrice,
            orderType: "weight",
            weight: w,
          };
        });
      items.forEach(addToCart);
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
    showToast("تمت الإضافة إلى السلة ✓");
  };

  const unitLabel = product.unit === "kilo" ? "كيلو" : "متر";

  const colorsSection = (
    <View style={styles.colorsSection}>
      <Pressable
        onPress={() => setShowColors(!showColors)}
        style={[
          styles.colorsDropdown,
          {
            backgroundColor: colors.surface,
            borderColor: showColors ? colors.gold : colors.border,
            borderRadius: colors.radius - 4,
          },
        ]}
      >
        <Icon
          name={showColors ? "chevron-up" : "chevron-down"}
          size={18}
          color={showColors ? colors.gold : colors.mutedForeground}
        />
        <Text style={[styles.dropdownText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
          {orderType === "weight"
            ? weightColorCount > 0
              ? `${weightColorCount} لون — ${totalWeight} ${unitLabel}`
              : "اختر الألوان والوزن"
            : selectedColorCount > 0
            ? `${selectedColorCount} لون مختار`
            : "اختر الألوان"}
        </Text>
      </Pressable>

      {showColors && (
        <View
          style={[
            styles.colorsList,
            { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 },
          ]}
        >
          {product.colors.map((color, idx) => {
            const isLast = idx === product.colors.length - 1;

            if (orderType === "weight") {
              const w = colorWeights[color.name] ?? 0;
              return (
                <View
                  key={color.name}
                  style={[
                    styles.colorRow,
                    { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 },
                  ]}
                >
                  <View style={styles.colorRowLeft}>
                    <Pressable
                      onPress={() => removeColorWeight(color.name)}
                      disabled={w === 0}
                      style={[
                        styles.qtyBtn,
                        {
                          backgroundColor: w > 0 ? colors.surface : colors.surface + "55",
                          borderColor: colors.border,
                          opacity: w > 0 ? 1 : 0.4,
                        },
                      ]}
                    >
                      <Icon name="minus" size={14} color={colors.gold} />
                    </Pressable>
                    <TextInput
                      style={[styles.weightInput, {
                        color: w > 0 ? colors.gold : colors.mutedForeground,
                        backgroundColor: colors.input,
                        borderColor: w > 0 ? colors.gold + "55" : colors.border,
                        fontFamily: "Inter_700Bold",
                      }]}
                      value={w > 0 ? String(w) : ""}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="decimal-pad"
                      textAlign="center"
                      onChangeText={(text) => {
                        if (text === "" || text === "0") {
                          setColorWeights((prev) => {
                            const next = { ...prev };
                            delete next[color.name];
                            return next;
                          });
                          return;
                        }
                        const val = parseFloat(text);
                        if (!isNaN(val) && val > 0) {
                          setColorWeights((prev) => ({ ...prev, [color.name]: val }));
                        }
                      }}
                    />
                    <Pressable
                      onPress={() => addColorWeight(color.name)}
                      style={[styles.qtyBtn, { backgroundColor: colors.gold }]}
                    >
                      <Icon name="plus" size={14} color={colors.background} />
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
            }

            const qty = selectedColors[color.name] ?? 0;
            return (
              <View
                key={color.name}
                style={[
                  styles.colorRow,
                  { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 },
                ]}
              >
                <View style={styles.colorRowLeft}>
                  {qty > 0 ? (
                    <>
                      <Pressable
                        onPress={() => removeColorPiece(color.name)}
                        style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Icon name="minus" size={14} color={colors.gold} />
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
                    <Icon name="plus" size={14} color={colors.background} />
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

      {orderType === "weight" && totalWeight > 0 && (
        <View
          style={[
            styles.weightTotalBox,
            { backgroundColor: colors.gold + "11", borderColor: colors.gold + "33", borderRadius: colors.radius - 4 },
          ]}
        >
          <Text style={[styles.weightTotalLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            إجمالي الوزن
          </Text>
          <Text style={[styles.weightTotalValue, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            {totalWeight} {unitLabel}
          </Text>
          <Text style={[styles.weightTotalPrice, { color: colors.gold, fontFamily: "Inter_600SemiBold" }]}>
            ≈ {(displayPrice * totalWeight).toFixed(0)} ج.م
          </Text>
        </View>
      )}
    </View>
  );

  const addBtnLabel =
    orderType === "weight"
      ? weightColorCount > 0 && totalWeight > 0
        ? `إضافة للسلة — ${(displayPrice * totalWeight).toFixed(0)} ج.م`
        : "حدد المطلوب من كل لون"
      : totalPieces > 0
      ? `إضافة ${totalPieces} أثواب للسلة`
      : "اختر الألوان والكميات";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader
        title={product.name}
        subtitle={product.category}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {product.images && product.images.length > 0 ? (
          <View style={[styles.imageCarousel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ScrollView
              ref={imgScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(e) => {
                const offset = e.nativeEvent.contentOffset.x;
                const idx = Math.round(offset / imgWidth);
                setImgIdx(idx);
              }}
              style={{ flex: 1, height: 220 }}
            >
              {product.images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: imgWidth, height: 220 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
            {product.images.length > 1 && (
              <View style={styles.imageDots} pointerEvents="none">
                {product.images.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.imageDot,
                      { backgroundColor: i === imgIdx ? colors.gold : "rgba(255,255,255,0.5)" },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="layers" size={60} color={colors.goldDark} />
            <Text style={[styles.category, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
              {product.category}
            </Text>
          </View>
        )}

        <View style={styles.priceSection}>
          <View>
            <Text
              style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            >
              {user?.role === "merchant" ? "سعر الجملة" : "السعر"}
            </Text>
            <Text style={[styles.price, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
              {displayPrice} ج.م / {product.unit === "kilo" ? "كيلو" : "متر"}
            </Text>
          </View>
          {product.description && (
            <Text
              style={[styles.desc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            >
              {product.description}
            </Text>
          )}
        </View>

        {!product.inStock && (
          <View
            style={[
              styles.outOfStockBanner,
              { backgroundColor: "#C0392B22", borderColor: "#C0392B66" },
            ]}
          >
            <Icon name="x-circle" size={20} color="#C0392B" />
            <Text style={[styles.outOfStockBannerText, { fontFamily: "Inter_700Bold" }]}>
              هذا المنتج نفذ من المخزون
            </Text>
          </View>
        )}

        {product.inStock && (
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
          >
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
                {product.unit === "kilo" ? "بالكيلو" : "بالمتر"}
              </Text>
            </Pressable>
          </View>

          {colorsSection}

          {orderType === "pieces" && totalPieces > 0 && (
            <View
              style={[
                styles.piecesNote,
                {
                  backgroundColor: colors.gold + "11",
                  borderColor: colors.gold + "33",
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Icon name="info" size={14} color={colors.gold} />
              <Text
                style={[styles.piecesNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              >
                الرجاء التواصل مع مسؤول المبيعات لتأكيد السعر
              </Text>
            </View>
          )}
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
            bottom: 0,
            left: 0,
            right: 0,
            position: "absolute",
          },
        ]}
      >
        {product.inStock ? (
          <GoldButton
            label={addBtnLabel}
            onPress={handleAddToCart}
            style={{ flex: 1 }}
            size="lg"
          />
        ) : (
          <View style={[styles.outOfStockFooterBtn, { backgroundColor: "#C0392B22", borderColor: "#C0392B66" }]}>
            <Icon name="x-circle" size={18} color="#C0392B" />
            <Text style={[styles.outOfStockFooterText, { fontFamily: "Inter_700Bold" }]}>
              غير متوفر — نفذ المخزون
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 16, padding: 16 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  imageCarousel: {
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  imageDots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  imageDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
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
  section: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 16, textAlign: "right" },
  orderTypeRow: { flexDirection: "row-reverse", gap: 10 },
  typeBtn: { paddingVertical: 12, alignItems: "center", borderWidth: 1 },
  typeBtnText: { fontSize: 14 },
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
  colorsList: { borderWidth: 1, overflow: "hidden" },
  colorRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  colorRowRight: { flexDirection: "row-reverse", alignItems: "center", gap: 8, flex: 1 },
  colorRowLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  colorSwatch: { width: 24, height: 24, borderRadius: 12 },
  colorName: { fontSize: 13, flex: 1, textAlign: "right" },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qtyText: { fontSize: 15, minWidth: 22, textAlign: "center" },
  weightInput: {
    fontSize: 14,
    width: 64,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    textAlignVertical: "center",
  },
  weightTotalBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  weightTotalLabel: { fontSize: 12 },
  weightTotalValue: { fontSize: 16, flex: 1, textAlign: "center" },
  weightTotalPrice: { fontSize: 15 },
  piecesNote: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  piecesNoteText: { fontSize: 12, flex: 1, textAlign: "right" },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1 },
  outOfStockBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  outOfStockBannerText: {
    color: "#C0392B",
    fontSize: 15,
    flex: 1,
    textAlign: "right",
  },
  outOfStockFooterBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  outOfStockFooterText: {
    color: "#C0392B",
    fontSize: 15,
  },
});
