import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "@/components/Icon";
import { useColors } from "@/hooks/useColors";
import { Product } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const colors = useColors();
  const { effectivePriceMode, user, favorites, toggleFavorite } = useApp();
  const fav = favorites.includes(product.id);

  const displayPrice =
    effectivePriceMode === "wholesale" ? product.wholesalePrice : product.retailPrice;

  const priceLabel = effectivePriceMode === "wholesale" ? "سعر الجملة" : "السعر";

  const isOutOfStock = !product.inStock;

  return (
    <View
      style={[
        styles.shadowWrap,
        {
          backgroundColor: colors.surface,
          borderRadius: colors.radius,
          shadowColor: colors.isDark ? "#000000" : "#2A2008",
          shadowOpacity: colors.isDark ? 0.4 : 0.16,
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isOutOfStock ? "#C0392B88" : colors.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.cardInner, { opacity: pressed ? 0.9 : 1 }]}
        >
          {product.images.length > 0 ? (
            <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="layers" size={40} color={isOutOfStock ? "#C0392B88" : colors.goldDark} />
            </View>
          )}

          <View style={styles.categoryBadge}>
            <Text style={[styles.categoryText, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
              {product.category}
            </Text>
          </View>

          {isOutOfStock && (
            <View style={styles.outOfStockBadge}>
              <Icon name="x-circle" size={12} color="#fff" />
              <Text style={[styles.outOfStockText, { fontFamily: "Inter_700Bold" }]}>نفذ المخزون</Text>
            </View>
          )}

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.12)", "rgba(0,0,0,0.82)"]}
            locations={[0, 0.45, 1]}
            style={styles.scrim}
            pointerEvents="none"
          />

          <View style={styles.infoOverlay}>
            <Text
              style={[styles.name, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}
              numberOfLines={1}
            >
              {product.name}
            </Text>

            <View style={styles.bottomRow}>
              <View style={styles.priceWrap}>
                <Text style={[styles.priceLabel, { fontFamily: "Inter_400Regular" }]}>{priceLabel}</Text>
                <Text style={[styles.price, { color: colors.goldLight, fontFamily: "Inter_700Bold" }]}>
                  {displayPrice} ج.م
                </Text>
              </View>

              <View style={styles.colorsRow}>
                {product.colors.slice(0, 4).map((c, i) => (
                  <View
                    key={i}
                    style={[
                      styles.colorDot,
                      {
                        backgroundColor: c.hex,
                        borderColor: "rgba(255,255,255,0.6)",
                        borderWidth: c.hex === "#FFFFFF" || c.hex === "#FEFEFE" ? 1 : 0,
                      },
                    ]}
                  />
                ))}
                {product.colors.length > 4 && (
                  <Text style={styles.moreColors}>+{product.colors.length - 4}</Text>
                )}
              </View>
            </View>
          </View>
        </Pressable>

        {user && (
          <Pressable
            onPress={() => toggleFavorite(product.id)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.favBtn,
              { top: isOutOfStock ? 44 : 10, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Icon name="heart" size={18} color={fav ? "#E74C3C" : "#fff"} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    marginBottom: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5,
  },
  card: {
    borderWidth: 1,
    overflow: "hidden",
    height: 230,
    position: "relative",
  },
  cardInner: {
    flex: 1,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  categoryText: { fontSize: 11 },
  categoryBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  outOfStockBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#C0392B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 11,
  },
  favBtn: {
    position: "absolute",
    left: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "62%",
  },
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 13,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 6,
  },
  name: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
  },
  bottomRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceWrap: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 10,
    textAlign: "right",
    color: "rgba(255,255,255,0.7)",
  },
  price: {
    fontSize: 16,
    textAlign: "right",
  },
  colorsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  moreColors: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginRight: 2,
  },
});
