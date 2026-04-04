import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import Icon from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, User, UserRole, EmployeePermission } from "@/context/AppContext";
import { notifyUserByPhone } from "@/lib/pushService";
import GoldHeader from "@/components/GoldHeader";

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "زبون",
  merchant: "تاجر",
  employee: "موظف",
  supervisor: "مشرف",
  admin: "مدير",
};

const ROLE_COLORS: Record<UserRole, string> = {
  customer: "#888",
  merchant: "#C9A84C",
  employee: "#2980B9",
  supervisor: "#8E44AD",
  admin: "#C0392B",
};

const PERMISSION_LABELS: Record<EmployeePermission, string> = {
  view_orders: "عرض الطلبات",
  edit_orders: "تعديل الطلبات",
  view_products: "عرض المنتجات",
  edit_products: "تعديل المنتجات",
  view_users: "عرض المستخدمين",
  send_notifications: "إرسال الإشعارات",
  manage_staff: "إدارة الموظفين",
  approve_upgrades: "الموافقة على الترقيات",
  delete_orders: "حذف الطلبات",
};

const EMPLOYEE_PERMISSIONS: EmployeePermission[] = [
  "view_orders",
  "edit_orders",
  "view_products",
  "edit_products",
  "view_users",
  "send_notifications",
];

const SUPERVISOR_PERMISSIONS: EmployeePermission[] = [
  "view_orders",
  "edit_orders",
  "view_products",
  "edit_products",
  "view_users",
  "send_notifications",
  "manage_staff",
  "approve_upgrades",
  "delete_orders",
];

// Static demo staff (not in registeredCustomers)
const DEMO_STAFF: User[] = [
  { id: "u1", phone: "0000000001", name: "مدير النظام", role: "admin" },
  {
    id: "u3",
    phone: "0000000003",
    name: "موظف",
    role: "employee",
    permissions: ["view_orders", "view_products"],
  },
  {
    id: "u4",
    phone: "0000000004",
    name: "مشرف",
    role: "supervisor",
    permissions: ["view_orders", "edit_orders", "view_products", "view_users", "send_notifications", "approve_upgrades"],
  },
];

