import React, { useState, useRef } from "react";
import {
  Alert,
  Image,
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
import { useTranslation } from "@/lib/i18n";
import GoldButton from "@/components/GoldButton";
import Icon from "@/components/Icon";
import { sendOtp, ConfirmationResult, generateWebOtp, verifyWebOtp } from "@/lib/firebase";
import { isValidPhone } from "@/lib/validation";

type Step = "phone" | "otp" | "name";

const DEMO_ACCOUNTS: Record<string, { id: string; name: string; role: "admin" | "supervisor" | "merchant" | "employee"; permissions?: string[] }> = {
  "0000000001": { id: "u1", name: "مدير النظام", role: "admin", permissions: [] },
  "01221131138": { id: "u0", name: "المدير", role: "admin", permissions: [] },
  "0000000002": { id: "u2", name: "تاجر", role: "merchant", permissions: [] },
  "0000000003": { id: "u3", name: "موظف", role: "employee", permissions: ["view_orders", "view_products"] },
  "0000000004": { id: "u4", name: "مشرف", role: "supervisor", permissions: ["view_orders", "edit_orders", "view_products", "view_users", "send_notifications", "approve_upgrades"] },
};

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser, findCustomerByPhone, registerCustomer, settings } = useApp();
  const { t, isRTL, textAlign, flexDir } = useTranslation();

  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+20");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [returningUser, setReturningUser] = useState<ReturnType<typeof findCustomerByPhone>>(undefined);
  const [generatedOtp, setGeneratedOtp] = useState("");
  const confirmResultRef = useRef<ConfirmationResult | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isDemo = !!DEMO_ACCOUNTS[phone];
  const fullPhone = `${countryCode}${phone.replace(/^0+/, "")}`;

  const handleSendOtp = async () => {
    if (!isValidPhone(phone)) {
      setError("رقم الهاتف غير صحيح");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setError("");

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 800));
      setGeneratedOtp("1234");
      setLoading(false);
      setStep("otp");
      return;
    }

    await new Promise((r) => setTimeout(r, 600));
    const code = generateWebOtp(fullPhone);
    setGeneratedOtp(code);
    setLoading(false);
    setStep("otp");
    if (Platform.OS !== "web") {
      Alert.alert(
        "رمز التحقق",
        `رمزك هو: ${code}\n\nاحتفظ به ولا تشاركه مع أحد`,
        [{ text: "حسناً" }]
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");

    if (isDemo) {
      if (otp !== "1234") {
        setLoading(false);
        setError("كود التحقق غير صحيح. للحسابات التجريبية استخدم 1234");
        return;
      }
      const demo = DEMO_ACCOUNTS[phone];
      const existingDemo = findCustomerByPhone(phone);
      const demoUser = existingDemo
        ? { ...existingDemo }
        : { id: demo.id, phone, name: demo.name, role: demo.role, permissions: demo.permissions };
      await finishLogin(demoUser.name, demoUser.role as any, demoUser);
      return;
    }

    if (!verifyWebOtp(fullPhone, otp)) {
      setLoading(false);
      setError("كود التحقق غير صحيح");
      return;
    }

    setLoading(false);
    const existing = findCustomerByPhone(phone);
    if (existing) {
      setReturningUser(existing);
      await finishLogin(existing.name, existing.role as any, existing);
    } else {
      setStep("name");
    }
  };

  const handleNameSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    const newUser = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      phone,
      name: trimmed,
      role: "customer" as const,
      registeredAt: new Date().toISOString(),
    };
    await registerCustomer(newUser);
    await finishLogin(trimmed, "customer", newUser);
  };

  const finishLogin = async (
    displayName: string,
    role: "admin" | "supervisor" | "merchant" | "employee" | "customer",
    existingUser: any
  ) => {
    setLoading(true);
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

    const existingRecord = findCustomerByPhone(existingUser?.phone || phone);
    const resolvedRole = existingRecord?.role || existingUser?.role || role;
    const resolvedPerms = existingRecord?.permissions || existingUser?.permissions;
    const resolvedVip = existingRecord?.vip || existingUser?.vip;

    const userToSet = {
      ...(existingUser ?? {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        phone,
        name: displayName,
      }),
      role: resolvedRole,
      permissions: resolvedPerms,
      vip: resolvedVip,
      sessionToken,
    };
    try {
      const { FS } = await import("@/lib/firebase");
      await FS.saveSession(userToSet.phone, sessionToken);
    } catch {}
    await registerCustomer(userToSet);
    await setUser(userToSet);
    setLoading(false);
    router.replace("/(tabs)");
  };

  const handleResendOtp = async () => {
    setOtp("");
    setError("");
    setLoading(true);

    if (isDemo) {
      await new Promise((r) => setTimeout(r, 800));
      setGeneratedOtp("1234");
      setLoading(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 600));
    const code = generateWebOtp(fullPhone);
    setGeneratedOtp(code);
    setLoading(false);
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
          <Image
            source={settings.logoUri ? { uri: settings.logoUri } : require("../../assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={[styles.brand, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            SHAMS TEX
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {t("tagline")}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius },
          ]}
        >
          {step === "phone" && (
            <>
              <View style={styles.stepIcon}>
                <Icon name="smartphone" size={28} color={colors.gold} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {t("login")}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {t("enterPhone")}
              </Text>

              <View style={{ gap: 8 }}>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                  ]}
                >
                  <View style={[styles.countryCodeBox, { borderLeftColor: colors.border }]}>
                    <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 15 }}>
                      {countryCode}
                    </Text>
                  </View>
                  <TextInput
                    style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                    placeholder={t("phone")}
                    placeholderTextColor={colors.mutedForeground}
                    value={phone}
                    onChangeText={(val) => { setPhone(val); setError(""); }}
                    keyboardType="phone-pad"
                    textAlign="right"
                    returnKeyType="done"
                    onSubmitEditing={handleSendOtp}
                  />
                  <Icon name="phone" size={18} color={colors.mutedForeground} />
                </View>
              </View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: "#E74C3C11", borderColor: "#E74C3C44" }]}>
                  <Icon name="alert-circle" size={14} color="#E74C3C" />
                  <Text style={{ color: "#E74C3C", fontFamily: "Inter_500Medium", fontSize: 12, flex: 1, textAlign: "right" }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <GoldButton
                label={t("sendOtp")}
                onPress={handleSendOtp}
                loading={loading}
                disabled={!isValidPhone(phone)}
                style={{ width: "100%" }}
              />

              <View style={[styles.divider, { borderColor: colors.border }]} />
              <Text style={[styles.newCustomerNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {t("newCustomer")}
              </Text>

              <View style={[styles.demoBox, { backgroundColor: colors.gold + "08", borderColor: colors.gold + "22" }]}>
                <Icon name="info" size={13} color={colors.gold} />
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 10, flex: 1, textAlign: "right", lineHeight: 16 }}>
                  حسابات تجريبية: مدير 0000000001 | تاجر 0000000002 | موظف 0000000003 | مشرف 0000000004 (كود: 1234)
                </Text>
              </View>
            </>
          )}

          {step === "otp" && (
            <>
              <View style={styles.backRow}>
                <Pressable onPress={() => { setStep("phone"); setOtp(""); setError(""); confirmResultRef.current = null; }}>
                  <Icon name="arrow-right" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <View style={styles.stepIcon}>
                <Icon name="lock" size={28} color={colors.gold} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {t("otpTitle")}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {`${t("otpSentTo")} ${isDemo ? phone : fullPhone}`}
              </Text>
              {generatedOtp ? (
                <View style={[styles.otpDisplay, { backgroundColor: colors.gold + "15", borderColor: colors.gold + "44" }]}>
                  <Icon name="key" size={16} color={colors.gold} />
                  <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: 6 }}>
                    {generatedOtp}
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <Icon name="lock" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_700Bold", letterSpacing: 8 }]}
                  placeholder="_ _ _ _"
                  placeholderTextColor={colors.mutedForeground}
                  value={otp}
                  onChangeText={(val) => { setOtp(val); setError(""); }}
                  keyboardType="numeric"
                  textAlign="center"
                  maxLength={6}
                  returnKeyType="done"
                  autoFocus
                  onSubmitEditing={handleVerifyOtp}
                />
              </View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: "#E74C3C11", borderColor: "#E74C3C44" }]}>
                  <Icon name="alert-circle" size={14} color="#E74C3C" />
                  <Text style={{ color: "#E74C3C", fontFamily: "Inter_500Medium", fontSize: 12, flex: 1, textAlign: "right" }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <GoldButton
                label={t("verify")}
                onPress={handleVerifyOtp}
                loading={loading}
                disabled={otp.length < 4}
                style={{ width: "100%" }}
              />

              <Pressable onPress={handleResendOtp} disabled={loading}>
                <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" }}>
                  إعادة إرسال الكود
                </Text>
              </Pressable>
            </>
          )}

          {step === "name" && (
            <>
              <View style={styles.backRow}>
                <Pressable onPress={() => { setStep("otp"); setName(""); }}>
                  <Icon name="arrow-right" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <View style={styles.stepIcon}>
                <Icon name="user-plus" size={28} color={colors.gold} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {t("enterName")}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {t("enterNameHint")}
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <Icon name="user" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder={t("nameLabel")}
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  textAlign="right"
                  returnKeyType="done"
                  autoFocus
                  onSubmitEditing={handleNameSubmit}
                />
              </View>

              <GoldButton
                label={t("startShopping")}
                onPress={handleNameSubmit}
                loading={loading}
                disabled={name.trim().length < 2}
                style={{ width: "100%" }}
              />

              <View style={[styles.privacyBox, { backgroundColor: colors.gold + "11", borderColor: colors.gold + "33" }]}>
                <Icon name="shield-check" size={14} color={colors.gold} />
                <Text style={[styles.privacyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  بياناتك محفوظة وآمنة ولن تُشارك مع أي طرف
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 28 },
  header: { alignItems: "center", gap: 10 },
  logoImg: { width: 120, height: 120 },
  brand: { fontSize: 28, letterSpacing: 3 },
  subtitle: { fontSize: 14, letterSpacing: 1 },
  card: { padding: 24, borderWidth: 1, gap: 16 },
  stepIcon: { alignItems: "center", marginBottom: 4 },
  cardTitle: { fontSize: 20, textAlign: "center" },
  cardSubtitle: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  inputWrapper: {
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
    height: 52,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, height: "100%" },
  countryCodeBox: {
    borderLeftWidth: 1,
    paddingLeft: 12,
    marginLeft: 4,
    height: 30,
    justifyContent: "center",
  },
  backRow: { flexDirection: "row-reverse", marginBottom: -4 },
  divider: { borderTopWidth: 1, marginVertical: 4 },
  newCustomerNote: { fontSize: 12, textAlign: "center", lineHeight: 18 },
  privacyBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  privacyText: { fontSize: 11, flex: 1, textAlign: "right", lineHeight: 17 },
  errorBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  demoBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  otpDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});
