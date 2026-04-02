import React, { useState } from "react";
import {
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp, AppSettings, ContactEntry, SocialEntry } from "@/context/AppContext";
import { persistImageUri } from "@/utils/persistImage";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";

const CONTACT_ICONS = ["headphones", "phone", "shopping-bag", "briefcase", "user", "mail"];
const SOCIAL_ICONS = ["message-circle", "instagram", "facebook", "twitter", "youtube", "globe"];

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
}) {
  const colors = useColors();
  return (
    <View style={fieldStyles.group}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
      <TextInput
        style={[
          fieldStyles.input,
          {
            color: colors.foreground,
            backgroundColor: colors.input,
            borderColor: colors.border,
            fontFamily: "Inter_400Regular",
          },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        textAlign="right"
        keyboardType={keyboardType}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { gap: 5 },
  label: { fontSize: 11, textAlign: "right" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});

export default function AdminSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setSettings } = useApp();
  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 24 : 0);

  const [draft, setDraft] = useState<AppSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);

  const pickBannerImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى المعرض"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      setMediaLoading(true);
      const uri = await persistImageUri(result.assets[0].uri);
      setDraft((d) => ({ ...d, bannerImageUri: uri }));
      setMediaLoading(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const pickBannerVideo = async () => {
    const current = draft.bannerVideoUris ?? [];
    if (current.length >= 3) {
      Alert.alert("الحد الأقصى", "يمكن إضافة 3 فيديوهات كحد أقصى");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى المعرض"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setMediaLoading(true);
      const uri = await persistImageUri(result.assets[0].uri);
      setDraft((d) => ({ ...d, bannerVideoUris: [...(d.bannerVideoUris ?? []), uri] }));
      setMediaLoading(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeVideo = (idx: number) => {
    setDraft((d) => ({ ...d, bannerVideoUris: (d.bannerVideoUris ?? []).filter((_, i) => i !== idx) }));
  };

  const clearBanner = () => {
    setDraft((d) => ({ ...d, bannerImageUri: undefined, bannerVideoUris: [] }));
  };

  const save = async () => {
    setSaving(true);
    await setSettings(draft);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    Alert.alert("تم", "تم حفظ الإعدادات بنجاح");
  };

  const updateContact = (id: string, field: keyof ContactEntry, value: string) => {
    setDraft((d) => ({
      ...d,
      contacts: d.contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  const deleteContact = (id: string) => {
    setDraft((d) => ({ ...d, contacts: d.contacts.filter((c) => c.id !== id) }));
  };

  const addContact = () => {
    const newEntry: ContactEntry = {
      id: Date.now().toString(),
      label: "رقم جديد",
      number: "",
      icon: "phone",
    };
    setDraft((d) => ({ ...d, contacts: [...d.contacts, newEntry] }));
  };

  const updateSocial = (id: string, field: keyof SocialEntry, value: string) => {
    setDraft((d) => ({
      ...d,
      social: d.social.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const deleteSocial = (id: string) => {
    setDraft((d) => ({ ...d, social: d.social.filter((s) => s.id !== id) }));
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || draft.categories.includes(trimmed)) return;
    setDraft((d) => ({ ...d, categories: [...d.categories, trimmed] }));
    setNewCategory("");
  };

  const deleteCategory = (cat: string) => {
    if (cat === "الكل") return;
    setDraft((d) => ({ ...d, categories: d.categories.filter((c) => c !== cat) }));
  };

  const Card = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="إعدادات التطبيق" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card title="النبذة التعريفية">
          <Field
            label="عنوان النبذة"
            value={draft.aboutTitle}
            onChange={(v) => setDraft((d) => ({ ...d, aboutTitle: v }))}
            placeholder="مثال: شمس تكس"
          />
          <View style={{ gap: 5 }}>
            <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }]}>
              نص النبذة
            </Text>
            <TextInput
              style={[
                styles.multiline,
                {
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={draft.aboutText}
              onChangeText={(v) => setDraft((d) => ({ ...d, aboutText: v }))}
              multiline
              numberOfLines={4}
              textAlign="right"
              placeholder="اكتب نبذة عن الشركة..."
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
        </Card>

        <Card title="المحتوى الإعلاني">
          {draft.bannerImageUri && (
            <View style={[styles.bannerPreview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image source={{ uri: draft.bannerImageUri }} style={styles.bannerPreviewImg} resizeMode="cover" />
              <Pressable onPress={clearBanner} style={[styles.clearBannerBtn, { backgroundColor: colors.destructive }]}>
                <Icon name="x" size={14} color="#FFF" />
              </Pressable>
            </View>
          )}
          {(draft.bannerVideoUris ?? []).length > 0 && (
            <View style={{ gap: 8 }}>
              {(draft.bannerVideoUris ?? []).map((uri, idx) => (
                <View
                  key={uri}
                  style={[styles.videoBadge, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44" }]}
                >
                  <View style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                    <Icon name="film" size={20} color={colors.gold} />
                    <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium", fontSize: 12, flex: 1, textAlign: "right" }} numberOfLines={1}>
                      فيديو {idx + 1}
                    </Text>
                  </View>
                  <Pressable onPress={() => removeVideo(idx)} style={[styles.clearBannerBtn, { backgroundColor: colors.destructive, position: "relative", top: 0, right: 0 }]}>
                    <Icon name="x" size={14} color="#FFF" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <View style={styles.bannerBtns}>
            <Pressable
              onPress={pickBannerVideo}
              disabled={mediaLoading || (draft.bannerVideoUris ?? []).length >= 3}
              style={({ pressed }) => [
                styles.bannerBtn,
                { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44", opacity: (pressed || mediaLoading || (draft.bannerVideoUris ?? []).length >= 3) ? 0.5 : 1 },
              ]}
            >
              <Icon name="film" size={18} color={colors.gold} />
              <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                {(draft.bannerVideoUris ?? []).length >= 3 ? "اكتملت الفيديوهات" : `رفع فيديو (${(draft.bannerVideoUris ?? []).length}/3)`}
              </Text>
            </Pressable>
            <Pressable
              onPress={pickBannerImage}
              disabled={mediaLoading}
              style={({ pressed }) => [
                styles.bannerBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed || mediaLoading ? 0.7 : 1 },
              ]}
            >
              <Icon name="image" size={18} color={colors.foreground} />
              <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
                رفع صورة
              </Text>
            </Pressable>
          </View>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular" }}>
            يمكن رفع حتى 3 فيديوهات متتابعة أو صورة في البانر الرئيسي
          </Text>
        </Card>

        <Card title="فئات المنتجات">
          <View style={styles.tagsWrap}>
            {draft.categories.map((cat) => (
              <View
                key={cat}
                style={[
                  styles.tag,
                  {
                    backgroundColor: cat === "الكل" ? colors.gold + "33" : colors.surface,
                    borderColor: cat === "الكل" ? colors.gold : colors.border,
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                  {cat}
                </Text>
                {cat !== "الكل" && (
                  <Pressable onPress={() => deleteCategory(cat)}>
                    <Icon name="x" size={14} color={colors.mutedForeground} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
          <View style={styles.addRow}>
            <GoldButton
              label="إضافة"
              onPress={addCategory}
              size="sm"
              style={{ minWidth: 80 }}
              disabled={!newCategory.trim()}
            />
            <TextInput
              style={[
                styles.addInput,
                {
                  flex: 1,
                  color: colors.foreground,
                  backgroundColor: colors.input,
                  borderColor: colors.border,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="اسم الفئة الجديدة"
              placeholderTextColor={colors.mutedForeground}
              textAlign="right"
              onSubmitEditing={addCategory}
              returnKeyType="done"
            />
          </View>
        </Card>

        <Card title="أرقام التواصل">
          {draft.contacts.map((contact) => (
            <View
              key={contact.id}
              style={[
                styles.entryBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Pressable
                onPress={() => deleteContact(contact.id)}
                style={styles.deleteBtn}
              >
                <Icon name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
              <View style={styles.entryFields}>
                <Field
                  label="التسمية"
                  value={contact.label}
                  onChange={(v) => updateContact(contact.id, "label", v)}
                  placeholder="مثال: المبيعات"
                />
                <Field
                  label="رقم الهاتف"
                  value={contact.number}
                  onChange={(v) => updateContact(contact.id, "number", v)}
                  placeholder="+20 100 000 0000"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          ))}
          <GoldButton
            label="إضافة رقم"
            onPress={addContact}
            variant="outline"
            size="sm"
            style={{ width: "100%" }}
          />
        </Card>

        <Card title="روابط التواصل الاجتماعي">
          {draft.social.map((item) => (
            <View
              key={item.id}
              style={[
                styles.entryBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Pressable
                onPress={() => deleteSocial(item.id)}
                style={styles.deleteBtn}
              >
                <Icon name="trash-2" size={16} color={colors.destructive} />
              </Pressable>
              <View style={styles.entryFields}>
                <Field
                  label="الاسم"
                  value={item.label}
                  onChange={(v) => updateSocial(item.id, "label", v)}
                  placeholder="مثال: إنستغرام"
                />
                <Field
                  label="الرابط"
                  value={item.url}
                  onChange={(v) => updateSocial(item.id, "url", v)}
                  placeholder="https://..."
                  keyboardType="url"
                />
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: bottomPad,
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
          },
        ]}
      >
        <GoldButton
          label="حفظ الإعدادات"
          onPress={save}
          loading={saving}
          style={{ flex: 1 }}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  cardTitle: { fontSize: 15, textAlign: "right" },
  multiline: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },
  tagsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagText: { fontSize: 12 },
  addRow: {
    flexDirection: "row-reverse",
    gap: 10,
    alignItems: "center",
  },
  addInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  entryBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  deleteBtn: {
    alignSelf: "flex-start",
    padding: 4,
  },
  entryFields: { gap: 10 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bannerPreview: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bannerPreviewImg: { width: "100%", height: 110 },
  videoBadge: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBannerBtn: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerBtns: { flexDirection: "row-reverse", gap: 10 },
  bannerBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