type TabKey = "customers" | "staff";

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, registeredCustomers, updateRegisteredCustomer, registerCustomer, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>("customers");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Merge DEMO_STAFF with Firestore data — Firestore data always wins (has real permissions)
  const staffList: User[] = DEMO_STAFF.map((demo) => {
    const fromRegistry = registeredCustomers.find((c) => c.phone === demo.phone);
    return fromRegistry ? { ...demo, ...fromRegistry } : demo;
  });

  // Save staff member to Firestore & registered list
  const saveStaffMember = (updatedUser: User) => {
    const exists = registeredCustomers.find((c) => c.phone === updatedUser.phone);
    if (exists) {
      updateRegisteredCustomer(updatedUser);
    } else {
      registerCustomer(updatedUser);
    }
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Customers & merchants from registeredCustomers — deduplicate by phone as safety net
  const customerList = [
    ...new Map(
      registeredCustomers
        .filter((c) => c.role === "customer" || c.role === "merchant")
        .map((c) => [c.phone, c])
    ).values(),
  ];
  const pendingUpgrades = customerList.filter((u) => u.upgradeStatus === "pending");
  const activeCustomers = customerList.filter((u) => u.upgradeStatus !== "pending");

  const saveCustomerChange = (updatedUser: User) => {
    updateRegisteredCustomer(updatedUser);
  };

  const handleChangeCustomerRole = (userId: string, newRole: UserRole) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Find by id OR phone (safety fallback after deduplication)
    const updated = customerList.find((u) => u.id === userId) || customerList.find((u) => u.phone === userId);
    if (updated) {
      saveCustomerChange({ ...updated, role: newRole, upgradeStatus: undefined });
      // Notify the user about their role change
      if (newRole === "merchant") {
        addNotification({
          id: `role_merchant_${userId}_${Date.now()}`,
          title: "🎉 تمت ترقيتك إلى تاجر!",
          body: "تم تفعيل حسابك كتاجر. أغلق التطبيق وأعد فتحه لتحديث حسابك والاستفادة من أسعار الجملة.",
          createdAt: new Date().toISOString(),
          read: false,
          targetUserId: userId,
        });
        notifyUserByPhone(
          updated.phone,
          "🎉 تمت ترقيتك إلى تاجر!",
          "تم تفعيل حسابك. أغلق التطبيق وأعد فتحه لتحديث حسابك.",
          { type: "role_change", newRole: "merchant" }
        ).catch(() => {});
      } else if (newRole === "customer") {
        addNotification({
          id: `role_customer_${updated.id}_${Date.now()}`,
          title: "تغيير الدور",
          body: "تم تغيير دورك إلى زبون عادي. أغلق التطبيق وأعد فتحه لتحديث الحساب.",
          createdAt: new Date().toISOString(),
          read: false,
          targetUserId: updated.id,
        });
        notifyUserByPhone(
          updated.phone,
          "تغيير الدور",
          "تم تغيير دورك إلى زبون عادي. أغلق التطبيق وأعد فتحه.",
          { type: "role_change", newRole: "customer" }
        ).catch(() => {});
      }
    }
  };

  const handleToggleVip = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const target = customerList.find((u) => u.id === userId);
    if (target) saveCustomerChange({ ...target, vip: !target.vip });
  };

  const handleApproveUpgrade = (userId: string) => {
    Alert.alert("تأكيد", "هل تريد ترقية هذا المستخدم إلى تاجر؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "موافقة", onPress: () => handleChangeCustomerRole(userId, "merchant") },
    ]);
  };

  const handleRejectUpgrade = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const target = customerList.find((u) => u.id === userId);
    if (target) saveCustomerChange({ ...target, upgradeStatus: "rejected" });
  };

  const handleChangeStaffRole = (userId: string, newRole: "employee" | "supervisor") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const defaultPerms = newRole === "supervisor" ? SUPERVISOR_PERMISSIONS : EMPLOYEE_PERMISSIONS;
    const target = staffList.find((u) => u.id === userId);
    if (target) saveStaffMember({ ...target, role: newRole, permissions: defaultPerms });
  };

  const handleToggleStaffPermission = (userId: string, permission: EmployeePermission) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const target = staffList.find((u) => u.id === userId);
    if (!target) return;
    const current = target.permissions ?? [];
    const perms = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];
    saveStaffMember({ ...target, permissions: perms });
  };

  const handleSaveStaffName = (userId: string) => {
    const trimmed = editingNameValue.trim();
    if (trimmed.length < 2) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const target = staffList.find((u) => u.id === userId);
    if (target) saveStaffMember({ ...target, name: trimmed });
    setEditingNameId(null);
    setEditingNameValue("");
  };

  const handleSaveCustomerName = (userId: string) => {
    const trimmed = editingNameValue.trim();
    if (trimmed.length < 2) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const target = customerList.find((u) => u.id === userId);
    if (target) saveCustomerChange({ ...target, name: trimmed });
    setEditingNameId(null);
    setEditingNameValue("");
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "customers", label: "الزبائن والتجار", count: customerList.length },
    { key: "staff", label: "فريق العمل", count: staffList.length },
  ];

  const renderNameEdit = (u: User, onSave: (id: string) => void) => (
    <View style={styles.nameEditRow}>
      {editingNameId === u.id ? (
        <>
          <Pressable
            onPress={() => onSave(u.id)}
            style={[styles.nameActionBtn, { backgroundColor: colors.gold, borderRadius: 8 }]}
          >
            <Icon name="check" size={14} color={colors.background} />
          </Pressable>
          <Pressable
            onPress={() => { setEditingNameId(null); setEditingNameValue(""); }}
            style={[styles.nameActionBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 8 }]}
          >
            <Icon name="x" size={14} color={colors.foreground} />
          </Pressable>
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.gold, fontFamily: "Inter_500Medium" }]}
            value={editingNameValue}
            onChangeText={setEditingNameValue}
            textAlign="right"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => onSave(u.id)}
          />
        </>
      ) : (
        <Pressable
          onPress={() => { setEditingNameId(u.id); setEditingNameValue(u.name); }}
          style={[styles.editNameBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Icon name="edit-3" size={13} color={colors.gold} />
          <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium", fontSize: 12 }}>تعديل الاسم</Text>
        </Pressable>
      )}
    </View>
  );

  const renderPermissions = (u: User, allowedPerms: EmployeePermission[], onToggle: (id: string, p: EmployeePermission) => void) => (
    <View style={{ gap: 8 }}>
      <Text style={[styles.expandLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        الصلاحيات
      </Text>
      <View style={styles.permissionsGrid}>
        {allowedPerms.map((perm) => {
          const active = (u.permissions ?? []).includes(perm);
          return (
            <Pressable
              key={perm}
              onPress={() => onToggle(u.id, perm)}
              style={[
                styles.permChip,
                { backgroundColor: active ? colors.gold + "22" : colors.surface, borderColor: active ? colors.gold : colors.border },
              ]}
            >
              <Icon name={active ? "check-square" : "square"} size={13} color={active ? colors.gold : colors.mutedForeground} />
              <Text style={{ color: active ? colors.gold : colors.foreground, fontFamily: active ? "Inter_500Medium" : "Inter_400Regular", fontSize: 11 }}>
                {PERMISSION_LABELS[perm]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const renderUserCard = (u: User, section: "customer" | "staff") => {
    const isExpanded = expandedUser === u.id;
    const isStaff = section === "staff";
    const showPermissions = (u.role === "employee" || u.role === "supervisor") && isStaff;
    const allowedPerms = u.role === "supervisor" ? SUPERVISOR_PERMISSIONS : EMPLOYEE_PERMISSIONS;

    return (
      <View key={u.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
        <Pressable onPress={() => setExpandedUser(isExpanded ? null : u.id)} style={styles.userRow}>
          <View style={styles.userExpandIcon}>
            <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          </View>
          <View style={styles.userDetails}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                {u.name}
              </Text>
              {u.vip && (
                <View style={[styles.vipBadge, { backgroundColor: colors.gold + "33" }]}>
                  <Icon name="star" size={10} color={colors.gold} />
                  <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 10 }}>مميز</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {u.phone}
            </Text>
            {u.registeredAt && (
              <Text style={[styles.userPhone, { color: colors.mutedForeground + "99", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 2 }]}>
                تسجيل: {new Date(u.registeredAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <View style={[styles.roleChip, { backgroundColor: ROLE_COLORS[u.role] + "22", borderColor: ROLE_COLORS[u.role] + "55" }]}>
              <Text style={{ color: ROLE_COLORS[u.role], fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
                {ROLE_LABELS[u.role]}
              </Text>
            </View>
          </View>
        </Pressable>

        {isExpanded && user?.role === "admin" && u.id !== user.id && (
          <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
            {isStaff ? (
              // Staff edit: name + role change + permissions
              <>
                {renderNameEdit(u, handleSaveStaffName)}
                {(u.role === "employee" || u.role === "supervisor") && (
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.expandLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                      الدور الوظيفي
                    </Text>
                    <View style={{ flexDirection: "row-reverse", gap: 8 }}>
                      {(["supervisor", "employee"] as ("supervisor" | "employee")[]).map((role) => (
                        <Pressable
                          key={role}
                          onPress={() => handleChangeStaffRole(u.id, role)}
                          style={[
                            styles.roleBtn,
                            {
                              backgroundColor: u.role === role ? ROLE_COLORS[role] + "33" : colors.surface,
                              borderColor: u.role === role ? ROLE_COLORS[role] : colors.border,
                              flex: 1,
                              flexDirection: "row-reverse",
                              alignItems: "center",
                              gap: 6,
                              justifyContent: "center",
                            },
                          ]}
                        >
                          <Icon
                            name={role === "supervisor" ? "shield-check" : "briefcase"}
                            size={14}
                            color={u.role === role ? ROLE_COLORS[role] : colors.mutedForeground}
                          />
                          <Text
                            style={{
                              color: u.role === role ? ROLE_COLORS[role] : colors.foreground,
                              fontFamily: u.role === role ? "Inter_700Bold" : "Inter_400Regular",
                              fontSize: 13,
                            }}
                          >
                            {ROLE_LABELS[role]}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                {showPermissions && renderPermissions(u, allowedPerms, handleToggleStaffPermission)}
              </>
            ) : (
              // Customer edit: name + role change + VIP toggle
              <>
                {renderNameEdit(u, handleSaveCustomerName)}
                <Text style={[styles.expandLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  تغيير الدور
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: "row-reverse" }}>
                  {(["customer", "merchant"] as UserRole[]).map((role) => (
                    <Pressable
                      key={role}
                      onPress={() => handleChangeCustomerRole(u.id, role)}
                      style={[styles.roleBtn, { backgroundColor: u.role === role ? colors.gold : colors.surface, borderColor: u.role === role ? colors.gold : colors.border }]}
                    >
                      <Text style={{ color: u.role === role ? colors.background : colors.foreground, fontFamily: u.role === role ? "Inter_600SemiBold" : "Inter_400Regular", fontSize: 12 }}>
                        {ROLE_LABELS[role]}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.vipToggleRow}>
                  <Pressable
                    onPress={() => handleToggleVip(u.id)}
                    style={[styles.vipToggleBtn, { backgroundColor: u.vip ? colors.gold + "22" : colors.surface, borderColor: u.vip ? colors.gold : colors.border }]}
                  >
                    <Icon name="star" size={14} color={u.vip ? colors.gold : colors.mutedForeground} />
                    <Text style={{ color: u.vip ? colors.gold : colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                      {u.vip ? "إلغاء العميل المميز" : "تعيين عميل مميز"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="إدارة المستخدمين" onBack={() => router.back()} />

      {/* Tab switcher */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => { setActiveTab(tab.key); setExpandedUser(null); }}
              style={[styles.tab, { borderBottomColor: active ? colors.gold : "transparent" }]}
            >
              <Text style={[styles.tabText, { color: active ? colors.gold : colors.mutedForeground, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" }]}>
                {tab.label}
              </Text>
              <View style={[styles.tabCount, { backgroundColor: active ? colors.gold + "33" : colors.border + "66" }]}>
                <Text style={{ color: active ? colors.gold : colors.mutedForeground, fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        {activeTab === "customers" ? (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: "إجمالي الزبائن", value: customerList.filter(c => c.role === "customer").length, color: colors.foreground },
                { label: "التجار", value: customerList.filter(c => c.role === "merchant").length, color: colors.gold },
                { label: "طلبات الترقية", value: pendingUpgrades.length, color: "#C0392B" },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: stat.color, fontFamily: "Inter_700Bold" }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Pending upgrades */}
            {pendingUpgrades.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
                  طلبات الترقية ({pendingUpgrades.length})
                </Text>
                {pendingUpgrades.map((u) => (
                  <View key={u.id} style={[styles.upgradeCard, { backgroundColor: colors.gold + "11", borderColor: colors.gold + "44", borderRadius: colors.radius }]}>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{u.name}</Text>
                      <Text style={[styles.userPhone, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{u.phone}</Text>
                    </View>
                    <View style={styles.upgradeActions}>
                      <Pressable onPress={() => handleRejectUpgrade(u.id)} style={[styles.rejectBtn, { borderColor: colors.destructive + "66", borderRadius: 8 }]}>
                        <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>رفض</Text>
                      </Pressable>
                      <Pressable onPress={() => handleApproveUpgrade(u.id)} style={[styles.approveBtn, { backgroundColor: colors.gold, borderRadius: 8 }]}>
                        <Text style={{ color: colors.background, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>موافقة</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Customer list */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                الزبائن والتجار ({activeCustomers.length})
              </Text>
              {activeCustomers.length === 0 && (
                <Text style={[{ color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular", paddingVertical: 20 }]}>
                  لا يوجد زبائن مسجلون بعد
                </Text>
              )}
              {activeCustomers.map((u) => renderUserCard(u, "customer"))}
            </View>
          </>
        ) : (
          <>
            {/* Staff stats */}
            <View style={styles.statsRow}>
              {[
                { label: "موظفون", value: staffList.filter(s => s.role === "employee").length, color: "#2980B9" },
                { label: "مشرفون", value: staffList.filter(s => s.role === "supervisor").length, color: "#8E44AD" },
                { label: "مدراء", value: staffList.filter(s => s.role === "admin").length, color: "#C0392B" },
              ].map((stat) => (
                <View key={stat.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statNum, { color: stat.color, fontFamily: "Inter_700Bold" }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            {/* Staff list */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                فريق العمل ({staffList.length})
              </Text>
              {staffList.map((u) => renderUserCard(u, "staff"))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row-reverse",
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 14 },
  tabCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  content: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, textAlign: "right" },
  statsRow: { flexDirection: "row-reverse", gap: 10 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statNum: { fontSize: 22 },
  statLabel: { fontSize: 10, textAlign: "center" },
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
  userRow: { flexDirection: "row-reverse", alignItems: "center", padding: 14, gap: 12 },
  userExpandIcon: { padding: 2 },
  userDetails: { flex: 1, gap: 3, alignItems: "flex-end" },
  userNameRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  userName: { fontSize: 14 },
  userPhone: { fontSize: 12 },
  roleChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  vipBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  expandedSection: { borderTopWidth: 1, padding: 14, gap: 12 },
  expandLabel: { fontSize: 12, textAlign: "right" },
  roleBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1 },
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
  permissionsGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  permChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  nameEditRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  nameInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  nameActionBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  editNameBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
});
