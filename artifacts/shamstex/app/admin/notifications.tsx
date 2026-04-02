import React, { useState } from "react";
import {
  Alert,
  Platform,
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

export default function AdminNotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addNotification, notifications } = useApp();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSend = async () => {
    if (!title || !body) {
      Alert.alert("خطأ", "الرجاء إدخال العنوان والمحتوى");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    await addNotification({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      body,
      createdAt: new Date().toISOString(),
      read: false,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    setTitle("");
    setBody("");
    Alert.alert("تم", "تم إرسال الإشعار لجميع المستخدمين");
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
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            إشعار جديد
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
              محتوى الإشعار
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
            label="إرسال لجميع المستخدمين"
            onPress={handleSend}
            loading={loading}
            style={{ width: "100%" }}
          />
        </View>

        {recentNotifs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold", textAlign: "right" }]}>
              آخر الإشعارات
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
                  <Text style={[styles.notifTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {n.title}
                  </Text>
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
  content: { padding: 16, gap: 20 },
  section: { gap: 14 },
  sectionTitle: { fontSize: 16 },
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
  notifTitle: { fontSize: 13, textAlign: "right" },
  notifBody: { fontSize: 12, textAlign: "right" },
});
