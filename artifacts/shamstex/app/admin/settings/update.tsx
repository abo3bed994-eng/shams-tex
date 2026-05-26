import React from "react";
import { Text } from "react-native";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Card, Field, SettingsScreen, useSettingsDraft } from "./_shared";
import { useColors } from "@/hooks/useColors";

export default function UpdateSettings() {
  useAdminGuard("manage_settings");
  const colors = useColors();
  const { bottomPad, draft, setDraft, saving, save } = useSettingsDraft();
  return (
    <SettingsScreen title="التحديث الإجباري" bottomPad={bottomPad} save={save} saving={saving}>
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
    </SettingsScreen>
  );
}
