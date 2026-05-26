import React from "react";
import { Switch, Text, TextInput, View } from "react-native";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { Card, SettingsScreen, useSettingsDraft, styles } from "./_shared";

export default function HoursSettings() {
  useAdminGuard("manage_settings");
  const { colors, bottomPad, draft, setDraft, saving, save } = useSettingsDraft();
  return (
    <SettingsScreen title="مواعيد العمل" bottomPad={bottomPad} save={save} saving={saving}>
      <Card title="ساعات العمل">
        {(draft.workingHours ?? []).map((day, idx) => (
          <View key={day.day} style={[styles.workDayRow, { backgroundColor: colors.surface, borderColor: day.enabled ? colors.gold + "44" : colors.border }]}>
            <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: day.enabled ? colors.foreground : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{day.day}</Text>
              <Switch
                value={day.enabled}
                onValueChange={(v) => setDraft((d) => ({ ...d, workingHours: (d.workingHours ?? []).map((wd, i) => (i === idx ? { ...wd, enabled: v } : wd)) }))}
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
                    onChangeText={(v) => setDraft((d) => ({ ...d, workingHours: (d.workingHours ?? []).map((wd, i) => (i === idx ? { ...wd, from: v } : wd)) }))}
                    placeholder="09:00" placeholderTextColor={colors.mutedForeground} textAlign="center" keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right" }}>إلى</Text>
                  <TextInput
                    style={[styles.timeInput, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border, fontFamily: "Inter_500Medium" }]}
                    value={day.to}
                    onChangeText={(v) => setDraft((d) => ({ ...d, workingHours: (d.workingHours ?? []).map((wd, i) => (i === idx ? { ...wd, to: v } : wd)) }))}
                    placeholder="17:00" placeholderTextColor={colors.mutedForeground} textAlign="center" keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            )}
          </View>
        ))}
        <View style={{ flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, marginTop: 4, borderTopWidth: 1, borderColor: colors.border }}>
          <View style={{ flex: 1, marginEnd: 12 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, textAlign: "right" }}>تعليق الطلبات خارج أوقات العمل</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, textAlign: "right", fontFamily: "Inter_400Regular", marginTop: 2 }}>
              {draft.suspendOrdersOutsideHours !== false ? "العميل يستطيع الطلب لكن يصل الطاقم تلقائياً عند بدء الدوام" : "كل الطلبات تصل الطاقم فوراً (24/7)"}
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
    </SettingsScreen>
  );
}
