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
import { useVideoPlayer, VideoView } from "expo-video";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import ProductCard from "@/components/ProductCard";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, products, notifications, cart, settings } = useApp();

  const videos = settings.bannerVideoUris ?? [];
  const [videoIdx, setVideoIdx] = useState(0);
  const currentVideoUri = videos[videoIdx] ?? null;

  const player = useVideoPlayer(currentVideoUri, (p) => {
    p.muted = true;
    p.loop = false;
    if (currentVideoUri) p.play();
  });

  useEffect(() => {
    if (!currentVideoUri) return;
    player.muted = true;
    player.loop = false;
    player.replace(currentVideoUri);
    player.play();
  }, [videoIdx]);

  useEffect(() => {
    if (videos.length < 2) {
      if (videos.length === 1 && currentVideoUri) {
        player.loop = true;
        player.muted = true;
        player.replace(currentVideoUri);
        player.play();
      }
      return;
    }
    const sub = player.addListener("playToEnd", () => {
      setVideoIdx((prev) => (prev + 1) % videos.length);
    });
    return () => sub.remove();
  }, [videos.length, player]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Filter notifications by user role — same logic as notifications screen
  const myNotifications = notifications.filter((n) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    if (user.role === "supervisor") {
      if (n.targetUserId) return false;
      if (n.targetRole === "supervisor" || n.targetRole === "staff") return true;
      if (n.actionType === "upgrade_request") return true;
      if (!n.targetRole && !n.targetUserId) return true;
      return false;
    }
    if (user.role === "employee") {
      if (n.targetUserId) return false;
      return n.targetRole === "employee" || n.targetRole === "staff";
    }
    if (user.role === "customer" || user.role === "merchant") {
      if (n.targetUserId) return n.targetUserId === user.id;
      if (n.targetRole) return n.targetRole === user.role;
      return false;
    }
    return false;
  });
  const unreadCount = myNotifications.filter((n) => !n.read).length;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const featuredProducts =
    settings.featuredProductIds.length > 0
      ? products.filter((p) => settings.featuredProductIds.includes(p.id))
      : products.slice(0, 4);

  const hasVideo = videos.length > 0;
  const hasImage = !!settings.bannerImageUri;

  const roleLabel =
    user?.vip
      ? { icon: "star" as const, text: "عميل مميز", gold: true }
      : user?.role === "merchant"
      ? { icon: "award" as const, text: "تاجر موثّق", gold: true }
      : user?.role === "admin"
      ? { icon: "shield" as const, text: "مدير", gold: true }
      : user?.role === "supervisor"
      ? { icon: "shield-check" as const, text: "مشرف", gold: true }
      : user?.role === "employee"
      ? { icon: "briefcase" as const, text: "موظف", gold: false }
      : { icon: "user" as const, text: "عميل", gold: false };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="bell" size={22} color={colors.foreground} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                <Text style={[styles.badgeText, { color: colors.background, fontFamily: "Inter_700Bold" }]}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.push("/cart")}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="shopping-cart" size={22} color={colors.foreground} />
            {cartCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                <Text style={[styles.badgeText, { color: colors.background, fontFamily: "Inter_700Bold" }]}>
                  {cartCount > 9 ? "9+" : cartCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.headerCenter}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        <Pressable
          onPress={() => router.push("/profile")}
          style={({ pressed }) => [
            styles.avatarBtn,
            { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44", opacity: pressed ? 0.7 : 1 },
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
        <View style={[styles.bannerCard, { borderColor: colors.gold + "33" }]}>
          {hasVideo ? (
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
            />
          ) : hasImage ? (
            <Image
              source={{ uri: settings.bannerImageUri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require("../../assets/images/hero-fabrics.png")}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}

          <View style={[styles.bannerOverlay, { backgroundColor: "rgba(0,0,0,0.35)" }]} pointerEvents="none" />

          <View style={styles.bannerNameRow} pointerEvents="none">
            <View style={styles.bannerNamePill}>
              <Text style={styles.bannerGreeting}>أهلاً بك،</Text>
              <Text style={styles.bannerUserName} numberOfLines={1}>
                {user?.name ?? "زائر"}
              </Text>
            </View>
            <View style={[styles.bannerRolePill, { backgroundColor: roleLabel.gold ? colors.gold : colors.surface + "CC" }]}>
              <Icon name={roleLabel.icon} size={11} color={roleLabel.gold ? "#0A0A0A" : colors.mutedForeground} />
              <Text style={[styles.bannerRoleText, { color: roleLabel.gold ? "#0A0A0A" : colors.mutedForeground }]}>
                {roleLabel.text}
              </Text>
            </View>
          </View>

          {videos.length > 1 && (
            <View style={styles.dotsRow} pointerEvents="none">
              {videos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === videoIdx ? colors.gold : "rgba(255,255,255,0.4)" },
                  ]}
                />
              ))}
            </View>
          )}
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

          {featuredProducts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              لا توجد منتجات مميزة
            </Text>
          ) : (
            featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => router.push(`/product/${product.id}`)}
              />
            ))
          )}
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
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerLogo: { width: 60, height: 60 },
  headerLeft: { flexDirection: "row-reverse", gap: 2 },
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
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9 },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16 },
  scrollContent: { paddingTop: 16, gap: 20, paddingBottom: 100 },
  bannerCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    height: 210,
    overflow: "hidden",
    position: "relative",
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 52,
  },
  bannerNameRow: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bannerNamePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  bannerGreeting: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bannerUserName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
  bannerRolePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  bannerRoleText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  dotsRow: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  section: { gap: 14, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18 },
  seeAll: { fontSize: 13 },
  emptyText: { textAlign: "center", fontSize: 14, paddingVertical: 20 },
});
