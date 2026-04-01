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
import { useApp, User, UserRole } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "زبون",
  merchant: "تاجر",
  employee: "موظف",
  admin: "مدير",
};

const MOCK_USERS: User[] = [
  { id: "u1", phone: "0100 000 0001", name: "مدير النظام", role: "admin" },
  { id: "u2", phone: "0100 000 0002", name: "أحمد محمد", role: "merchant" },
  { id: "u3", phone: "0100 000 0003", name: "محمد علي", role: "employee" },
  { id: "u4", phone: "0100 000 0004", name: "سارة أحمد", role: "customer" },
  { id: "u5", phone: "0100 000 0005", name: "خالد عبدالله", role: "customer", upgradeStatus: "pending" },
];

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useApp();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleChangeRole = (userId: string, newRole: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole, upgradeStatus: undefined } : u
      )
    );
  };

  const handleApproveUpgrade = (userId: string) => {
    Alert.alert("تأكيد", "هل تريد ترقية هذا المستخدم إلى تاجر؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "موافقة",
        onPress: () => handleChangeRole(userId, "merchant"),
      },
    ]);
  };

  const handleRejectUpgrade = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, upgradeStatus: "rejected" } : u
      )
    );
  };

  const pendingUpgrades = users.filter((u) => u.upgradeStatus === "pending");
  const otherUsers = users.filter((u) => u.upgradeStatus !== "pending");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="إدارة المستخدمين" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        {pendingUpgrades.length > 0 && (
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
                    style={({ pressed }) => [
                      styles.rejectBtn,
                      { borderColor: colors.destructive + "66", borderRadius: 8, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 13 }]}>
                      رفض
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleApproveUpgrade(u.id)}
                    style={({ pressed }) => [
                      styles.approveBtn,
                      { backgroundColor: colors.gold, borderRadius: 8, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text style={[{ color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 13 }]}>
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
            جميع المستخدمين
          </Text>
          <View style={[styles.usersList, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {otherUsers.map((u, index) => (
              <View
                key={u.id}
                style={[
                  styles.userRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < otherUsers.length - 1 ? 1 : 0,
                  },
                ]}
              >
                <View style={styles.roleBadgeWrapper}>
                  {user?.role === "admin" && u.id !== user?.id && (
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          "تغيير الدور",
                          `تغيير دور ${u.name}`,
                          (["customer", "merchant", "employee", "admin"] as UserRole[]).map((role) => ({
                            text: ROLE_LABELS[role],
                            onPress: () => handleChangeRole(u.id, role),
                          }))
                        );
                      }}
                      style={[styles.roleChip, { backgroundColor: colors.gold + "22" }]}
                    >
                      <Text style={[{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 12 }]}>
                        {ROLE_LABELS[u.role]}
                      </Text>
                      <Feather name="chevron-down" size={10} color={colors.gold} />
                    </Pressable>
                  )}
                  {(u.id === user?.id || user?.role !== "admin") && (
                    <View style={[styles.roleChipStatic, { backgroundColor: colors.secondary }]}>
                      <Text style={[{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 12 }]}>
                        {ROLE_LABELS[u.role]}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {u.name}
                  </Text>
                  <Text style={[styles.userPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {u.phone}
                  </Text>
                </View>
                <View style={[styles.userAvatar, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44" }]}>
                  <Text style={[{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 16 }]}>
                    {u.name.charAt(0)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 20 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, textAlign: "right" },
  upgradeCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  userInfo: { flex: 1, gap: 3 },
  userName: { fontSize: 14, textAlign: "right" },
  userPhone: { fontSize: 12, textAlign: "right" },
  upgradeActions: { flexDirection: "row-reverse", gap: 8 },
  rejectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  approveBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  usersList: { borderWidth: 1, overflow: "hidden" },
  userRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  userDetails: { flex: 1, gap: 3, alignItems: "flex-end" },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadgeWrapper: { alignItems: "flex-end" },
  roleChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleChipStatic: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
});
