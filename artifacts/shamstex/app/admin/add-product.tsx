import React, { useState } from "react";
import {
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { persistImageUris } from "@/utils/persistImage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, ColorOption, ProductUnit } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";


export default function AddProductScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, setProducts, settings } = useApp();

  const CATEGORIES = settings.categories.filter((c) => c !== "الكل");

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0] ?? "حرير");
  const [retailPrice, setRetailPrice] = useState("");
  const [wholesalePrice, setWholesalePrice] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [unit, setUnit] = useState<"meter" | "kilo">("meter");
  const [loading, setLoading] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 56 : 16);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى معرض الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 3,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = await persistImageUris(result.assets.map((a) => a.uri));
      setImages((prev) => [...prev, ...uris].slice(0, 3));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى الكاميرا");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const [uri] = await persistImageUris([result.assets[0].uri]);
      setImages((prev) => [...prev, uri].slice(0, 5));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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
      images,
      retailPrice: Number(retailPrice),
      wholesalePrice: Number(wholesalePrice),
      category,
      colors: selectedColors,
      description,
      inStock: true,
      unit,
    };

    await setProducts([newProduct, ...products]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    Alert.alert("تم", "تمت إضافة المنتج بنجاح", [
      {
        text: "إضافة آخر",
        onPress: () => {
          setName("");
          setRetailPrice("");
          setWholesalePrice("");
          setDescription("");
          setSelectedColors([]);
          setImages([]);
        },
      },
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
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            صور المنتج
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imagesRow}
          >
            <Pressable
              onPress={() =>
                Alert.alert("إضافة صورة", "اختر مصدر الصورة", [
                  { text: "من المعرض", onPress: pickImage },
                  { text: "التقاط صورة", onPress: takePhoto },
                  { text: "إلغاء", style: "cancel" },
                ])
              }
              style={[
                styles.addImageBtn,
                { borderColor: colors.gold + "66", backgroundColor: colors.surface },
              ]}
            >
              <Feather name="camera" size={24} color={colors.gold} />
              <Text style={[styles.addImageText, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
                إضافة صورة
              </Text>
            </Pressable>

            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image
                  source={{ uri }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => removeImage(index)}
                  style={[styles.removeImageBtn, { backgroundColor: colors.destructive }]}
                >
                  <Feather name="x" size={12} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          {images.length > 0 && (
            <Text style={[styles.imageCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {images.length} / 3 صور
            </Text>
          )}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catsRow}
            >
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
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              وحدة البيع
            </Text>
            <View style={styles.unitRow}>
              {([
                { value: "meter", label: "بالمتر", icon: "maximize-2" },
                { value: "kilo", label: "بالكيلو", icon: "package" },
              ] as const).map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => { setUnit(opt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[
                    styles.unitBtn,
                    {
                      backgroundColor: unit === opt.value ? colors.gold : colors.surface,
                      borderColor: unit === opt.value ? colors.gold : colors.border,
                    },
                  ]}
                >
                  <Feather name={opt.icon} size={16} color={unit === opt.value ? colors.background : colors.foreground} />
                  <Text style={[styles.unitBtnText, { color: unit === opt.value ? colors.background : colors.foreground, fontFamily: unit === opt.value ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
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

        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            الألوان المتاحة ({selectedColors.length} مختار)
          </Text>
          <View style={styles.colorGrid}>
            {settings.globalColors.map((color) => {
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
                  <View
                    style={[
                      styles.colorSwatchSmall,
                      { backgroundColor: color.hex, borderColor: colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.colorOptionText,
                      { color: colors.foreground, fontFamily: "Inter_400Regular" },
                    ]}
                  >
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
            paddingBottom: bottomPad,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
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
  imagesRow: { gap: 10, flexDirection: "row-reverse" },
  addImageBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  addImageText: { fontSize: 10, textAlign: "center" },
  imageThumb: { width: 90, height: 90, borderRadius: 10, overflow: "hidden" },
  thumbImage: { width: 90, height: 90 },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  imageCount: { fontSize: 11, textAlign: "right" },
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
  colorGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
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
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  unitRow: { flexDirection: "row-reverse", gap: 12 },
  unitBtn: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  unitBtnText: { fontSize: 14 },
});
