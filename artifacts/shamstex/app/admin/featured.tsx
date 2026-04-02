import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

export default function AdminFeaturedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, settings, setSettings } = useApp();

  const [featuredIds, setFeaturedIds] = useState<string[]>(settings.featuredProductIds);
  const [bannerUri, setBannerUri] = useState<string | undefined>(settings.bannerImageUri);
  const [saving, setSaving] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeaturedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const pickBanner = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى معرض الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets.length > 0) {
      setBannerUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const removeBanner = () => setBannerUri(undefined);

  const handleSave = async () => {
    setSaving(true);
    await setSettings({ ...settings, featuredProductIds: featuredIds, bannerImageUri: bannerUri });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    Alert.alert("تم", "تم حفظ الإعدادات بنجاح");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="المنتجات المميزة والإعلان" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            صورة الإعلان (البنر)
          </Text>
          {bannerUri ? (
            <View style={styles.bannerPreviewWrap}>
              <Image source={{ uri: bannerUri }} style={styles.bannerPreview} resizeMode="cover" />
              <Pressable
                onPress={removeBanner}
                style={[styles.removeBanner, { backgroundColor: colors.destructive }]}
              >
                <Feather name="x" size={14} color="#FFF" />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="image" size={32} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 }]}>
                لا توجد صورة إعلان مخصصة
              </Text>
              <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11 }]}>
                (سيُستخدم الصورة الافتراضية)
              </Text>
            </View>
          )}
          <GoldButton
            label={bannerUri ? "تغيير صورة الإعلان" : "اختر صورة إعلان"}
            onPress={pickBanner}
            variant="outline"
            size="sm"
            style={{ alignSelf: "flex-end" }}
          />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            المنتجات المميزة ({featuredIds.length} مختار)
          </Text>
          <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right" }]}>
            ستظهر المنتجات المحددة في قسم "المنتجات المميزة" في الصفحة الرئيسية
          </Text>
          {products.map((product) => {
            const selected = featuredIds.includes(product.id);
            return (
              <Pressable
                key={product.id}
                onPress={() => toggle(product.id)}
                style={({ pressed }) => [
                  styles.productRow,
                  {
                    backgroundColor: selected ? colors.gold + "11" : colors.surface,
                    borderColor: selected ? colors.gold + "55" : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={[styles.checkbox, { borderColor: selected ? colors.gold : colors.border, backgroundColor: selected ? colors.gold : "transparent" }]}>
                  {selected && <Feather name="check" size={12} color={colors.background} />}
                </View>
                <View style={styles.productInfo}>
                  <Text style={[{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "right" }]}>
                    {product.name}
                  </Text>
                  <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right" }]}>
                    {product.category} • {product.retailPrice} ج.م
                  </Text>
                </View>
                {product.images.length > 0 ? (
                  <Image source={{ uri: product.images[0] }} style={styles.productThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.productThumb, { backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }]}>
                    <Feather name="layers" size={18} color={colors.goldDark} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 16 }]}>
        <GoldButton label="حفظ الإعدادات" onPress={handleSave} loading={saving} style={{ flex: 1 }} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 14 },
  cardTitle: { fontSize: 15, textAlign: "right" },
  bannerPreviewWrap: { borderRadius: 10, overflow: "hidden", height: 120, position: "relative" },
  bannerPreview: { width: "100%", height: 120, borderRadius: 10 },
  removeBanner: { position: "absolute", top: 8, left: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  bannerPlaceholder: { height: 100, borderRadius: 10, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6 },
  productRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, gap: 3 },
  productThumb: { width: 52, height: 52, borderRadius: 8 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
