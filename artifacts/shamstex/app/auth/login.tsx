import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import GoldButton from "@/components/GoldButton";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser } = useApp();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSendOtp = async () => {
    if (phone.length < 10) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));

    const demoRole = phone === "0000000001" ? "admin" :
                     phone === "0000000002" ? "merchant" :
                     phone === "0000000003" ? "employee" : "customer";

    await setUser({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      phone,
      name: demoRole === "admin" ? "مدير النظام" : demoRole === "merchant" ? "تاجر" : demoRole === "employee" ? "موظف" : "عميل جديد",
      role: demoRole,
    });
    setLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 40, paddingBottom: bottomPad + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoCircle, { borderColor: colors.gold + "44" }]}>
            <Feather name="sun" size={40} color={colors.gold} />
          </View>
          <Text style={[styles.brand, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            Shams Tex
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          >
            أقمشة فاخرة لكل مناسبة
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
            },
          ]}
        >
          {step === "phone" ? (
            <>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                تسجيل الدخول
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              >
                أدخل رقم هاتفك لاستلام رمز التحقق
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <Feather name="phone" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder="رقم الهاتف"
                  placeholderTextColor={colors.mutedForeground}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                />
              </View>

              <GoldButton
                label="إرسال رمز التحقق"
                onPress={handleSendOtp}
                loading={loading}
                disabled={phone.length < 10}
                style={{ width: "100%" }}
              />

              <Text
                style={[styles.demo, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              >
                للتجربة: 0000000001 (مدير) | 0000000002 (تاجر)
              </Text>
            </>
          ) : (
            <>
              <View style={styles.backRow}>
                <Pressable onPress={() => setStep("phone")}>
                  <Feather name="arrow-right" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                رمز التحقق
              </Text>
              <Text
                style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
              >
                تم إرسال الرمز إلى {phone}
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <Feather name="lock" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_700Bold", letterSpacing: 8 }]}
                  placeholder="_ _ _ _"
                  placeholderTextColor={colors.mutedForeground}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  textAlign="center"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                />
              </View>

              <GoldButton
                label="تأكيد"
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otp.length < 4}
                style={{ width: "100%" }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    gap: 32,
  },
  header: {
    alignItems: "center",
    gap: 12,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 28,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    letterSpacing: 1,
  },
  card: {
    padding: 24,
    borderWidth: 1,
    gap: 16,
  },
  cardTitle: {
    fontSize: 20,
    textAlign: "right",
  },
  cardSubtitle: {
    fontSize: 13,
    textAlign: "right",
  },
  inputWrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    height: 52,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  backRow: {
    flexDirection: "row-reverse",
    marginBottom: -8,
  },
  demo: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
});
