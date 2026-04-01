import React, { useState } from "react";
import {
  FlatList,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import ProductCard from "@/components/ProductCard";

const CATEGORIES = ["الكل", "حرير", "قطن", "ساتان", "كتان", "فيلفيت", "شيفون"];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, products, notifications } = useApp();
  const [activeCategory, setActiveCategory] = useState("الكل");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredProducts =
    activeCategory === "الكل"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const featuredProducts = products.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.push("/notifications")}
          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="bell" size={22} color={colors.foreground} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.gold }]}>
              <Text style={[styles.badgeText, { color: colors.background, fontFamily: "Inter_700Bold" }]}>
                {unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={[styles.brandName, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            Shams Tex
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [
            styles.avatarBtn,
            {
              backgroundColor: colors.gold + "22",
              borderColor: colors.gold + "44",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            {user?.name?.charAt(0) ?? "؟"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
      >
        <View style={styles.welcomeBanner}>
          <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.gold + "33" }]}>
            <View style={styles.bannerText}>
              <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                أهلاً بك
              </Text>
              <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {user?.name ?? "زائر"}
              </Text>
              {user?.role === "merchant" && (
                <View style={[styles.merchantBadge, { backgroundColor: colors.gold + "22" }]}>
                  <Feather name="award" size={12} color={colors.gold} />
                  <Text style={[styles.merchantText, { color: colors.gold, fontFamily: "Inter_600SemiBold" }]}>
                    تاجر موثّق
                  </Text>
                </View>
              )}
            </View>
            <Image
              source={require("../../assets/images/hero-fabrics.png")}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pressable onPress={() => router.push("/(tabs)/products")}>
              <Text style={[styles.seeAll, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
                عرض الكل
              </Text>
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              المنتجات المميزة
            </Text>
          </View>

          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "right" }]}
          >
            تصفح حسب الفئة
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={({ pressed }) => [
                  styles.categoryChip,
                  {
                    backgroundColor:
                      activeCategory === cat ? colors.gold : colors.surface,
                    borderColor: activeCategory === cat ? colors.gold : colors.border,
                    borderRadius: 20,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: activeCategory === cat ? colors.background : colors.foreground,
                      fontFamily: activeCategory === cat ? "Inter_600SemiBold" : "Inter_400Regular",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  brandName: {
    fontSize: 20,
    letterSpacing: 2,
  },
  iconBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 24,
  },
  welcomeBanner: {},
  bannerCard: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row-reverse",
    overflow: "hidden",
    height: 130,
  },
  bannerText: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    gap: 4,
  },
  greeting: {
    fontSize: 12,
  },
  userName: {
    fontSize: 18,
  },
  merchantBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  merchantText: {
    fontSize: 11,
  },
  bannerImage: {
    width: 130,
    height: 130,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
  },
  seeAll: {
    fontSize: 13,
  },
  categoriesScroll: {
    gap: 10,
    paddingLeft: 4,
    flexDirection: "row-reverse",
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
  },
});
