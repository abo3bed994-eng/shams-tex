import React, { useState } from "react";
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
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, ColorOption } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

const PRESET_COLORS: ColorOption[] = [
  { name: "أبيض", hex: "#FFFFFF", quantity: 50 },
  { name: "أسود", hex: "#0A0A0A", quantity: 50 },
  { name: "ذهبي", hex: "#C9A84C", quantity: 30 },
  { name: "أحمر", hex: "#C0392B", quantity: 25 },
  { name: "أزرق", hex: "#2980B9", quantity: 30 },
  { name: "أخضر", hex: "#27AE60", quantity: 25 },
  { name: "بيج", hex: "#F5F0E0", quantity: 40 },
  { name: "رمادي", hex: "#888880", quantity: 35 },
  { name: "وردي", hex: "#FADBD8", quantity: 20 },
  { name: "بنفسجي", hex: "#6C3483", quantity: 20 },
];

const CATEGORIES = ["حرير", "قطن", "ساتان", "كتان", "فيلفيت", "شيفون", "أخرى"];

export default function AddProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, setProducts } = useApp();

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [retailPrice, setRetailPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>([]);
  const [loading, setLoading] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const toggleColor = (color: ColorOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColors((prev) => {
      const exists = prev.find((c) => c.name === color.name);
      if (exists) return prev.filter((c) => c.name !== color.name);
      return [...prev, color];
    });
  };

  const handleSave = async () => {
    if (!name || !retailPrice || !wholesalePrice || selectedColors.length === 0) {
      Alert.alert("خطأ", "الرجاء إكمال البيانات واختيار ألوان على الأقل");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));

    const newProduct = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
      name,
      images: [],
      retailPrice: Number(retailPrice),
      wholesalePrice: Number(wholesalePrice),
      category,
      colors: selectedColors,
      description,
      inStock: true,
    };

    await setProducts([newProduct, ...products]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    Alert.alert("تم", "تمت إضافة المنتج بنجاح", [
      { text: "إضافة آخر", onPress: () => {
        setName(""); setRetailPrice(""); setWholesalePrice(""); setDescription(""); setSelectedColors([]);
      }},
      { text: "الرجوع", onPress: () => router.back() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="إضافة منتج جديد" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            معلومات الخامة
          </Text>

          {[
            { label: "اسم الخامة", value: name, onChange: setName, placeholder: "مثال: حرير طبيعي فاخر" },
            { label: "الوصف", value: description, onChange: setDescription, placeholder: "وصف مختصر للخامة" },
          ].map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {field.label}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    borderRadius: colors.radius - 4,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
                value={field.value}
                onChangeText={field.onChange}
                placeholder={field.placeholder}
                placeholderTextColor={colors.mutedForeground}
                textAlign="right"
              />
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              الفئة
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catsRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor: category === cat ? colors.gold : colors.surface,
                      borderColor: category === cat ? colors.gold : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catText,
                      {
                        color: category === cat ? colors.background : colors.foreground,
                        fontFamily: category === cat ? "Inter_600SemiBold" : "Inter_400Regular",
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            الأسعار
          </Text>
          <View style={styles.pricesRow}>
            {[
              { label: "سعر الزبون", value: retailPrice, onChange: setRetailPrice },
              { label: "سعر التاجر", value: wholesalePrice, onChange: setWholesalePrice },
            ].map((field) => (
              <View key={field.label} style={styles.priceField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {field.label}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.gold,
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                      borderRadius: colors.radius - 4,
                      fontFamily: "Inter_700Bold",
                    },
                  ]}
                  value={field.value}
                  onChangeText={field.onChange}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  textAlign="right"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            الألوان المتاحة ({selectedColors.length} مختار)
          </Text>
          <View style={styles.colorGrid}>
            {PRESET_COLORS.map((color) => {
              const selected = selectedColors.some((c) => c.name === color.name);
              return (
                <Pressable
                  key={color.name}
                  onPress={() => toggleColor(color)}
                  style={({ pressed }) => [
                    styles.colorOption,
                    {
                      backgroundColor: selected ? colors.gold + "22" : colors.surface,
                      borderColor: selected ? colors.gold : colors.border,
                      borderRadius: colors.radius - 4,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={[styles.colorSwatchSmall, { backgroundColor: color.hex, borderColor: colors.border }]} />
                  <Text style={[styles.colorOptionText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                    {color.name}
                  </Text>
                  {selected && <Feather name="check" size={12} color={colors.gold} />}
                </Pressable>
              );
            })}
          </View>
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
          label="إضافة المنتج"
          onPress={handleSave}
          loading={loading}
          style={{ flex: 1 }}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  section: { padding: 16, borderWidth: 1, gap: 14 },
  sectionTitle: { fontSize: 15, textAlign: "right" },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, textAlign: "right" },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  catsRow: { gap: 8, flexDirection: "row-reverse" },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catText: { fontSize: 13 },
  pricesRow: { flexDirection: "row-reverse", gap: 12 },
  priceField: { flex: 1, gap: 6 },
  colorGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  colorOption: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    gap: 6,
  },
  colorSwatchSmall: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  colorOptionText: { fontSize: 12 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
