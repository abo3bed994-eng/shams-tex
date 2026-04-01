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

const ROLE_LABELS: Record<string, string> = {
  customer: "زبون",
  merchant: "تاجر",
  employee: "موظف",
  admin: "مدير",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, setUser, orders, addNotification } = useApp();
  const [requestSent, setRequestSent] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const myOrdersCount = orders.filter((o) => o.userId === user?.id).length;

  const handleUpgradeRequest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRequestSent(true);
    addNotification({
      id: Date.now().toString(),
      title: "طلب ترقية",
      body: `${user?.name} يطلب الترقية إلى تاجر`,
      createdAt: new Date().toISOString(),
      read: false,
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

  if (!user) {
    router.replace("/auth/login");
    return null;
  }

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
            <Feather name="star" size={24} color={colors.gold} />
            <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              عميل مميز
            </Text>
          </View>
        </View>

        {user.role === "customer" && (
          <View style={[styles.upgradeCard, { backgroundColor: colors.card, borderColor: colors.gold + "44", borderRadius: colors.radius }]}>
            <View style={styles.upgradeHeader}>
              <Feather name="award" size={22} color={colors.gold} />
              <Text style={[styles.upgradeTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                انضم كتاجر
              </Text>
            </View>
            <Text style={[styles.upgradeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              احصل على أسعار الجملة الحصرية وميزات خاصة للتجار بعد موافقة الإدارة
            </Text>
            {requestSent || user.upgradeStatus === "pending" ? (
              <View style={[styles.pendingBadge, { backgroundColor: colors.gold + "22" }]}>
                <Feather name="clock" size={14} color={colors.gold} />
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

        {(user.role === "admin" || user.role === "employee") && (
          <View style={[styles.adminSection, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.adminTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              لوحة الإدارة
            </Text>
            {[
              { label: "إدارة المنتجات", icon: "layers", route: "/admin/products" },
              { label: "إدارة الأسعار", icon: "dollar-sign", route: "/admin/prices" },
              { label: "إدارة المستخدمين", icon: "users", route: "/admin/users" },
              { label: "إرسال إشعار", icon: "bell", route: "/admin/notifications" },
              { label: "إدارة التبويبات", icon: "layout", route: "/admin/tabs" },
            ].map((item) => (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => [
                  styles.adminItem,
                  { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
                <Text style={[styles.adminItemText, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {item.label}
                </Text>
                <View style={[styles.adminItemIcon, { backgroundColor: colors.gold + "22" }]}>
                  <Feather name={item.icon as any} size={16} color={colors.gold} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

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
  profileCard: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    gap: 10,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 36 },
  name: { fontSize: 22 },
  phone: { fontSize: 15 },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: { fontSize: 14 },
  statsRow: { flexDirection: "row-reverse", gap: 12 },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    gap: 6,
    borderWidth: 1,
  },
  statNum: { fontSize: 28 },
  statLabel: { fontSize: 12 },
  upgradeCard: {
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  upgradeHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  upgradeTitle: { fontSize: 16 },
  upgradeDesc: { fontSize: 13, textAlign: "right", lineHeight: 20 },
  pendingBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-end",
  },
  pendingText: { fontSize: 13 },
  adminSection: {
    borderWidth: 1,
    overflow: "hidden",
  },
  adminTitle: {
    fontSize: 16,
    padding: 16,
    textAlign: "right",
    borderBottomWidth: 1,
  },
  adminItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  adminItemText: { flex: 1, fontSize: 14 },
  adminItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
