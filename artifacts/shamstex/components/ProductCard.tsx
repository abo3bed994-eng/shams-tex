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
  const { user } = useApp();

  const displayPrice =
    user?.role === "merchant" || user?.role === "admin"
      ? product.wholesalePrice
      : product.retailPrice;

  const priceLabel =
    user?.role === "merchant" || user?.role === "admin" ? "سعر الجملة" : "السعر";

  const isOutOfStock = !product.inStock;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isOutOfStock ? "#C0392B88" : colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: colors.radius,
            borderTopRightRadius: colors.radius,
          },
        ]}
      >
        {product.images.length > 0 ? (
          <Image source={{ uri: product.images[0] }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="layers" size={32} color={isOutOfStock ? "#C0392B88" : colors.goldDark} />
          </View>
        )}
        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Icon name="x-circle" size={13} color="#fff" />
            <Text style={[styles.outOfStockText, { fontFamily: "Inter_700Bold" }]}>
              نفذ المخزون
            </Text>
          </View>
        )}
        <View style={[styles.categoryBadge, { backgroundColor: colors.gold + "22" }]}>
          <Text style={[styles.categoryText, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
            {product.category}
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            { color: isOutOfStock ? "#C0392B" : colors.foreground, fontFamily: "Inter_600SemiBold" },
          ]}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        <View style={styles.colorsRow}>
          {product.colors.slice(0, 5).map((c, i) => (
            <View
              key={i}
              style={[
                styles.colorDot,
                {
                  backgroundColor: c.hex,
                  borderColor: colors.border,
                  borderWidth: c.hex === "#FFFFFF" || c.hex === "#FEFEFE" ? 1 : 0,
                },
              ]}
            />
          ))}
          {product.colors.length > 5 && (
            <Text style={[styles.moreColors, { color: colors.mutedForeground }]}>
              +{product.colors.length - 5}
            </Text>
          )}
        </View>

        <View style={styles.priceRow}>
          <View>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {priceLabel}
            </Text>
            <Text style={[styles.price, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
              {displayPrice} ج.م
            </Text>
          </View>
          <View style={[styles.arrowBtn, { backgroundColor: colors.gold + "22", borderRadius: colors.radius - 4 }]}>
            <Icon name="arrow-left" size={16} color={colors.gold} />
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
  },
  imageContainer: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: "100%",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  outOfStockBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 7,
    backgroundColor: "#C0392B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  outOfStockText: {
    color: "#fff",
    fontSize: 12,
  },
  info: {
    padding: 14,
    gap: 10,
  },
  name: {
    fontSize: 15,
    lineHeight: 22,
  },
  colorsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  moreColors: {
    fontSize: 11,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: 11,
    textAlign: "right",
  },
  price: {
    fontSize: 18,
    textAlign: "right",
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
