import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { router, useFocusEffect } from "expo-router";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useTranslation } from "@/lib/i18n";
import ProductCard from "@/components/ProductCard";
import { filterNotificationsForUser } from "@/lib/notificationFilter";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, products, notifications, cart, settings, orders, onlineCount } = useApp();
  const { t, isRTL } = useTranslation();

  const videos = settings.bannerVideoUris ?? [];
  const [videoIdx, setVideoIdx] = useState(0);
  const currentVideoUri = videos[videoIdx] ?? null;

  const bannerImages: string[] = (settings.bannerImageUris && settings.bannerImageUris.length > 0)
    ? settings.bannerImageUris
    : (settings.bannerImageUri ? [settings.bannerImageUri] : []);
  const [imageIdx, setImageIdx] = useState(0);

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

  const resumeVideo = useCallback(() => {
    if (!currentVideoUri) return;
    try {
      if (!player.playing) player.play();
    } catch {}
  }, [player, currentVideoUri]);

  useFocusEffect(
    useCallback(() => {
      resumeVideo();
    }, [resumeVideo])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") resumeVideo();
    });
    return () => sub.remove();
  }, [resumeVideo]);

  useEffect(() => {
    if (videos.length > 0 || bannerImages.length < 2) return;
    const id = setInterval(() => {
      setImageIdx((prev) => (prev + 1) % bannerImages.length);
    }, 4000);
    return () => clearInterval(id);
  }, [videos.length, bannerImages.length]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (currentVideoUri) {
      try {
        player.replace(currentVideoUri);
        player.muted = true;
        player.play();
      } catch {}
    }
    setTimeout(() => setRefreshing(false), 600);
  }, [player, currentVideoUri]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const navGuard = useRef(false);
  const safePush = useCallback((path: string) => {
    if (navGuard.current) return;
    navGuard.current = true;
    router.push(path as any);
    setTimeout(() => { navGuard.current = false; }, 800);
  }, []);

  const myNotifications = filterNotificationsForUser(notifications, user);
  const { isNotifReadForUser } = useApp();
  const unreadCount = myNotifications.filter((n) => !isNotifReadForUser(n)).length;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const featuredProducts =
    settings.featuredProductIds.length > 0
      ? products.filter((p) => settings.featuredProductIds.includes(p.id))
      : products.slice(0, 4);

  const isStaff = user?.role === "admin" || user?.role === "employee" || user?.role === "supervisor";
  const activeOrders = isStaff ? [] : orders.filter((o) => o.userId === user?.id && !["cancelled", "delivered", "shipped"].includes(o.status)).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const STATUS_LABEL: Record<string, { text: string; color: string }> = {
    scheduled: { text: t("scheduled"), color: "#D4A017" },
    pending: { text: t("awaitingPickup"), color: "#9B59B6" },
    received: { text: t("received"), color: "#3498DB" },
    preparing: { text: t("preparing"), color: "#F39C12" },
    ready: { text: t("ready"), color: "#27AE60" },
    ready_to_ship: { text: t("ready_to_ship"), color: "#16A085" },
    shipped: { text: t("shipped"), color: "#1ABC9C" },
    delivered: { text: t("delivered"), color: "#2ECC71" },
    cancelled: { text: t("cancelled"), color: "#E74C3C" },
  };

  const hasVideo = videos.length > 0;
  const hasImage = bannerImages.length > 0;
  const currentImageUri = bannerImages[imageIdx % Math.max(bannerImages.length, 1)] ?? bannerImages[0];

  const roleLabel =
    user?.vip
      ? { icon: "star" as const, text: t("vipCustomer"), gold: true }
      : user?.role === "merchant"
      ? { icon: "award" as const, text: t("verifiedMerchant"), gold: true }
      : user?.role === "admin"
      ? { icon: "shield" as const, text: t("roleAdmin"), gold: true }
      : user?.role === "supervisor"
      ? { icon: "shield-check" as const, text: t("roleSupervisor"), gold: true }
      : user?.role === "employee"
      ? { icon: "briefcase" as const, text: t("roleEmployee"), gold: false }
      : { icon: "user" as const, text: t("customer"), gold: false };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Pressable
            onPress={() => safePush("/notifications")}
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
            onPress={() => safePush("/favorites")}
            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Icon name="heart" size={22} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => safePush("/cart")}
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.gold}
            colors={[colors.gold]}
          />
        }
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
              source={{ uri: currentImageUri }}
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
              <Text style={styles.bannerGreeting}>{t("welcomeUser")}</Text>
              <Text style={styles.bannerUserName} numberOfLines={1}>
                {user?.name ?? t("guest")}
              </Text>
            </View>
            <View style={[styles.bannerRolePill, { backgroundColor: roleLabel.gold ? colors.gold : colors.surface + "CC" }]}>
              <Icon name={roleLabel.icon} size={11} color={roleLabel.gold ? "#0A0A0A" : colors.mutedForeground} />
              <Text style={[styles.bannerRoleText, { color: roleLabel.gold ? "#0A0A0A" : colors.mutedForeground }]}>
                {roleLabel.text}
              </Text>
            </View>
            {user?.role === "admin" && (
              <View style={[styles.bannerRolePill, { backgroundColor: "#27AE60", marginInlineStart: 6 }]}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
                <Text style={[styles.bannerRoleText, { color: "#FFFFFF" }]}>
                  {onlineCount} متصل الآن
                </Text>
              </View>
            )}
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

          {videos.length === 0 && bannerImages.length > 1 && (
            <View style={styles.dotsRow} pointerEvents="none">
              {bannerImages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === (imageIdx % bannerImages.length) ? colors.gold : "rgba(255,255,255,0.4)" },
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {activeOrders.length > 0 && (
          <Pressable
            onPress={() => router.push("/(tabs)/orders")}
            style={[styles.activeOrdersCard, { backgroundColor: colors.card, borderColor: colors.gold + "44", borderRadius: colors.radius }]}
          >
            <View style={styles.activeOrdersHeader}>
              <View style={styles.activeOrdersRight}>
                <Icon name="package" size={18} color={colors.gold} />
                <Text style={[styles.activeOrdersTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {t("currentOrders")}
                </Text>
              </View>
              <View style={[styles.activeOrdersBadge, { backgroundColor: colors.gold }]}>
                <Text style={{ color: colors.background, fontFamily: "Inter_700Bold", fontSize: 12 }}>
                  {activeOrders.length}
                </Text>
              </View>
            </View>
            {activeOrders.slice(0, 3).map((order) => {
              const statusInfo = STATUS_LABEL[order.status] ?? { text: order.status, color: colors.mutedForeground };
              return (
                <View key={order.id} style={[styles.activeOrderRow, { borderTopColor: colors.border }]}>
                  <Icon name="chevron-left" size={14} color={colors.mutedForeground} />
                  <View style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {t("orderNum")} #{order.id.slice(0, 8)}
                    </Text>
                    <View style={[styles.activeOrderStatusPill, { backgroundColor: statusInfo.color + "22" }]}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusInfo.color }} />
                      <Text style={{ color: statusInfo.color, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
            {activeOrders.length > 3 && (
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center", paddingTop: 6 }}>
                +{activeOrders.length - 3} {t("moreOrders")}
              </Text>
            )}
          </Pressable>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Pressable onPress={() => router.push("/(tabs)/products")}>
              <Text style={[styles.seeAll, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
                {t("viewAll")}
              </Text>
            </Pressable>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {t("featuredProducts")}
            </Text>
          </View>

          {featuredProducts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {t("noFeatured")}
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
  activeOrdersCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  activeOrdersHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  activeOrdersRight: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  activeOrdersTitle: { fontSize: 16 },
  activeOrdersBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  activeOrderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  activeOrderStatusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
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
