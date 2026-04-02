import React, { useState } from "react";
import {
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

export default function AdminProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, setProducts } = useApp();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const deleteProduct = (id: string, name: string) => {
    Alert.alert("حذف المنتج", `هل تريد حذف "${name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await setProducts(products.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  const toggleStock = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setProducts(
      products.map((p) => (p.id === id ? { ...p, inStock: !p.inStock } : p))
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader
        title="إدارة المنتجات"
        subtitle={`${products.length} منتج`}
        onBack={() => router.back()}
        rightElement={
          <Pressable
            onPress={() => router.push("/admin/add-product")}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: colors.gold, borderRadius: 8, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Feather name="plus" size={18} color={colors.background} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        {products.map((product) => (
          <View
            key={product.id}
            style={[
              styles.productCard,
              {
                backgroundColor: colors.card,
                borderColor: product.inStock ? colors.border : colors.destructive + "44",
                borderRadius: colors.radius,
              },
            ]}
          >
            <View style={styles.productHeader}>
              <View style={styles.productActions}>
                <Pressable
                  onPress={() => deleteProduct(product.id, product.name)}
                  style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/admin/edit-product/${product.id}` as any)}
                  style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.gold + "22", borderRadius: 8, opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="edit-2" size={16} color={colors.gold} />
                </Pressable>
                <Pressable
                  onPress={() => router.push(`/product/${product.id}`)}
                  style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Feather name="eye" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {product.name}
                </Text>
                <View style={[styles.categoryBadge, { backgroundColor: colors.gold + "22" }]}>
                  <Text style={[styles.categoryText, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
                    {product.category}
                  </Text>
                </View>
              </View>

              <View style={[styles.productIconBox, { backgroundColor: colors.surface }]}>
                <Feather name="layers" size={24} color={colors.goldDark} />
              </View>
            </View>

            <View style={styles.productDetails}>
              <View style={styles.priceItem}>
                <Text style={[styles.priceValue, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                  {product.wholesalePrice} ج.م
                </Text>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  سعر التاجر
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.priceItem}>
                <Text style={[styles.priceValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {product.retailPrice} ج.م
                </Text>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  سعر الزبون
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.priceItem}>
                <Text style={[styles.priceValue, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {product.colors.length}
                </Text>
                <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  الألوان
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => toggleStock(product.id)}
              style={({ pressed }) => [
                styles.stockBtn,
                {
                  backgroundColor: product.inStock ? "#27AE6022" : "#C0392B22",
                  borderTopColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather
                name={product.inStock ? "check-circle" : "x-circle"}
                size={14}
                color={product.inStock ? "#27AE60" : "#C0392B"}
              />
              <Text
                style={[
                  styles.stockText,
                  {
                    color: product.inStock ? "#27AE60" : "#C0392B",
                    fontFamily: "Inter_600SemiBold",
                  },
                ]}
              >
                {product.inStock ? "متوفر" : "نفذ المخزون"}
              </Text>
            </Pressable>
          </View>
        ))}

        {products.length === 0 && (
          <View style={styles.empty}>
            <Feather name="layers" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              لا توجد منتجات
            </Text>
            <GoldButton
              label="إضافة منتج"
              onPress={() => router.push("/admin/add-product")}
              variant="outline"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  addBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  productCard: { borderWidth: 1, overflow: "hidden" },
  productHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  productIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: { flex: 1, gap: 5, alignItems: "flex-end" },
  productName: { fontSize: 14 },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  categoryText: { fontSize: 11 },
  productActions: {
    flexDirection: "row-reverse",
    gap: 4,
  },
  actionBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  productDetails: {
    flexDirection: "row-reverse",
    borderTopWidth: 1,
    borderTopColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 0,
  },
  priceItem: { flex: 1, alignItems: "center", gap: 3 },
  priceValue: { fontSize: 15 },
  priceLabel: { fontSize: 10 },
  divider: { width: 1, height: 40 },
  stockBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    borderTopWidth: 1,
  },
  stockText: { fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16 },
});
