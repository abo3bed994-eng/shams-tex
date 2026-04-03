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
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";
import Icon from "@/components/Icon";

type NotifType = "all" | "customers" | "private";

const TYPE_OPTIONS: { key: NotifType; label: string; icon: string; desc: string }[] = [
  { key: "all", label: "للجميع", icon: "globe", desc: "يصل لجميع المستخدمين" },
  { key: "customers", label: "للعملاء", icon: "users", desc: "للعملاء فقط (إعلانات وعروض)" },
  { key: "private", label: "خاص", icon: "user", desc: "رسالة لشخص محدد فقط" },
];

export default function AdminNotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addNotification, notifications, registeredCustomers } = useApp();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notifType, setNotifType] = useState<NotifType>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const selectedUser = registeredCustomers.find((c) => c.id === selectedUserId);

  const handleSend = async () => {
    if (!title || !body) {
      Alert.alert("خطأ", "الرجاء إدخال العنوان والمحتوى");
      return;
    }
    if (notifType === "private" && !selectedUserId) {
      Alert.alert("خطأ", "الرجاء اختيار المستخدم");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    const notif: any = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    };

    if (notifType === "customers") notif.targetRole = "customer";
    if (notifType === "private") notif.targetUserId = selectedUserId;

    await addNotification(notif);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    setTitle("");
    setBody("");
    setSelectedUserId(null);

    const successMsg =
      notifType === "all"
        ? "تم إرسال الإشعار لجميع المستخدمين"
        : notifType === "customers"
        ? "تم إرسال الإشعار لجميع العملاء"
        : `تم إرسال الإشعار لـ ${selectedUser?.name}`;

    Alert.alert("تم الإرسال", successMsg);
  };

  const recentNotifs = notifications.slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="إرسال إشعار" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* نوع الإشعار */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            نوع الإشعار
          </Text>
          <View style={styles.typeRow}>
            {TYPE_OPTIONS.map((opt) => {
              const active = notifType === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => {
                    setNotifType(opt.key);
                    setSelectedUserId(null);
                    setShowUserPicker(false);
                  }}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: active ? colors.gold + "22" : colors.surface,
                      borderColor: active ? colors.gold : colors.border,
                      borderRadius: colors.radius - 4,
                    },
                  ]}
                >
                  <Icon name={opt.icon as any} size={18} color={active ? colors.gold : colors.mutedForeground} />
                  <Text style={[styles.typeLabel, { color: active ? colors.gold : colors.foreground, fontFamily: active ? "Inter_700Bold" : "Inter_400Regular" }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.typeDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {opt.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* اختيار مستخدم عند الإشعار الخاص */}
        {notifType === "private" && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              اختر المستخدم
            </Text>
            <Pressable
              onPress={() => setShowUserPicker(!showUserPicker)}
              style={[
                styles.userPickerBtn,
                {
                  backgroundColor: colors.input,
                  borderColor: selectedUserId ? colors.gold : colors.border,
                  borderRadius: colors.radius - 4,
                },
              ]}
            >
              <Icon name={showUserPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
              <Text style={[styles.userPickerText, { color: selectedUserId ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {selectedUser ? `${selectedUser.name} - ${selectedUser.phone}` : "اختر مستخدماً..."}
              </Text>
            </Pressable>
            {showUserPicker && (
              <View style={[styles.userList, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius - 4 }]}>
                {registeredCustomers.length === 0 ? (
                  <Text style={[styles.noUsers, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    لا يوجد عملاء مسجلون
                  </Text>
                ) : (
                  registeredCustomers.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => { setSelectedUserId(c.id); setShowUserPicker(false); }}
                      style={[
                        styles.userItem,
                        {
                          backgroundColor: selectedUserId === c.id ? colors.gold + "22" : "transparent",
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.userAvatar, { backgroundColor: colors.gold + "33" }]}>
                        <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                          {c.name.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "right" }}>
                          {c.name}
                        </Text>
                        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>
                          {c.phone}
                        </Text>
                      </View>
                      {selectedUserId === c.id && (
                        <Icon name="check" size={16} color={colors.gold} />
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>
        )}

        {/* محتوى الإشعار */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            محتوى الإشعار
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              العنوان
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 4,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="عنوان الإشعار"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              الرسالة
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  borderRadius: colors.radius - 4,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={body}
              onChangeText={setBody}
              placeholder="اكتب رسالتك هنا..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              textAlign="right"
            />
          </View>

          <GoldButton
            label={
              notifType === "all"
                ? "إرسال للجميع"
                : notifType === "customers"
                ? "إرسال للعملاء"
                : selectedUser
                ? `إرسال لـ ${selectedUser.name}`
                : "إرسال"
            }
            onPress={handleSend}
            loading={loading}
            style={{ width: "100%" }}
          />
        </View>

        {recentNotifs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "right" }]}>
              آخر الإشعارات المرسلة
            </Text>
            {recentNotifs.map((n) => (
              <View
                key={n.id}
                style={[
                  styles.notifItem,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <View style={[styles.notifIcon, { backgroundColor: colors.gold + "22" }]}>
                  <Icon name="bell" size={16} color={colors.gold} />
                </View>
                <View style={styles.notifContent}>
                  <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.notifTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {n.title}
                    </Text>
                    {n.targetUserId && (
                      <View style={[styles.targetBadge, { backgroundColor: "#9B59B622", borderColor: "#9B59B644" }]}>
                        <Text style={{ color: "#9B59B6", fontSize: 9, fontFamily: "Inter_600SemiBold" }}>خاص</Text>
                      </View>
                    )}
                    {n.targetRole === "customer" && (
                      <View style={[styles.targetBadge, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44" }]}>
                        <Text style={{ color: colors.gold, fontSize: 9, fontFamily: "Inter_600SemiBold" }}>عملاء</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.notifBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
                    {n.body}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  section: { gap: 12, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 15, textAlign: "right" },
  typeRow: { flexDirection: "row-reverse", gap: 8 },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  typeLabel: { fontSize: 13 },
  typeDesc: { fontSize: 10, textAlign: "center" },
  userPickerBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  userPickerText: { flex: 1, fontSize: 13, textAlign: "right" },
  userList: {
    borderWidth: 1,
    overflow: "hidden",
    maxHeight: 220,
  },
  noUsers: { padding: 16, textAlign: "center", fontSize: 13 },
  userItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, textAlign: "right" },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
  },
  notifItem: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1, gap: 4 },
  notifTitle: { fontSize: 13 },
  notifBody: { fontSize: 12, textAlign: "right" },
  targetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
});
