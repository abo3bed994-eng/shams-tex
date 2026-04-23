import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function AdminFeaturedScreen() {
  useAdminGuard("edit_products");
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, settings, setSettings, showToast } = useApp();

  const [featuredIds, setFeaturedIds] = useState<string[]>(settings.featuredProductIds ?? []);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Re-sync local selection when settings change from elsewhere (e.g. another
  // device or first cloud load), but only if the user hasn't started editing.
  useEffect(() => {
    if (!dirty) {
      setFeaturedIds(settings.featuredProductIds ?? []);
    }
  }, [settings.featuredProductIds, dirty]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirty(true);
    setFeaturedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setSettings({ ...settings, featuredProductIds: featuredIds });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDirty(false);
      showToast(
        featuredIds.length > 0
          ? `تم حفظ ${featuredIds.length} منتج مميز ✓`
          : "تم إلغاء جميع المنتجات المميزة ✓",
        "success"
      );
      // Brief delay so the toast is visible, then return to the previous screen.
      setTimeout(() => {
        try { router.back(); } catch {}
      }, 700);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast("تعذّر الحفظ — تأكد من اتصال الإنترنت ثم حاول مجدداً", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="المنتجات المميزة" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            المنتجات المميزة ({featuredIds.length} مختار)
          </Text>
          <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            المنتجات المحددة ستظهر في الصفحة الرئيسية ضمن قسم "المنتجات المميزة"
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
                  {selected && <Icon name="check" size={12} color={colors.background} />}
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
                    <Icon name="layers" size={18} color={colors.goldDark} />
                  </View>
                )}
              </Pressable>
            );
          })}
          {products.length === 0 && (
            <View style={styles.empty}>
              <Icon name="layers" size={36} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" }]}>
                لا توجد منتجات. أضف منتجات من لوحة الأدمن أولاً.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 16 }]}>
        <GoldButton label="حفظ الاختيار" onPress={handleSave} loading={saving} style={{ flex: 1 }} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  card: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 14 },
  cardTitle: { fontSize: 15, textAlign: "right" },
  hint: { fontSize: 12, textAlign: "right", lineHeight: 18 },
  productRow: { flexDirection: "row-reverse", alignItems: "center", gap: 12, padding: 12, borderRadius: 10, borderWidth: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  productInfo: { flex: 1, gap: 3 },
  productThumb: { width: 52, height: 52, borderRadius: 8 },
  empty: { paddingVertical: 24, alignItems: "center", gap: 10 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
