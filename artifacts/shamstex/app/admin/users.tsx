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
import { useApp, User, UserRole, EmployeePermission } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "زبون",
  merchant: "تاجر",
  employee: "موظف",
  admin: "مدير",
};

const ROLE_COLORS: Record<UserRole, string> = {
  customer: "#888",
  merchant: "#C9A84C",
  employee: "#2980B9",
  admin: "#C0392B",
};

const PERMISSION_LABELS: Record<EmployeePermission, string> = {
  view_orders: "عرض الطلبات",
  edit_orders: "تعديل الطلبات",
  view_products: "عرض المنتجات",
  edit_products: "تعديل المنتجات",
  view_users: "عرض المستخدمين",
  send_notifications: "إرسال الإشعارات",
};

const ALL_PERMISSIONS: EmployeePermission[] = [
  "view_orders",
  "edit_orders",
  "view_products",
  "edit_products",
  "view_users",
  "send_notifications",
];

const MOCK_USERS: User[] = [
  { id: "u1", phone: "0100 000 0001", name: "مدير النظام", role: "admin" },
  { id: "u2", phone: "0100 000 0002", name: "أحمد محمد", role: "merchant" },
  { id: "u3", phone: "0100 000 0003", name: "محمد علي", role: "employee", permissions: ["view_orders", "view_products"] },
  { id: "u4", phone: "0100 000 0004", name: "سارة أحمد", role: "customer" },
  { id: "u5", phone: "0100 000 0005", name: "خالد عبدالله", role: "customer", upgradeStatus: "pending" },
  { id: "u6", phone: "0100 000 0006", name: "فاطمة حسن", role: "customer", vip: true },
];

