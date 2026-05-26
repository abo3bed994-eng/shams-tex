import React, { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import Icon from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { persistImageUri } from "@/utils/persistImage";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Card, SettingsScreen, useSettingsDraft, styles } from "./_shared";

export default function AdsSettings() {
  useAdminGuard("manage_settings");
  const { colors, bottomPad, draft, setDraft, saving, save } = useSettingsDraft();
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
  const removeVideo = (idx: number) => setDraft((d) => ({ ...d, bannerVideoUris: (d.bannerVideoUris ?? []).filter((_, i) => i !== idx) }));
  const clearBanner = () => setDraft((d) => ({ ...d, bannerImageUri: undefined, bannerVideoUris: [] }));

  return (
    <SettingsScreen title="المحتوى الإعلاني" bottomPad={bottomPad} save={save} saving={saving}>
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
              <View key={uri} style={[styles.videoBadge, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44" }]}>
                <View style={{ flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 10 }}>
                  <Icon name="film" size={20} color={colors.gold} />
                  <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium", fontSize: 12, flex: 1, textAlign: "right" }} numberOfLines={1}>فيديو {idx + 1}</Text>
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
            style={({ pressed }) => [styles.bannerBtn, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "44", opacity: (pressed || mediaLoading || (draft.bannerVideoUris ?? []).length >= 3) ? 0.5 : 1 }]}
          >
            <Icon name="film" size={18} color={colors.gold} />
            <Text style={{ color: colors.gold, fontFamily: "Inter_600SemiBold", fontSize: 13 }}>
              {(draft.bannerVideoUris ?? []).length >= 3 ? "اكتملت الفيديوهات" : `رفع فيديو (${(draft.bannerVideoUris ?? []).length}/3)`}
            </Text>
          </Pressable>
          <Pressable
            onPress={pickBannerImage}
            disabled={mediaLoading}
            style={({ pressed }) => [styles.bannerBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed || mediaLoading ? 0.7 : 1 }]}
          >
            <Icon name="image" size={18} color={colors.foreground} />
            <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>رفع صورة</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular" }}>
          يمكن رفع حتى 3 فيديوهات متتابعة أو صورة في البانر الرئيسي
        </Text>
      </Card>
    </SettingsScreen>
  );
}
