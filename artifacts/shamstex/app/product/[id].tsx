import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Image,
  Modal,
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
import { useCartPulse } from "@/hooks/useCartPulse";
import GoldButton from "@/components/GoldButton";
import GoldHeader from "@/components/GoldHeader";

const KG_STEP = 0.5;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, user, cart, addToCart, showToast, effectivePriceMode, favorites, toggleFavorite } = useApp();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartPulse = useCartPulse(cartCount);

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const imgScrollRef = useRef<ScrollView>(null);
  const viewerScrollRef = useRef<ScrollView>(null);
  const product = products.find((p) => p.id === id);

  const [selectedColors, setSelectedColors] = useState<Record<string, number>>({});
  const [colorWeights, setColorWeights] = useState<Record<string, number>>({});
  const [weightTexts, setWeightTexts] = useState<Record<string, string>>({});
  const [orderType, setOrderType] = useState<"weight" | "pieces">("pieces");
  const [imgIdx, setImgIdx] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);
  const imgWidth = windowWidth - 32;

  const confirmLeave = React.useCallback(() => {
    const has =
      Object.values(selectedColors).some((v) => v > 0) ||
      Object.values(colorWeights).some((v) => v > 0);
    if (!has) {
      router.back();
      return;
    }
    Alert.alert(
      "تنبيه",
      "اختياراتك من هذا المنتج لن تحفظ",
      [
        { text: "استمرار", style: "cancel" },
        { text: "تأكيد الخروج", style: "destructive", onPress: () => router.back() },
      ]
    );
  }, [selectedColors, colorWeights]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave]);

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

  useEffect(() => {
    if (!viewerVisible) return;
    const t = setTimeout(() => {
      viewerScrollRef.current?.scrollTo({ x: viewerIdx * windowWidth, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [viewerVisible, viewerIdx, windowWidth]);

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
    effectivePriceMode === "wholesale" ? product.wholesalePrice : product.retailPrice;

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
          unit: product.unit,
        };
      });
      items.forEach(addToCart);
    } else {
      if (weightColorCount === 0 || totalWeight === 0) {
        Alert.alert("تنبيه", "الرجاء تحديد الوزن لكل لون");
        return;
      }
      const minWeight = product.unit === "meter" ? 100 : 20;
      const unitName = product.unit === "meter" ? "متر" : "كغ";
      const belowMin = Object.entries(colorWeights).filter(([_, w]) => w > 0 && w < minWeight);
      if (belowMin.length > 0) {
        const names = belowMin.map(([c, w]) => `${c}: ${w} ${unitName}`).join("\n");
        Alert.alert("الحد الأدنى", `الحد الأدنى للطلب هو ${minWeight} ${unitName} لكل لون\n\n${names}`);
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
            unit: product.unit,
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
      <View
        style={[
          styles.colorsDropdown,
          {
            backgroundColor: colors.surface,
            borderColor: colors.gold,
            borderRadius: colors.radius - 4,
          },
        ]}
      >
        <Icon name="layers" size={18} color={colors.gold} />
        <Text style={[styles.dropdownText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
          {orderType === "weight"
            ? weightColorCount > 0
              ? `${weightColorCount} لون — ${totalWeight} ${unitLabel}`
              : "اختر الألوان والوزن"
            : selectedColorCount > 0
            ? `${selectedColorCount} لون مختار`
            : "اختر الألوان"}
        </Text>
      </View>

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
                      onPress={() => addColorWeight(color.name)}
                      style={[styles.qtyBtn, { backgroundColor: colors.gold }]}
                    >
                      <Icon name="plus" size={14} color={colors.background} />
                    </Pressable>
                    <TextInput
                      style={[styles.weightInput, {
                        color: w > 0 ? colors.gold : colors.mutedForeground,
                        backgroundColor: colors.input,
                        borderColor: w > 0 ? colors.gold + "55" : colors.border,
                        fontFamily: "Inter_700Bold",
                      }]}
                      value={weightTexts[color.name] !== undefined ? weightTexts[color.name] : (w > 0 ? String(w) : "")}
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="decimal-pad"
                      textAlign="center"
                      onChangeText={(text) => {
                        if (!/^\d*\.?\d*$/.test(text)) return;
                        setWeightTexts((prev) => ({ ...prev, [color.name]: text }));
                        if (text === "" || text === "0" || text === "0.") {
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
                      onBlur={() => setWeightTexts((prev) => { const n = { ...prev }; delete n[color.name]; return n; })}
                    />
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
                  </View>
                  <View style={styles.colorRowRight}>
                    <Text style={[styles.colorName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                      {color.name}
                    </Text>
                    <View style={[styles.colorRing, w > 0 && { borderColor: colors.gold }]}>
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
                  <Pressable
                    onPress={() => addColorPiece(color.name)}
                    style={[styles.qtyBtn, { backgroundColor: colors.gold }]}
                  >
                    <Icon name="plus" size={14} color={colors.background} />
                  </Pressable>
                  {qty > 0 ? (
                    <>
                      <Text style={[styles.qtyText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                        {qty}
                      </Text>
                      <Pressable
                        onPress={() => removeColorPiece(color.name)}
                        style={[styles.qtyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      >
                        <Icon name="minus" size={14} color={colors.gold} />
                      </Pressable>
                    </>
                  ) : null}
                </View>
                <View style={styles.colorRowRight}>
                  <Text style={[styles.colorName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                    {color.name}
                  </Text>
                  <View style={[styles.colorRing, qty > 0 && { borderColor: colors.gold }]}>
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
              </View>
            );
          })}
        </View>

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
        onBack={confirmLeave}
        rightElement={
          <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 14 }}>
            {user ? (
              <Pressable
                onPress={() => toggleFavorite(product.id)}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
              >
                <Icon
                  name="heart"
                  size={22}
                  color={favorites.includes(product.id) ? "#E74C3C" : colors.foreground}
                />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push("/cart")}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
            >
              <Animated.View style={{ transform: [{ scale: cartPulse }] }}>
                <Icon name="shopping-cart" size={22} color={colors.foreground} />
                {cartCount > 0 && (
                  <View
                    style={{
                      position: "absolute",
                      top: -6,
                      left: -8,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      paddingHorizontal: 3,
                      backgroundColor: "#E74C3C",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" }}>
                      {cartCount > 9 ? "9+" : cartCount}
                    </Text>
                  </View>
                )}
              </Animated.View>
            </Pressable>
          </View>
        }
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
                <Pressable
                  key={i}
                  onPress={() => {
                    setViewerIdx(i);
                    setViewerVisible(true);
                  }}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: imgWidth, height: 220 }}
                    resizeMode="cover"
                  />
                </Pressable>
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
                ثوب
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
                {product.unit === "kilo" ? "وزن" : "أمتار"}
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
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  style={[styles.piecesNoteText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
                >
                  {product.unit === "meter" ? "الأمتار التقديرية" : "الوزن التقديري"}: {totalPieces * (product.unit === "meter" ? 100 : 20)} {product.unit === "meter" ? "متر" : "كغ"} — السعر التقديري: ≈ {totalPieces * (product.unit === "meter" ? 100 : 20) * displayPrice} ج.م
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }}>
                  ({product.unit === "meter" ? "100 متر" : "20 كغ"} لكل ثوب)
                </Text>
              </View>
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

      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerBackdrop}>
          <Pressable
            style={[styles.viewerClose, { top: insets.top + 12 }]}
            onPress={() => setViewerVisible(false)}
            hitSlop={12}
          >
            <Icon name="x" size={24} color="#fff" />
          </Pressable>
          <ScrollView
            ref={viewerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onLayout={() =>
              viewerScrollRef.current?.scrollTo({ x: viewerIdx * windowWidth, animated: false })
            }
          >
            {(product.images ?? []).map((uri, i) => (
              <Pressable
                key={i}
                style={{ width: windowWidth, height: windowHeight, justifyContent: "center" }}
                onPress={() => setViewerVisible(false)}
              >
                <Image
                  source={{ uri }}
                  style={{ width: windowWidth, height: windowHeight }}
                  resizeMode="contain"
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  viewerClose: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
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
  colorRing: {
    padding: 2,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
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
    fontSize: 16,
    width: 104,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
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
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  piecesNoteText: { fontSize: 12, textAlign: "right" },
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
