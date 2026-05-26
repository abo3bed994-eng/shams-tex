import React from "react";
import { View } from "react-native";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Card, Field, SettingsScreen, useSettingsDraft, styles } from "./_shared";

export default function StatsSettings() {
  useAdminGuard("manage_settings");
  const { bottomPad, draft, setDraft, saving, save } = useSettingsDraft();
  return (
    <SettingsScreen title="الإحصائيات" bottomPad={bottomPad} save={save} saving={saving}>
      <Card title="الإحصائيات">
        <View style={styles.statsRow}>
          <View style={{ flex: 1 }}>
            <Field label="عدد العملاء" value={draft.stats?.clients ?? "+500"} onChange={(v) => setDraft((d) => ({ ...d, stats: { ...(d.stats ?? {}), clients: v } as any }))} placeholder="+500" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="عدد الخامات" value={draft.stats?.products ?? "+50"} onChange={(v) => setDraft((d) => ({ ...d, stats: { ...(d.stats ?? {}), products: v } as any }))} placeholder="+50" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="سنوات الخبرة" value={draft.stats?.years ?? "15+"} onChange={(v) => setDraft((d) => ({ ...d, stats: { ...(d.stats ?? {}), years: v } as any }))} placeholder="15+" />
          </View>
        </View>
      </Card>
    </SettingsScreen>
  );
}
