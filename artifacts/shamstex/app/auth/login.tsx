import React, { useRef, useState } from "react";
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
import CountryPicker from "@/components/CountryPicker";
import { COUNTRIES, DEFAULT_COUNTRY, Country } from "@/lib/countries";
import { isValidLocal, toE164 } from "@/lib/phoneUtils";
import { startPhoneSignIn, PhoneAuthConfirmation } from "@/lib/phoneAuth";

type Step = "phone" | "otp" | "name" | "adminBypass";

// Hidden admin accounts used by the long-press-logo bypass.
// Phone is stored in E.164 (+20…) — these are the admin's real numbers.
const ADMIN_BYPASS_ACCOUNTS: Record<string, { id: string; name: string; role: "admin" }> = {
  "+201221131138": { id: "u0", name: "المدير", role: "admin" },
  "+200000000001": { id: "u1", name: "مدير النظام", role: "admin" },
};

const ADMIN_BYPASS_PASSWORD =
  (process.env.EXPO_PUBLIC_ADMIN_BYPASS_PASSWORD as string | undefined) || "";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser, findCustomerByPhone, registerCustomer, settings } = useApp();
  const { t } = useTranslation();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bypassPhone, setBypassPhone] = useState("");
  const [bypassPassword, setBypassPassword] = useState("");
  const confirmRef = useRef<PhoneAuthConfirmation | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const e164Phone = toE164(country, phone);
  const phoneValid = isValidLocal(country, phone);

  // ---------- Real OTP send ----------
  const handleSendOtp = async () => {
    if (!phoneValid) {
      setError("رقم الهاتف غير صحيح");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setError("");
    try {
      const conf = await startPhoneSignIn(e164Phone);
      confirmRef.current = conf;
      setStep("otp");
    } catch (e: any) {
      const code = e?.code || "";
      const msg = String(e?.message || e);
      console.log("[PhoneAuth ERROR]", { code, msg, e164Phone, raw: e });
      let friendly = `تعذّر إرسال الكود [${code || "؟"}]`;
      if (msg.includes("quota")) friendly = "وصلت الحصة اليومية للرسائل. حاول غداً.";
      else if (code.includes("invalid-phone") || msg.includes("invalid-phone")) friendly = "رقم الهاتف غير صحيح";
      else if (code.includes("too-many-requests") || msg.includes("too-many-requests")) friendly = "محاولات كثيرة. انتظر قليلاً.";
      else if (code.includes("missing-client-identifier") || msg.includes("missing-client-identifier")) friendly = "إعدادات Firebase ناقصة (SHA-1 أو App Check). جرّب رقم تجريبي.";
      else if (code.includes("app-not-authorized") || msg.includes("app-not-authorized")) friendly = "التطبيق غير مصرّح في Firebase. تحقق من SHA-1 أو استخدم رقم تجريبي.";
      else if (msg.includes("network") || msg.includes("Network")) friendly = "تعذّر الاتصال بالإنترنت";
      setError(friendly + (code ? ` (${code})` : ""));
    } finally {
      setLoading(false);
    }
  };

  // ---------- Real OTP verify ----------
  const handleVerifyOtp = async () => {
    if (otp.length < 4 || !confirmRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");
    try {
      const result = await confirmRef.current.confirm(otp);
      const verifiedPhone = result.phoneNumber || e164Phone;
      const existing = findCustomerByPhone(verifiedPhone);
      if (existing) {
        await finishLogin(existing.name, existing.role as any, { ...existing, phone: verifiedPhone });
      } else {
        // Always store new accounts under E.164
        setStep("name");
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      let friendly = "كود التحقق غير صحيح";
      if (msg.includes("expired") || msg.includes("session-expired")) {
        friendly = "انتهت صلاحية الكود. أعد إرساله.";
      }
      setError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtp("");
    setError("");
    await handleSendOtp();
  };

  // ---------- New customer name ----------
  const handleNameSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    const newUser = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      phone: e164Phone,
      name: trimmed,
      role: "customer" as const,
      registeredAt: new Date().toISOString(),
    };
    await registerCustomer(newUser);
    await finishLogin(trimmed, "customer", newUser);
  };

  // ---------- Hidden admin bypass ----------
  const handleLogoLongPress = () => {
    if (!ADMIN_BYPASS_PASSWORD) {
      Alert.alert("غير متاح", "لم يتم إعداد كلمة سر الأدمن في هذا البناء.");
      return;
    }
    setError("");
    setBypassPhone("");
    setBypassPassword("");
    setStep("adminBypass");
  };

  const handleAdminBypassSubmit = async () => {
    const phoneKey = bypassPhone.trim().startsWith("+")
      ? bypassPhone.trim()
      : `+20${bypassPhone.trim().replace(/^0+/, "")}`;
    const account = ADMIN_BYPASS_ACCOUNTS[phoneKey];
    if (!account) {
      setError("رقم الأدمن غير معروف");
      return;
    }
    if (bypassPassword !== ADMIN_BYPASS_PASSWORD) {
      setError("كلمة السر غير صحيحة");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const existing = findCustomerByPhone(phoneKey);
    const userObj = existing
      ? { ...existing, phone: phoneKey, role: "admin" as const }
      : { id: account.id, phone: phoneKey, name: account.name, role: "admin" as const };
    await finishLogin(userObj.name, "admin", userObj);
  };

  // ---------- Finish login (shared) ----------
  const finishLogin = async (
    displayName: string,
    role: "admin" | "supervisor" | "merchant" | "employee" | "customer",
    existingUser: any
  ) => {
    setLoading(true);
    const sessionToken = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    const phoneToUse = existingUser?.phone || e164Phone;

    const existingRecord = findCustomerByPhone(phoneToUse);
    const resolvedRole = existingRecord?.role || existingUser?.role || role;
    const resolvedPerms = existingRecord?.permissions || existingUser?.permissions;
    const resolvedVip = existingRecord?.vip || existingUser?.vip;

    const userToSet = {
      ...(existingUser ?? {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
        phone: phoneToUse,
        name: displayName,
      }),
      phone: phoneToUse,
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
          <Pressable onLongPress={handleLogoLongPress} delayLongPress={1500}>
            <Image
              source={settings.logoUri ? { uri: settings.logoUri } : require("../../assets/images/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </Pressable>
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
                  <Pressable
                    onPress={() => setShowCountryPicker(true)}
                    style={[styles.countryCodeBox, { borderLeftColor: colors.border }]}
                  >
                    <Text style={{ fontSize: 18 }}>{country.flag}</Text>
                    <Text style={{ color: colors.gold, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                      {country.dial}
                    </Text>
                    <Icon name="chevron-down" size={14} color={colors.mutedForeground} />
                  </Pressable>
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
                disabled={!phoneValid}
                style={{ width: "100%" }}
              />

              <View style={[styles.divider, { borderColor: colors.border }]} />
              <Text style={[styles.newCustomerNote, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {t("newCustomer")}
              </Text>
            </>
          )}

          {step === "otp" && (
            <>
              <View style={styles.backRow}>
                <Pressable onPress={() => { setStep("phone"); setOtp(""); setError(""); confirmRef.current = null; }}>
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
                {`${t("otpSentTo")} ${e164Phone}`}
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <Icon name="lock" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_700Bold", letterSpacing: 8 }]}
                  placeholder="_ _ _ _ _ _"
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

          {step === "adminBypass" && (
            <>
              <View style={styles.backRow}>
                <Pressable onPress={() => { setStep("phone"); setError(""); }}>
                  <Icon name="arrow-right" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <View style={styles.stepIcon}>
                <Icon name="shield" size={28} color={colors.gold} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                دخول الأدمن
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                للأدمن فقط — أدخل رقمك وكلمة السر
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder="رقم الأدمن (+20...)"
                  placeholderTextColor={colors.mutedForeground}
                  value={bypassPhone}
                  onChangeText={(v) => { setBypassPhone(v); setError(""); }}
                  keyboardType="phone-pad"
                  textAlign="right"
                />
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                  placeholder="كلمة السر"
                  placeholderTextColor={colors.mutedForeground}
                  value={bypassPassword}
                  onChangeText={(v) => { setBypassPassword(v); setError(""); }}
                  secureTextEntry
                  textAlign="right"
                  onSubmitEditing={handleAdminBypassSubmit}
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
                label="دخول"
                onPress={handleAdminBypassSubmit}
                loading={loading}
                disabled={!bypassPhone || !bypassPassword}
                style={{ width: "100%" }}
              />
            </>
          )}
        </View>
      </ScrollView>

      <CountryPicker
        visible={showCountryPicker}
        selected={country}
        onClose={() => setShowCountryPicker(false)}
        onSelect={(c) => setCountry(c)}
      />

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
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderLeftWidth: 1,
    paddingLeft: 8,
    paddingRight: 4,
    marginLeft: 4,
    height: 30,
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
});
