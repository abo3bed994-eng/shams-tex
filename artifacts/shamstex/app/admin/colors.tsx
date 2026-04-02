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
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, ColorOption } from "@/context/AppContext";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

export default function AdminColorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setSettings } = useApp();

  const [colorList, setColorList] = useState<ColorOption[]>([...settings.globalColors]);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#");
  const [saving, setSaving] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 56 : 16);

  const handleAdd = () => {
    const trimmedName = newName.trim();
    const trimmedHex = newHex.trim();
    if (!trimmedName || !trimmedHex.match(/^#([0-9A-Fa-f]{6})$/)) {
      Alert.alert("خطأ", "أدخل اسماً صحيحاً ورمز HEX صحيح (مثال: #FF5733)");
      return;
    }
    if (colorList.some((c) => c.name === trimmedName)) {
      Alert.alert("تنبيه", "هذا الاسم موجود بالفعل");
      return;
    }
    setColorList((prev) => [...prev, { name: trimmedName, hex: trimmedHex, quantity: 50 }]);
    setNewName("");
    setNewHex("#");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDelete = (name: string) => {
    setColorList((prev) => prev.filter((c) => c.name !== name));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleUpdateHex = (name: string, hex: string) => {
    setColorList((prev) =>
      prev.map((c) => (c.name === name ? { ...c, hex } : c))
    );
  };

  const handleUpdateName = (oldName: string, newNameVal: string) => {
    setColorList((prev) =>
      prev.map((c) => (c.name === oldName ? { ...c, name: newNameVal } : c))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await setSettings({ ...settings, globalColors: colorList });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    Alert.alert("تم", "تم حفظ الألوان بنجاح");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="لوحة الألوان" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            إضافة لون جديد
          </Text>
          <View style={styles.hexRow}>
            <View style={[styles.colorPreview, { backgroundColor: newHex.match(/^#[0-9A-Fa-f]{6}$/) ? newHex : "#444" }]} />
            <TextInput
              style={[styles.hexInput, { flex: 1, color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
              value={newHex}
              onChangeText={setNewHex}
              placeholder="#FFFFFF"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="characters"
              maxLength={7}
              textAlign="right"
            />
            <TextInput
              style={[styles.hexInput, { flex: 2, color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="اسم اللون (مثال: أبيض)"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
            />
          </View>
          <GoldButton label="إضافة اللون" onPress={handleAdd} variant="outline" size="sm" style={{ alignSelf: "flex-end" }} disabled={!newName.trim() || !newHex.match(/^#[0-9A-Fa-f]{6}$/)} />
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            الألوان الحالية ({colorList.length})
          </Text>
          {colorList.map((color) => (
            <View key={color.name} style={[styles.colorRow, { borderBottomColor: colors.border }]}>
              <Pressable onPress={() => handleDelete(color.name)} style={styles.deleteBtn}>
                <Feather name="trash-2" size={15} color={colors.destructive} />
              </Pressable>
              <View style={styles.colorFields}>
                <TextInput
                  style={[styles.smallInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                  value={color.name}
                  onChangeText={(v) => handleUpdateName(color.name, v)}
                  textAlign="right"
                />
                <View style={styles.hexEditRow}>
                  <View style={[styles.colorSwatchSm, { backgroundColor: color.hex.match(/^#[0-9A-Fa-f]{6}$/) ? color.hex : "#444" }]} />
                  <TextInput
                    style={[styles.hexSmall, { flex: 1, color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_400Regular" }]}
                    value={color.hex}
                    onChangeText={(v) => handleUpdateHex(color.name, v)}
                    autoCapitalize="characters"
                    maxLength={7}
                    textAlign="right"
                  />
                </View>
              </View>
              <View style={[styles.bigSwatch, { backgroundColor: color.hex.match(/^#[0-9A-Fa-f]{6}$/) ? color.hex : "#333", borderColor: colors.border }]} />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: bottomPad + 16 }]}>
        <GoldButton label="حفظ الألوان" onPress={handleSave} loading={saving} style={{ flex: 1 }} size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  addCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  listCard: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  cardTitle: { fontSize: 15, textAlign: "right" },
  hexRow: { flexDirection: "row-reverse", gap: 8, alignItems: "center" },
  colorPreview: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#444" },
  hexInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 13 },
  colorRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  deleteBtn: { padding: 6 },
  colorFields: { flex: 1, gap: 6 },
  smallInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13 },
  hexEditRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  colorSwatchSm: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#444" },
  hexSmall: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 12 },
  bigSwatch: { width: 50, height: 50, borderRadius: 10, borderWidth: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
});
