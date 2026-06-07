import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
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
  const { effectivePriceMode } = useApp();

  const displayPrice =
    effectivePriceMode === "wholesale" ? product.wholesalePrice : product.retailPrice;

  const priceLabel = effectivePriceMode === "wholesale" ? "سعر الجملة" : "السعر";

  const isOutOfStock = !product.inStock;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isOutOfStock ? "#C0392B88" : colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
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
            <Text style={[styles.price, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    height: 230,
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
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 9,
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
