import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { useApp, AppSettings, ContactEntry, SocialEntry, WorkingDay, PaymentSettings } from "@/context/AppContext";
import { persistImageUri } from "@/utils/persistImage";
import GoldHeader from "@/components/GoldHeader";
import GoldButton from "@/components/GoldButton";
import { useAdminGuard } from "@/hooks/useAdminGuard";

const SOCIAL_ICONS = ["message-circle", "instagram", "facebook", "tiktok", "twitter", "youtube", "globe"];

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
  useAdminGuard();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, setSettings } = useApp();
  const bottomPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, Platform.OS === "android" ? 24 : 0);

  const [draft, setDraft] = useState<AppSettings>({
    ...settings,
    subcategories: settings.subcategories ?? {},
    stats: settings.stats ?? { clients: "+500", products: "+50", years: "15+" },
  });
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [newSubMap, setNewSubMap] = useState<Record<string, string>>({});

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
    if (current.length >= 3) { Alert.alert("الحد الأقصى", "يمكن إضافة 3 فيديوهات كحد أقصى"); return; }
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

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى المعرض"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]) {
      setMediaLoading(true);
      const uri = await persistImageUri(result.assets[0].uri);
      setDraft((d) => ({ ...d, logoUri: uri }));
      setMediaLoading(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const addSocial = () => {
    const newEntry: SocialEntry = {
      id: Date.now().toString(),
      label: "رابط جديد",
      icon: "globe",
      url: "https://",
    };
    setDraft((d) => ({ ...d, social: [...d.social, newEntry] }));
  };

  const addCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed || draft.categories.includes(trimmed)) return;
    setDraft((d) => ({ ...d, categories: [...d.categories, trimmed] }));
    setNewCategory("");
  };

  const deleteCategory = (cat: string) => {
    if (cat === "الكل") return;
    setDraft((d) => ({
      ...d,
      categories: d.categories.filter((c) => c !== cat),
      subcategories: Object.fromEntries(
        Object.entries(d.subcategories ?? {}).filter(([k]) => k !== cat)
      ),
    }));
  };

  const moveCategoryUp = (idx: number) => {
    if (idx <= 1) return;
    setDraft((d) => {
      const cats = [...d.categories];
      [cats[idx], cats[idx - 1]] = [cats[idx - 1], cats[idx]];
      return { ...d, categories: cats };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const moveCategoryDown = (idx: number) => {
    if (idx === 0) return;
    setDraft((d) => {
      if (idx >= d.categories.length - 1) return d;
      const cats = [...d.categories];
      [cats[idx], cats[idx + 1]] = [cats[idx + 1], cats[idx]];
      return { ...d, categories: cats };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addSubcategory = (cat: string) => {
    const trimmed = (newSubMap[cat] ?? "").trim();
    if (!trimmed) return;
    const existing = (draft.subcategories ?? {})[cat] ?? [];
    if (existing.includes(trimmed)) return;
    setDraft((d) => ({
      ...d,
      subcategories: {
        ...(d.subcategories ?? {}),
        [cat]: [...existing, trimmed],
      },
    }));
    setNewSubMap((prev) => ({ ...prev, [cat]: "" }));
  };

  const deleteSubcategory = (cat: string, sub: string) => {
    setDraft((d) => ({
      ...d,
      subcategories: {
        ...(d.subcategories ?? {}),
        [cat]: ((d.subcategories ?? {})[cat] ?? []).filter((s) => s !== sub),
      },
    }));
  };

  const Card = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  const editableCategories = draft.categories.filter((c) => c !== "الكل");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="إعدادات التطبيق" onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card title="الشعار (اللوجو)">
          <View style={{ alignItems: "center", gap: 12 }}>
            {draft.logoUri ? (
              <Image
                source={{ uri: draft.logoUri }}
                style={{ width: 100, height: 100, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require("../../assets/images/logo.png")}
                style={{ width: 100, height: 100, borderRadius: 20 }}
                resizeMode="contain"
              />
            )}
            <View style={{ flexDirection: "row-reverse", gap: 10 }}>
              <Pressable
                onPress={pickLogo}
                style={{ flexDirection: "row-reverse", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.gold + "15", borderColor: colors.gold + "44", borderWidth: 1, borderRadius: 8 }}
              >
                <Icon name="upload" size={14} color={colors.gold} />
                <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
                  {draft.logoUri ? "تغيير الشعار" : "رفع شعار مخصص"}
                </Text>
              </Pressable>
              {draft.logoUri && (
                <Pressable
                  onPress={() => setDraft((d) => ({ ...d, logoUri: undefined }))}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#C0392B11", borderColor: "#C0392B44", borderWidth: 1, borderRadius: 8 }}
                >
                  <Text style={{ color: "#C0392B", fontFamily: "Inter_600SemiBold", fontSize: 13 }}>إزالة</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Card>


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

        <Card title="الإحصائيات">
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <Field
                label="عدد العملاء"
                value={draft.stats?.clients ?? "+500"}
                onChange={(v) => setDraft((d) => ({ ...d, stats: { ...(d.stats ?? {}), clients: v } as any }))}
                placeholder="+500"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="عدد الخامات"
                value={draft.stats?.products ?? "+50"}
                onChange={(v) => setDraft((d) => ({ ...d, stats: { ...(d.stats ?? {}), products: v } as any }))}
                placeholder="+50"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="سنوات الخبرة"
                value={draft.stats?.years ?? "15+"}
                onChange={(v) => setDraft((d) => ({ ...d, stats: { ...(d.stats ?? {}), years: v } as any }))}
                placeholder="15+"
              />
            </View>
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
          <View style={[styles.catFixedRow, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44" }]}>
            <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>الكل</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: "Inter_400Regular" }}>ثابت</Text>
          </View>

          {editableCategories.map((cat, i) => {
            const realIdx = draft.categories.indexOf(cat);
            const isFirst = realIdx === 1;
            const isLast = realIdx === draft.categories.length - 1;
            return (
              <View
                key={cat}
                style={[styles.catListRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.catRowArrows}>
                  <Pressable
                    onPress={() => moveCategoryUp(realIdx)}
                    disabled={isFirst}
                    style={[styles.arrowBtn, { opacity: isFirst ? 0.3 : 1 }]}
                  >
                    <Icon name="chevron-up" size={16} color={colors.gold} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveCategoryDown(realIdx)}
                    disabled={isLast}
                    style={[styles.arrowBtn, { opacity: isLast ? 0.3 : 1 }]}
                  >
                    <Icon name="chevron-down" size={16} color={colors.gold} />
                  </Pressable>
                </View>
                <Text style={[styles.catListName, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}>
                  {cat}
                </Text>
                <Pressable
                  onPress={() => deleteCategory(cat)}
                  style={[styles.deleteCatBtn, { alignSelf: "center" }]}
                >
                  <Icon name="x" size={14} color={colors.destructive} />
                </Pressable>
              </View>
            );
          })}

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

        <Card title="الفئات الفرعية">
          {editableCategories.length === 0 ? (
            <Text style={{ color: colors.mutedForeground, textAlign: "right", fontSize: 13, fontFamily: "Inter_400Regular" }}>
              أضف فئات رئيسية أولاً
            </Text>
          ) : (
            editableCategories.map((cat) => {
              const subs = (draft.subcategories ?? {})[cat] ?? [];
              return (
                <View key={cat} style={[styles.subCatGroup, { borderColor: colors.border }]}>
                  <Text style={[styles.subCatGroupTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {cat}
                  </Text>
                  {subs.length > 0 && (
                    <View style={styles.subTagsWrap}>
                      {subs.map((sub) => (
                        <View
                          key={sub}
                          style={[styles.subTag, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        >
                          <Pressable
                            onPress={() => deleteSubcategory(cat, sub)}
                            style={{ padding: 2 }}
                          >
                            <Icon name="x" size={12} color={colors.mutedForeground} />
                          </Pressable>
                          <Text style={[styles.subTagText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                            {sub}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.addRow}>
                    <GoldButton
                      label="إضافة"
                      onPress={() => addSubcategory(cat)}
                      size="sm"
                      style={{ minWidth: 80 }}
                      disabled={!(newSubMap[cat] ?? "").trim()}
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
                      value={newSubMap[cat] ?? ""}
                      onChangeText={(v) => setNewSubMap((prev) => ({ ...prev, [cat]: v }))}
                      placeholder={`فئة فرعية من ${cat}`}
                      placeholderTextColor={colors.mutedForeground}
                      textAlign="right"
                      onSubmitEditing={() => addSubcategory(cat)}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Card title="أرقام التواصل">
          {draft.contacts.map((contact) => (
            <View
              key={contact.id}
              style={[styles.entryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Pressable onPress={() => deleteContact(contact.id)} style={styles.deleteBtn}>
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

        <Card title="ساعات العمل">
          {(draft.workingHours ?? []).map((day, idx) => (
            <View
              key={day.day}
              style={[styles.workDayRow, { backgroundColor: colors.surface, borderColor: day.enabled ? colors.gold + "44" : colors.border }]}
            >
              <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: day.enabled ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                  {day.day}
                </Text>
                <Switch
                  value={day.enabled}
                  onValueChange={(v) => {
                    setDraft((d) => ({
                      ...d,
                      workingHours: (d.workingHours ?? []).map((wd, i) =>
                        i === idx ? { ...wd, enabled: v } : wd
                      ),
                    }));
                  }}
                  trackColor={{ false: colors.border, true: colors.gold + "66" }}
                  thumbColor={day.enabled ? colors.gold : colors.mutedForeground}
                />
              </View>
              {day.enabled && (
                <View style={{ flexDirection: "row-reverse", gap: 10, alignItems: "center" }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>من</Text>
                    <TextInput
                      style={[styles.timeInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_500Medium" }]}
                      value={day.from}
                      onChangeText={(v) => {
                        setDraft((d) => ({
                          ...d,
                          workingHours: (d.workingHours ?? []).map((wd, i) =>
                            i === idx ? { ...wd, from: v } : wd
                          ),
                        }));
                      }}
                      placeholder="09:00"
                      placeholderTextColor={colors.mutedForeground}
                      textAlign="center"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>إلى</Text>
                    <TextInput
                      style={[styles.timeInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_500Medium" }]}
                      value={day.to}
                      onChangeText={(v) => {
                        setDraft((d) => ({
                          ...d,
                          workingHours: (d.workingHours ?? []).map((wd, i) =>
                            i === idx ? { ...wd, to: v } : wd
                          ),
                        }));
                      }}
                      placeholder="17:00"
                      placeholderTextColor={colors.mutedForeground}
                      textAlign="center"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}
            </View>
          ))}
          <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, marginTop: 4, borderTopWidth: 1, borderColor: colors.border }}>
            <View style={{ flex: 1, marginEnd: 12 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "right" }}>
                تعليق الطلبات خارج أوقات العمل
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular", marginTop: 2 }}>
                {draft.suspendOrdersOutsideHours !== false
                  ? "العميل يستطيع الطلب لكن يصل الطاقم تلقائياً عند بدء الدوام"
                  : "كل الطلبات تصل الطاقم فوراً (24/7)"}
              </Text>
            </View>
            <Switch
              value={draft.suspendOrdersOutsideHours !== false}
              onValueChange={(v) => setDraft((d) => ({ ...d, suspendOrdersOutsideHours: v }))}
              trackColor={{ false: colors.border, true: colors.gold + "66" }}
              thumbColor={draft.suspendOrdersOutsideHours !== false ? colors.gold : colors.mutedForeground}
            />
          </View>
        </Card>

        <Card title="روابط التواصل الاجتماعي">
          {draft.social.map((item) => (
            <View
              key={item.id}
              style={[styles.entryBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Pressable onPress={() => deleteSocial(item.id)} style={styles.deleteBtn}>
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
                <View style={{ gap: 5 }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular" }}>
                    الأيقونة
                  </Text>
                  <View style={styles.iconRow}>
                    {SOCIAL_ICONS.map((ic) => (
                      <Pressable
                        key={ic}
                        onPress={() => updateSocial(item.id, "icon", ic)}
                        style={[
                          styles.iconBtn,
                          {
                            backgroundColor: item.icon === ic ? colors.gold + "33" : colors.surface,
                            borderColor: item.icon === ic ? colors.gold : colors.border,
                          },
                        ]}
                      >
                        <Icon name={ic} size={18} color={item.icon === ic ? colors.gold : colors.mutedForeground} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ))}
          <GoldButton
            label="إضافة رابط"
            onPress={addSocial}
            variant="outline"
            size="sm"
            style={{ width: "100%" }}
          />
        </Card>

        <Card title="إعدادات الدفع">
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", gap: 8, padding: 10, backgroundColor: colors.gold + "11", borderRadius: 8, borderWidth: 1, borderColor: colors.gold + "33" }}>
              <Icon name="wallet" size={18} color={colors.gold} />
              <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium", fontSize: 13, flex: 1, textAlign: "right" }}>
                أرقام الدفع التي تظهر للعميل عند الشراء
              </Text>
            </View>

            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "right" }}>
              المحفظة الإلكترونية
            </Text>
            <Field
              label="رقم المحفظة"
              value={draft.payment?.ewalletNumber ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), ewalletNumber: v } }))}
              placeholder="01000000001"
              keyboardType="phone-pad"
            />
            <Field
              label="اسم صاحب المحفظة"
              value={draft.payment?.ewalletName ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), ewalletName: v } }))}
              placeholder="شمس تكس"
            />
            <Field
              label="نسبة الرسوم (%)"
              value={String(draft.payment?.ewalletFeePercent ?? 1)}
              onChange={(v) => {
                const num = Math.max(0, Math.min(100, Number(v) || 0));
                setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), ewalletFeePercent: num } }));
              }}
              placeholder="1"
              keyboardType="decimal-pad"
            />

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "right" }}>
              انستاباي
            </Text>
            <Field
              label="رقم الانستاباي"
              value={draft.payment?.instapayNumber ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), instapayNumber: v } }))}
              placeholder="01000000001"
              keyboardType="phone-pad"
            />
            <Field
              label="اسم الحساب"
              value={draft.payment?.instapayName ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), instapayName: v } }))}
              placeholder="شمس تكس"
            />

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "right" }}>
              التحويل البنكي
            </Text>
            <Field
              label="اسم البنك"
              value={draft.payment?.bankName ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), bankName: v } }))}
              placeholder="البنك الأهلي المصري"
            />
            <Field
              label="اسم صاحب الحساب"
              value={draft.payment?.bankAccountName ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), bankAccountName: v } }))}
              placeholder="شمس تكس للأقمشة"
            />
            <Field
              label="رقم الحساب"
              value={draft.payment?.bankAccountNumber ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), bankAccountNumber: v } }))}
              placeholder="1234567890123"
              keyboardType="decimal-pad"
            />
            <Field
              label="IBAN"
              value={draft.payment?.bankIBAN ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, payment: { ...(d.payment ?? {} as PaymentSettings), bankIBAN: v } }))}
              placeholder="EG000012345678901234567890"
            />
          </View>
        </Card>

        <Card title="🔄 التحديث الإجباري">
          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "right", marginBottom: 8 }}>
            عند تعيين رقم نسخة هنا، أي مستخدم نسخته أقدم سيُمنع من استخدام التطبيق ويظهر له طلب التحديث.
          </Text>
          <Field
            label="الحد الأدنى للنسخة (مثل 1.1.0)"
            value={draft.minVersion ?? ""}
            onChange={(v) => setDraft((d) => ({ ...d, minVersion: v.trim() }))}
            placeholder="اتركه فارغاً للتعطيل"
          />
          <Field
            label="رابط متجر التحديث"
            value={draft.updateUrl ?? ""}
            onChange={(v) => setDraft((d) => ({ ...d, updateUrl: v.trim() }))}
            placeholder="https://play.google.com/store/apps/details?id=com.shamstex.app"
          />
        </Card>

        <Card title="🕶️ الأيقونة المخفية (للمدير)">
          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "right", marginBottom: 8 }}>
            يبدّل أيقونة التطبيق على شاشة الجوال إلى هيئة بديلة. مفيد للخصوصية.
          </Text>
          <Pressable
            onPress={async () => {
              const next = !draft.stealthIconEnabled;
              setDraft((d) => ({ ...d, stealthIconEnabled: next }));
              try {
                const Mod: any = await import("expo-alternate-app-icons");
                const fn = Mod.setAlternateAppIcon ?? Mod.default?.setAlternateAppIcon;
                if (fn) await fn(next ? "Stealth" : null);
              } catch (e) {
                Alert.alert("غير متاح", "تبديل الأيقونة يعمل فقط في الإصدار المبني (APK).");
              }
            }}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 14, fontFamily: "Inter_600SemiBold" }}>
              {draft.stealthIconEnabled ? "مفعّلة" : "معطّلة"}
            </Text>
            <View style={{
              width: 50, height: 28, borderRadius: 14,
              backgroundColor: draft.stealthIconEnabled ? colors.gold : colors.border,
              padding: 3,
              alignItems: draft.stealthIconEnabled ? "flex-end" : "flex-start",
            }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#FFF" }} />
            </View>
          </Pressable>
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
  statsRow: {
    flexDirection: "row-reverse",
    gap: 10,
  },
  catFixedRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  catListRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  catRowArrows: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  catListName: {
    flex: 1,
    fontSize: 14,
    textAlign: "right",
  },
  deleteCatBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
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
  subCatGroup: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  subCatGroupTitle: {
    fontSize: 14,
    textAlign: "right",
  },
  subTagsWrap: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  subTag: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  subTagText: { fontSize: 12 },
  entryBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  deleteBtn: {
    alignSelf: "flex-start",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  entryFields: { gap: 10 },
  iconRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
  workDayRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: "center",
  },
});
