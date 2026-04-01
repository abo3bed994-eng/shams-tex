import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markNotificationRead } = useApp();

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="الإشعارات" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="bell-off" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              لا توجد إشعارات
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <Pressable
              key={notif.id}
              onPress={() => markNotificationRead(notif.id)}
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
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: (notif.read ? colors.mutedForeground : colors.gold) + "22" },
                ]}
              >
                <Feather
                  name="bell"
                  size={18}
                  color={notif.read ? colors.mutedForeground : colors.gold}
                />
              </View>
              <View style={styles.notifContent}>
                <Text
                  style={[
                    styles.notifTitle,
                    {
                      color: colors.foreground,
                      fontFamily: notif.read ? "Inter_500Medium" : "Inter_700Bold",
                    },
                  ]}
                >
                  {notif.title}
                </Text>
                <Text style={[styles.notifBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {notif.body}
                </Text>
                <Text style={[styles.notifTime, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {new Date(notif.createdAt).toLocaleDateString("ar-EG")}
                </Text>
              </View>
              {!notif.read && (
                <View style={[styles.unreadDot, { backgroundColor: colors.gold }]} />
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
  },
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
  notifTime: { fontSize: 11 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
