import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ScrollView as ScrollViewType } from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import ProductCard from "@/components/ProductCard";

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { products, user, settings } = useApp();
  const CATEGORIES = settings.categories.length > 0 ? settings.categories : ["الكل"];
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const catScrollRef = useRef<ScrollViewType>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = products.filter((p) => {
    const matchCategory = activeCategory === "الكل" || p.category === activeCategory;
    const matchSearch =
      !search || p.name.includes(search) || p.category.includes(search);
    return matchCategory && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
        >
          المنتجات
        </Text>
        {(user?.role === "admin" || user?.role === "employee") && (
          <Pressable
            onPress={() => router.push("/admin/add-product")}
            style={({ pressed }) => [
              styles.addBtn,
              {
                backgroundColor: colors.gold,
                borderRadius: colors.radius - 4,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Icon name="plus" size={18} color={colors.background} />
          </Pressable>
        )}
      </View>

      <View
        style={[
          styles.searchWrapper,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          <Icon name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="ابحث عن خامة..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
          />
        </View>

        <ScrollView
          ref={catScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
          onLayout={() => catScrollRef.current?.scrollToEnd({ animated: false })}
        >
          {[...CATEGORIES].reverse().map((cat) => (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={({ pressed }) => [
                styles.catChip,
                {
                  backgroundColor:
                    activeCategory === cat ? colors.gold : colors.surface,
                  borderColor: activeCategory === cat ? colors.gold : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.catText,
                  {
                    color:
                      activeCategory === cat ? colors.background : colors.foreground,
                    fontFamily:
                      activeCategory === cat ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="layers" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              لا توجد منتجات
            </Text>
          </View>
        ) : (
          filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
  catScroll: {
    gap: 8,
    flexDirection: "row",
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catText: {
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