type FilterRole = "all" | UserRole;

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleChangeRole = (userId: string, newRole: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole, upgradeStatus: undefined } : u))
    );
  };

  const handleToggleVip = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, vip: !u.vip } : u))
    );
  };

  const handleTogglePermission = (userId: string, permission: EmployeePermission) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const current = u.permissions ?? [];
        const updated = current.includes(permission)
          ? current.filter((p) => p !== permission)
          : [...current, permission];
        return { ...u, permissions: updated };
      })
    );
  };

  const handleApproveUpgrade = (userId: string) => {
    Alert.alert("تأكيد", "هل تريد ترقية هذا المستخدم إلى تاجر؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "موافقة", onPress: () => handleChangeRole(userId, "merchant") },
    ]);
  };

  const handleRejectUpgrade = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, upgradeStatus: "rejected" } : u))
    );
  };

  const FILTER_OPTIONS: { key: FilterRole; label: string }[] = [
    { key: "all", label: "الكل" },
    { key: "admin", label: "مدير" },
    { key: "employee", label: "موظف" },
    { key: "merchant", label: "تاجر" },
    { key: "customer", label: "زبون" },
  ];

  const pendingUpgrades = users.filter((u) => u.upgradeStatus === "pending");
  const filteredUsers = users.filter((u) => {
    if (u.upgradeStatus === "pending") return false;
    if (filterRole === "all") return true;
    return u.role === filterRole;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="إدارة المستخدمين" onBack={() => router.back()} />

      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_OPTIONS.map(({ key, label }) => (
            <Pressable
              key={key}
              onPress={() => setFilterRole(key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filterRole === key ? colors.gold : colors.surface,
                  borderColor: filterRole === key ? colors.gold : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: filterRole === key ? colors.background : colors.foreground,
                    fontFamily: filterRole === key ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        {pendingUpgrades.length > 0 && (filterRole === "all" || filterRole === "merchant") && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
              طلبات الترقية ({pendingUpgrades.length})
            </Text>
            {pendingUpgrades.map((u) => (
              <View
                key={u.id}
                style={[
                  styles.upgradeCard,
                  { backgroundColor: colors.gold + "11", borderColor: colors.gold + "44", borderRadius: colors.radius },
                ]}
              >
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {u.name}
                  </Text>
                  <Text style={[styles.userPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {u.phone}
                  </Text>
                </View>
                <View style={styles.upgradeActions}>
                  <Pressable
                    onPress={() => handleRejectUpgrade(u.id)}
                    style={[styles.rejectBtn, { borderColor: colors.destructive + "66", borderRadius: 8 }]}
                  >
                    <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      رفض
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleApproveUpgrade(u.id)}
                    style={[styles.approveBtn, { backgroundColor: colors.gold, borderRadius: 8 }]}
                  >
                    <Text style={{ color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                      موافقة
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            المستخدمون ({filteredUsers.length})
          </Text>
          {filteredUsers.map((u) => {
            const isExpanded = expandedUser === u.id;
            const isEmployee = u.role === "employee";
            return (
              <View
                key={u.id}
                style={[
                  styles.userCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
                ]}
              >
                <Pressable
                  onPress={() => setExpandedUser(isExpanded ? null : u.id)}
                  style={styles.userRow}
                >
                  <View style={styles.userExpandIcon}>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.mutedForeground}
                    />
                  </View>
                  <View style={styles.userDetails}>
                    <View style={styles.userNameRow}>
                      <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                        {u.name}
                      </Text>
                      {u.vip && (
                        <View style={[styles.vipBadge, { backgroundColor: colors.gold + "33" }]}>
                          <Feather name="star" size={10} color={colors.gold} />
                          <Text style={[{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 10 }]}>
                            مميز
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.userPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {u.phone}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View
                      style={[
                        styles.roleChip,
                        {
                          backgroundColor: ROLE_COLORS[u.role] + "22",
                          borderColor: ROLE_COLORS[u.role] + "55",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: ROLE_COLORS[u.role],
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 12,
                        }}
                      >
                        {ROLE_LABELS[u.role]}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {isExpanded && user?.role === "admin" && u.id !== user.id && (
                  <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
                    <Text style={[styles.expandLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                      تغيير الدور
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: "row-reverse" }}>
                      {(["customer", "merchant", "employee", "admin"] as UserRole[]).map((role) => (
                        <Pressable
                          key={role}
                          onPress={() => handleChangeRole(u.id, role)}
                          style={[
                            styles.roleBtn,
                            {
                              backgroundColor: u.role === role ? colors.gold : colors.surface,
                              borderColor: u.role === role ? colors.gold : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: u.role === role ? colors.background : colors.foreground,
                              fontFamily: u.role === role ? "Inter_600SemiBold" : "Inter_400Regular",
                              fontSize: 12,
                            }}
                          >
                            {ROLE_LABELS[role]}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    {u.role === "customer" && (
                      <View style={styles.vipToggleRow}>
                        <Pressable
                          onPress={() => handleToggleVip(u.id)}
                          style={[
                            styles.vipToggleBtn,
                            {
                              backgroundColor: u.vip ? colors.gold + "22" : colors.surface,
                              borderColor: u.vip ? colors.gold : colors.border,
                            },
                          ]}
                        >
                          <Feather name={u.vip ? "star" : "star"} size={14} color={u.vip ? colors.gold : colors.mutedForeground} />
                          <Text
                            style={{
                              color: u.vip ? colors.gold : colors.mutedForeground,
                              fontFamily: "Inter_500Medium",
                              fontSize: 13,
                            }}
                          >
                            {u.vip ? "إلغاء العميل المميز" : "تعيين عميل مميز"}
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {isEmployee && (
                      <View style={{ gap: 8 }}>
                        <Text style={[styles.expandLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                          الصلاحيات
                        </Text>
                        <View style={styles.permissionsGrid}>
                          {ALL_PERMISSIONS.map((perm) => {
                            const active = (u.permissions ?? []).includes(perm);
                            return (
                              <Pressable
                                key={perm}
                                onPress={() => handleTogglePermission(u.id, perm)}
                                style={[
                                  styles.permChip,
                                  {
                                    backgroundColor: active ? colors.gold + "22" : colors.surface,
                                    borderColor: active ? colors.gold : colors.border,
                                  },
                                ]}
                              >
                                <Feather
                                  name={active ? "check-square" : "square"}
                                  size={13}
                                  color={active ? colors.gold : colors.mutedForeground}
                                />
                                <Text
                                  style={{
                                    color: active ? colors.gold : colors.foreground,
                                    fontFamily: active ? "Inter_500Medium" : "Inter_400Regular",
                                    fontSize: 11,
                                  }}
                                >
                                  {PERMISSION_LABELS[perm]}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { borderBottomWidth: 1 },
  filterScroll: { gap: 8, padding: 12, flexDirection: "row-reverse" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  filterChipText: { fontSize: 13 },
  content: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, textAlign: "right" },
  upgradeCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  userInfo: { flex: 1, gap: 3 },
  upgradeActions: { flexDirection: "row-reverse", gap: 8 },
  rejectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  approveBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  userCard: { borderWidth: 1, overflow: "hidden" },
  userRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  userExpandIcon: { padding: 2 },
  userDetails: { flex: 1, gap: 3, alignItems: "flex-end" },
  userNameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  userName: { fontSize: 14 },
  userPhone: { fontSize: 12 },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  vipBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  expandedSection: {
    borderTopWidth: 1,
    padding: 14,
    gap: 12,
  },
  expandLabel: { fontSize: 12, textAlign: "right" },
  roleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  vipToggleRow: { alignItems: "flex-end" },
  vipToggleBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  permissionsGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  permChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
});
