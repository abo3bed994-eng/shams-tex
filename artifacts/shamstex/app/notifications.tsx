import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";

function filterNotificationsForUser(notifications: any[], user: any): any[] {
  if (!user) return [];

  return notifications.filter((n) => {
    // Admin sees everything
    if (user.role === "admin") return true;

    // Supervisor: sees supervisor-targeted + upgrade requests + order-related (no customer-specific)
    if (user.role === "supervisor") {
      if (n.targetUserId) return false; // don't show personal notifications for other users
      if (n.targetRole === "supervisor") return true;
      if (n.targetRole === "employee") return true; // supervisor oversees employee tasks too
      if (n.actionType === "upgrade_request") return true;
      if (!n.targetRole && !n.targetUserId) return true; // broadcast
      return false;
    }

    // Employee: only order-related notifications (targetRole === "employee")
    if (user.role === "employee") {
      if (n.targetUserId) return false;
      if (n.targetRole === "employee") return true;
      return false;
    }

    // Customer / Merchant: only their own notifications or broadcasts for their role
    if (user.role === "customer" || user.role === "merchant") {
      if (n.targetUserId) return n.targetUserId === user.id;
      if (n.targetRole) return n.targetRole === user.role;
      // No target at all = broadcast (don't show to customers unless explicitly targeted)
      return false;
    }

    return false;
  });
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markNotificationRead, user, registeredCustomers, updateRegisteredCustomer } = useApp();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const visibleNotifications = filterNotificationsForUser(notifications, user);

  const handleNotifPress = (notifId: string, actionType?: string, actionUserId?: string) => {
    markNotificationRead(notifId);

    if (actionType === "upgrade_request" && actionUserId && (user?.role === "admin" || user?.role === "supervisor")) {
      const targetUser = registeredCustomers.find((c) => c.id === actionUserId);
      const userName = targetUser?.name ?? "المستخدم";
      Alert.alert(
        "طلب ترقية إلى تاجر",
        `يطلب ${userName} الترقية إلى تاجر. ما قرارك؟`,
        [
          { text: "رفض", style: "destructive", onPress: () => {
            if (targetUser) updateRegisteredCustomer({ ...targetUser, upgradeStatus: "rejected" });
          }},
          { text: "إلغاء", style: "cancel" },
          { text: "موافقة", onPress: () => {
            if (targetUser) updateRegisteredCustomer({ ...targetUser, role: "merchant", upgradeStatus: "approved" });
            Alert.alert("تم", `تمت ترقية ${userName} إلى تاجر`);
          }},
        ]
      );
    }
  };

  const getNotifIcon = (notif: any) => {
    if (notif.actionType === "upgrade_request") return "user-plus";
    if (notif.targetRole === "employee" || notif.targetRole === "supervisor") return "package";
    if (notif.targetUserId) return "bell";
    return "bell";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="الإشعارات" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        {visibleNotifications.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bell-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              لا توجد إشعارات
            </Text>
          </View>
        ) : (
          visibleNotifications.map((notif) => {
            const isAction = notif.actionType === "upgrade_request";
            const iconName = getNotifIcon(notif);
            const activeColor = isAction ? colors.gold : (notif.read ? colors.mutedForeground : colors.gold);

            return (
              <Pressable
                key={notif.id}
                onPress={() => handleNotifPress(notif.id, notif.actionType, notif.actionUserId)}
                style={({ pressed }) => [
                  styles.notifCard,
                  {
                    backgroundColor: notif.read ? colors.card : colors.gold + "11",
                    borderColor: notif.read ? colors.border : colors.gold + "44",
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.iconContainer, { backgroundColor: activeColor + "22" }]}>
                  <Icon name={iconName as any} size={18} color={activeColor} />
                </View>
                <View style={styles.notifContent}>
                  <Text
                    style={[
                      styles.notifTitle,
                      { color: colors.foreground, fontFamily: notif.read ? "Inter_500Medium" : "Inter_700Bold" },
                    ]}
                  >
                    {notif.title}
                  </Text>
                  <Text style={[styles.notifBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {notif.body}
                  </Text>
                  {isAction && !notif.read && (
                    <Text style={[styles.tapHint, { color: colors.gold, fontFamily: "Inter_500Medium" }]}>
                      اضغط للمراجعة والرد ←
                    </Text>
                  )}
                  <Text style={[styles.notifTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {new Date(notif.createdAt).toLocaleDateString("ar-EG")}
                  </Text>
                </View>
                {!notif.read && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.gold }]} />
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  empty: { alignItems: "center", paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16 },
  notifCard: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1, gap: 4 },
  notifTitle: { fontSize: 14, textAlign: "right" },
  notifBody: { fontSize: 13, textAlign: "right", lineHeight: 20 },
  tapHint: { fontSize: 12, textAlign: "right" },
  notifTime: { fontSize: 11 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
