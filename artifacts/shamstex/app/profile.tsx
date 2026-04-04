import React, { useEffect, useState } from "react";
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
import Icon from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, AppTheme } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

const ROLE_LABELS: Record<string, string> = {
  customer: "زبون",
  merchant: "تاجر",
  employee: "موظف",
  supervisor: "مشرف",
  admin: "مدير",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser, orders, addNotification, updateRegisteredCustomer, theme, setTheme, registeredCustomers } = useApp();
  const [requestSent, setRequestSent] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const myOrdersCount = orders.filter((o) => o.userId === user?.id).length;

  const handleUpgradeRequest = () => {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRequestSent(true);
    // Persist upgradeStatus = "pending" so re-login won't allow re-request
    const pendingUser = { ...user, upgradeStatus: "pending" as const };
    updateRegisteredCustomer(pendingUser);
    // Also update current session immediately so UI shows disabled button right away
    setUser(pendingUser);
    addNotification({
      id: `upgrade_${user.id}_${Date.now()}`,
      title: "طلب ترقية إلى تاجر",
      body: `${user.name} (${user.phone}) يطلب الترقية إلى تاجر`,
      createdAt: new Date().toISOString(),
      read: false,
      targetRole: "admin",
      actionType: "upgrade_request",
      actionUserId: user.id,
    });
    Alert.alert("تم إرسال الطلب", "سيتم مراجعة طلبك من قبل الإدارة وإبلاغك بالنتيجة.");
  };

  const handleLogout = () => {
    Alert.alert("تسجيل الخروج", "هل تريد تسجيل الخروج؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "خروج",
        style: "destructive",
        onPress: async () => {
          await setUser(null);
          router.replace("/auth/login");
        },
      },
    ]);
  };

  useEffect(() => {
    if (!user) {
      router.replace("/auth/login");
    }
  }, [user]);

  if (!user) return null;

  const allAdminLinks = [
    { label: "إدارة المنتجات", icon: "layers", route: "/admin/products", permission: "view_products" },
    { label: "إدارة الأسعار", icon: "dollar-sign", route: "/admin/prices", permission: "edit_products" },
    { label: "إدارة المستخدمين", icon: "users", route: "/admin/users", permission: "view_users" },
    { label: "إرسال إشعار", icon: "bell", route: "/admin/notifications", permission: "send_notifications" },
    { label: "المنتجات المميزة", icon: "star", route: "/admin/featured", permission: "edit_products" },
    { label: "لوحة الألوان", icon: "droplet", route: "/admin/colors", permission: null },
    { label: "إعدادات التطبيق", icon: "settings", route: "/admin/settings", permission: null },
  ];

  const adminLinks = user.role === "admin"
    ? allAdminLinks
    : allAdminLinks.filter((link) => {
        if (!link.permission) return user.role === "supervisor"; // supervisor-only links
        return (user.permissions ?? []).includes(link.permission as any);
      });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="حسابي" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.gold + "33", borderRadius: 20 }]}>
          <View style={[styles.avatar, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44" }]}>
            <Text style={[styles.avatarText, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
              {user.name.charAt(0)}
            </Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            {user.name}
          </Text>
          <Text style={[styles.phone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {user.phone}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.gold + "22" }]}>
            <Text style={[styles.roleText, { color: colors.gold, fontFamily: "Inter_600SemiBold" }]}>
              {ROLE_LABELS[user.role] ?? user.role}
            </Text>
          </View>
          {user.vip && (
            <View style={[styles.vipBadge, { backgroundColor: colors.gold + "33", borderColor: colors.gold + "44" }]}>
              <Icon name="star" size={13} color={colors.gold} />
              <Text style={[{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 12 }]}>
                عميل مميز
              </Text>
            </View>
          )}
          {!user.vip && user.role === "customer" && (
            <View style={[styles.vipBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="user" size={13} color={colors.mutedForeground} />
              <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }]}>
                عميل عادي
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.statNum, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
              {myOrdersCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              طلباتي
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Icon name={user.vip ? "star" : "user"} size={24} color={user.vip ? colors.gold : colors.mutedForeground} />
            <Text style={[styles.statLabel, { color: user.vip ? colors.gold : colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {user.vip ? "عميل مميز" : "عميل عادي"}
            </Text>
          </View>
        </View>

        {user.role === "customer" && !user.vip && (
          <View style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: colors.gold + "44", borderRadius: colors.radius }]}>
            <View style={styles.upgradeHeader}>
              <Icon name="award" size={22} color={colors.gold} />
              <Text style={[styles.upgradeTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                انضم كتاجر
              </Text>
            </View>
            <Text style={[styles.upgradeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              احصل على أسعار الجملة الحصرية وميزات خاصة للتجار بعد موافقة الإدارة
            </Text>
            {requestSent || user.upgradeStatus === "pending" ? (
              <View style={[styles.pendingBadge, { backgroundColor: colors.gold + "22" }]}>
                <Icon name="clock" size={14} color={colors.gold} />
                <Text style={[styles.pendingText, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
                  طلبك قيد المراجعة
                </Text>
              </View>
            ) : (
              <GoldButton
                label="طلب ترقية لتاجر"
                onPress={handleUpgradeRequest}
                variant="outline"
                size="sm"
                style={{ alignSelf: "flex-end" }}
              />
            )}
          </View>
        )}

        {(user.role === "admin" || user.role === "employee" || user.role === "supervisor") && adminLinks.length > 0 && (
          <View style={[styles.adminSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.adminTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              لوحة الإدارة
            </Text>
            {adminLinks.map((item) => (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.adminItem,
                  { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Icon name="chevron-left" size={16} color={colors.mutedForeground} />
                <Text style={[styles.adminItemText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {item.label}
                </Text>
                <View style={[styles.adminItemIcon, { backgroundColor: colors.gold + "22" }]}>
                  <Icon name={item.icon as any} size={16} color={colors.gold} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <View style={styles.themeHeader}>
            <Icon name={theme === "dark" ? "moon" : "sun"} size={20} color={colors.gold} />
            <Text style={[styles.themeTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              مظهر التطبيق
            </Text>
          </View>
          <View style={styles.themeButtons}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTheme("dark"); }}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: theme === "dark" ? colors.gold : colors.surface,
                  borderColor: theme === "dark" ? colors.gold : colors.border,
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Icon name="moon" size={16} color={theme === "dark" ? colors.background : colors.mutedForeground} />
              <Text style={[styles.themeBtnText, { color: theme === "dark" ? colors.background : colors.mutedForeground, fontFamily: theme === "dark" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                داكن
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTheme("light"); }}
              style={[
                styles.themeBtn,
                {
                  backgroundColor: theme === "light" ? colors.gold : colors.surface,
                  borderColor: theme === "light" ? colors.gold : colors.border,
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Icon name="sun" size={16} color={theme === "light" ? colors.background : colors.mutedForeground} />
              <Text style={[styles.themeBtnText, { color: theme === "light" ? colors.background : colors.mutedForeground, fontFamily: theme === "light" ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                فاتح
              </Text>
            </Pressable>
          </View>
        </View>

        <GoldButton
          label="تسجيل الخروج"
          onPress={handleLogout}
          variant="outline"
          style={{ borderColor: colors.destructive + "88" }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  profileCard: { alignItems: "center", padding: 24, borderWidth: 1, gap: 10 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36 },
  name: { fontSize: 22 },
  phone: { fontSize: 15 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 14 },
  vipBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  statsRow: { flexDirection: "row-reverse", gap: 12 },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 20, gap: 6, borderWidth: 1 },
  statNum: { fontSize: 28 },
  statLabel: { fontSize: 12 },
  upgradeCard: { padding: 18, borderWidth: 1, gap: 12 },
  upgradeHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  upgradeTitle: { fontSize: 16 },
  upgradeDesc: { fontSize: 13, textAlign: "right", lineHeight: 20 },
  pendingBadge: { flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, alignSelf: "flex-end" },
  pendingText: { fontSize: 13 },
  adminSection: { borderWidth: 1, overflow: "hidden" },
  adminTitle: { fontSize: 16, padding: 16, textAlign: "right", borderBottomWidth: 1 },
  adminItem: { flexDirection: "row-reverse", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1 },
  adminItemText: { flex: 1, fontSize: 14 },
  adminItemIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  themeCard: { padding: 16, borderWidth: 1, gap: 12 },
  themeHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  themeTitle: { fontSize: 15 },
  themeButtons: { flexDirection: "row-reverse", gap: 10 },
  themeBtn: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderWidth: 1 },
  themeBtnText: { fontSize: 14 },
});
