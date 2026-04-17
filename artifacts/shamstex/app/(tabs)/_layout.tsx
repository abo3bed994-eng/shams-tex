import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import Icon from "@/components/Icon";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useTranslation } from "@/lib/i18n";

export default function TabLayout() {
  const colors = useColors();
  const { theme, orders, user, returnRequests } = useApp();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const isStaff = user?.role === "admin" || user?.role === "employee" || user?.role === "supervisor";
  const pendingOrdersCount = isStaff
    ? orders.filter((o) => o.status === "pending").length
    : 0;
  const pendingReturnsCount = isStaff
    ? returnRequests.filter((r) => r.status === "pending").length
    : 0;
  const badgeCount = pendingOrdersCount + pendingReturnsCount;
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 62,
          paddingBottom: isWeb ? 16 : 8,
          paddingTop: 6,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color }) => <Icon name="home" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t("products"),
          tabBarIcon: ({ color }) => <Icon name="grid" size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t("orders"),
          tabBarIcon: ({ color }) => <Icon name="package" size={20} color={color} />,
          tabBarBadge: badgeCount > 0 ? badgeCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#C0392B", fontSize: 10, minWidth: 16, height: 16 },
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          title: t("contact"),
          tabBarIcon: ({ color }) => <Icon name="phone" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
