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
import { router, useLocalSearchParams } from "expo-router";
import Icon from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { persistImageUris } from "@/utils/persistImage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, ColorOption, ProductUnit } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function EditProductScreen() {
  useAdminGuard("edit_products");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, setProducts, settings } = useApp();

  const product = products.find((p) => p.id === id);

  const CATEGORIES = settings.categories.filter((c) => c !== "الكل");

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? CATEGORIES[0] ?? "");
  const [subcategory, setSubcategory] = useState(product?.subcategory ?? "");
  const [retailPrice, setRetailPrice] = useState(String(product?.retailPrice ?? ""));
  const [wholesalePrice, setWholesalePrice] = useState(String(product?.wholesalePrice ?? ""));
  const [description, setDescription] = useState(product?.description ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [selectedColors, setSelectedColors] = useState<ColorOption[]>(product?.colors ?? []);
  const [unit, setUnit] = useState<ProductUnit>(product?.unit ?? "meter");
  const [saving, setSaving] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 56 : 16);

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>المنتج غير موجود</Text>
      </View>
    );
  }

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
    if (!result.canceled) {
      const uris = await persistImageUris(result.assets.map((a) => a.uri));
      setImages((prev) => [...prev, ...uris].slice(0, 3));
    }
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const toggleColor = (color: ColorOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColors((prev) => {
      const exists = prev.find((c) => c.name === color.name);
      if (exists) return prev.filter((c) => c.name !== color.name);
      return [...prev, color];
    });
  };

  const handleSave = async () => {
    if (!name || !retailPrice || !wholesalePrice) {
      Alert.alert("خطأ", "يرجى ملء جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    const updated = products.map((p) =>
      p.id === id
        ? {
            ...p,
            name,
            category,
            subcategory: subcategory || undefined,
            retailPrice: Number(retailPrice),
            wholesalePrice: Number(wholesalePrice),
            description,
            images,
            colors: selectedColors.length > 0 ? selectedColors : p.colors,
            unit,
          }
        : p
    );
    await setProducts(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    Alert.alert("تم", "تم تعديل المنتج بنجاح", [
      { text: "حسناً", onPress: () => router.back() },
    ]);
  };

  const allColors = settings.globalColors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="تعديل المنتج" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            الصور
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
            <Pressable
              onPress={() =>
                Alert.alert("إضافة صورة", "اختر مصدر الصورة", [
                  { text: "من المعرض", onPress: pickImage },
                  { text: "إلغاء", style: "cancel" },
                ])
              }
              style={[styles.addImageBtn, { borderColor: colors.gold + "66", backgroundColor: colors.surface }]}
            >
              <Icon name="camera" size={22} color={colors.gold} />
              <Text style={[{ color: colors.gold, fontFamily: "Inter_500Medium", fontSize: 10, textAlign: "center" }]}>
                إضافة صورة
              </Text>
            </Pressable>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                <Pressable onPress={() => removeImage(index)} style={[styles.removeImageBtn, { backgroundColor: colors.destructive }]}>
                  <Icon name="x" size={12} color="#FFF" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          {images.length === 0 && (
            <Text style={[{ color: colors.mutedForeground, fontSize: 12, textAlign: "right", fontFamily: "Inter_400Regular" }]}>
              لا توجد صور حالياً
            </Text>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            معلومات المنتج
          </Text>
          {[
            { label: "اسم المنتج *", value: name, onChange: setName },
            { label: "الوصف", value: description, onChange: setDescription },
          ].map((f) => (
            <View key={f.label} style={styles.fieldGroup}>
              <Text style={[{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular" }]}>
                {f.label}
              </Text>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                value={f.value}
                onChangeText={f.onChange}
                textAlign="right"
              />
            </View>
          ))}
          <View style={styles.fieldGroup}>
            <Text style={[{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular" }]}>
              الفئة
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: "row-reverse" }}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => { setCategory(cat); setSubcategory(""); }}
                  style={[styles.catChip, { backgroundColor: category === cat ? colors.gold : colors.surface, borderColor: category === cat ? colors.gold : colors.border }]}
                >
                  <Text style={[{ color: category === cat ? colors.background : colors.foreground, fontFamily: category === cat ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 13 }]}>
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {(settings.subcategories?.[category] ?? []).length > 0 && (
            <View style={styles.fieldGroup}>
              <Text style={[{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular" }]}>
                الفئة الفرعية
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: "row-reverse" }}>
                <Pressable
                  onPress={() => setSubcategory("")}
                  style={[styles.catChip, {
                    backgroundColor: colors.surface,
                    borderColor: subcategory === "" ? colors.mutedForeground : colors.border,
                    borderStyle: "dashed",
                  }]}
                >
                  <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }]}>
                    بدون فئة فرعية
                  </Text>
                </Pressable>
                {(settings.subcategories[category] ?? []).map((sub) => (
                  <Pressable
                    key={sub}
                    onPress={() => setSubcategory(sub)}
                    style={[styles.catChip, {
                      backgroundColor: subcategory === sub ? colors.gold + "22" : colors.surface,
                      borderColor: subcategory === sub ? colors.gold : colors.border,
                    }]}
                  >
                    <Text style={[{ color: subcategory === sub ? colors.gold : colors.foreground, fontFamily: subcategory === sub ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 13 }]}>
                      {sub}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            وحدة البيع
          </Text>
          <View style={{ flexDirection: "row-reverse", gap: 12 }}>
            {([
              { value: "meter" as ProductUnit, label: "بالمتر", icon: "maximize-2" },
              { value: "kilo" as ProductUnit, label: "بالكيلو", icon: "package" },
            ]).map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { setUnit(opt.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[{
                  flex: 1,
                  flexDirection: "row-reverse",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  backgroundColor: unit === opt.value ? colors.gold : colors.surface,
                  borderColor: unit === opt.value ? colors.gold : colors.border,
                }]}
              >
                <Icon name={opt.icon as any} size={16} color={unit === opt.value ? colors.background : colors.foreground} />
                <Text style={{ color: unit === opt.value ? colors.background : colors.foreground, fontFamily: unit === opt.value ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 14 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            الأسعار
          </Text>
          <View style={{ flexDirection: "row-reverse", gap: 12 }}>
            {[
              { label: "سعر الزبون *", value: retailPrice, onChange: setRetailPrice },
              { label: "سعر التاجر *", value: wholesalePrice, onChange: setWholesalePrice },
            ].map((f) => (
              <View key={f.label} style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular" }]}>
                  {f.label}
                </Text>
                <TextInput
                  style={[styles.textInput, { color: colors.gold, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_700Bold" }]}
                  value={f.value}
                  onChangeText={f.onChange}
                  keyboardType="decimal-pad"
                  textAlign="right"
                />
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            الألوان ({selectedColors.length} مختار)
          </Text>
          <View style={styles.colorGrid}>
            {allColors.map((color) => {
              const selected = selectedColors.some((c) => c.name === color.name);
              return (
                <Pressable
                  key={color.name}
                  onPress={() => toggleColor(color)}
                  style={[styles.colorOption, { backgroundColor: selected ? colors.gold + "22" : colors.surface, borderColor: selected ? colors.gold : colors.border }]}
                >
                  <View style={[styles.colorSwatch, { backgroundColor: color.hex, borderColor: colors.border }]} />
                  <Text style={[{ color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 12 }]}>
                    {color.name}
                  </Text>
                  {selected && <Icon name="check" size={12} color={colors.gold} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad, position: "absolute", bottom: 0, left: 0, right: 0 }]}>
        <GoldButton label="حفظ التعديلات" onPress={handleSave} loading={saving} style={{ flex: 1 }} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  section: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 15, textAlign: "right" },
  imagesRow: { gap: 10, flexDirection: "row-reverse" },
  addImageBtn: { width: 80, height: 80, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  imageThumb: { width: 80, height: 80, borderRadius: 10, overflow: "hidden" },
  thumbImage: { width: 80, height: 80 },
  removeImageBtn: { position: "absolute", top: 4, left: 4, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fieldGroup: { gap: 6 },
  textInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  colorGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  colorOption: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, gap: 6 },
  colorSwatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
