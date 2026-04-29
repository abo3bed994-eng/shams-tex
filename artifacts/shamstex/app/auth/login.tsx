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

// Primary admin account (the one signed in when secret bypass is used)
const PRIMARY_ADMIN = { id: "u0", phone: "+201221131138", name: "المدير", role: "admin" as const };

// Phones that should ALWAYS be treated as admin, even if their Firestore record
// says otherwise (e.g. owner registered earlier as a customer). Must match the
// `isOwnerPhone()` whitelist in firestore.rules.
const OWNER_PHONES = new Set<string>([
  "+201221131138",
  "+200000000001",
]);
const isOwnerPhone = (phone: string) => OWNER_PHONES.has(phone);

// SECRET BYPASS — Firebase test phone used to authenticate the bypass admin.
// This phone MUST be registered in Firebase Console → Authentication →
// Settings → Phone numbers for testing, with the matching code below.
// The bypass calls Firebase Phone Auth with this number so the admin gets a
// real `request.auth` token (phone_number = +200000000001), which matches
// `isOwnerPhone()` in firestore.rules and grants full admin access.
const BYPASS_AUTH_PHONE = "+200000000001";
const BYPASS_AUTH_CODE = "987654";

// SECRET ADMIN ENTRY (Method D — magic phone + password + verify code)
// Triggered when user types the magic local digits in the phone field.
const SECRET_MAGIC_PHONE_LOCAL = "9998765432";
const SECRET_MAGIC_PHONE_E164 =
  (process.env.EXPO_PUBLIC_ADMIN_MAGIC_PHONE as string | undefined) || "+9998765432";
const ADMIN_BYPASS_PASSWORD =
  (process.env.EXPO_PUBLIC_ADMIN_BYPASS_PASSWORD as string | undefined) || "$h@m$TEX1994";
const ADMIN_VERIFY_CODE =
  (process.env.EXPO_PUBLIC_ADMIN_VERIFY_CODE as string | undefined) || "096746";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setUser, findCustomerByPhone, registerCustomer, updateRegisteredCustomer, settings } = useApp();
  const { t } = useTranslation();

  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bypassPassword, setBypassPassword] = useState("");
  const [bypassVerifyCode, setBypassVerifyCode] = useState("");
  const confirmRef = useRef<PhoneAuthConfirmation | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const e164Phone = toE164(country, phone);
  const phoneValid = isValidLocal(country, phone);

  // ---------- Real OTP send ----------
  const handleSendOtp = async () => {
    // SECRET ADMIN ENTRY: detect magic phone number → switch to bypass step silently
    const digitsOnly = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digitsOnly === SECRET_MAGIC_PHONE_LOCAL || e164Phone === SECRET_MAGIC_PHONE_E164) {
      setError("");
      setBypassPassword("");
      setBypassVerifyCode("");
      setStep("adminBypass");
      return;
    }
    if (!phoneValid) {
      setError("رقم الهاتف غير صحيح");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setError("");
    // Rate-limit OTP requests: 3 per phone per 24 hours. Owner phones are exempt.
    if (!isOwnerPhone(e164Phone)) {
      try {
        const { FS } = await import("@/lib/firebase");
        const result = await FS.checkOtpThrottle(e164Phone);
        if (!result.allowed) {
          const hours = Math.ceil((result.retryAfterMs || 0) / (60 * 60 * 1000));
          setError(
            `وصلت الحد الأقصى لطلبات الكود (3 محاولات خلال 24 ساعة). حاول مرة أخرى بعد ${hours} ساعة.`
          );
          setLoading(false);
          return;
        }
      } catch (throttleErr: any) {
        // If throttle check itself fails (e.g. network), let the request through
        // rather than blocking legitimate users — Firebase has its own quotas.
        console.warn("[OTP throttle] check failed:", throttleErr?.message || throttleErr);
      }
    }
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
    if (otp.length < 4) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError("");

    if (!confirmRef.current) {
      setError("جلسة التحقق منتهية، أعد المحاولة");
      setLoading(false);
      return;
    }
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
    const isOwner = isOwnerPhone(e164Phone);
    const newUser = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
      phone: e164Phone,
      name: trimmed,
      role: (isOwner ? "admin" : "customer") as "admin" | "customer",
      registeredAt: new Date().toISOString(),
    };
    if (isOwner) {
      // Force-update so an old customer record gets upgraded.
      updateRegisteredCustomer(newUser as any);
    } else {
      await registerCustomer(newUser);
    }
    await finishLogin(trimmed, newUser.role, newUser);
  };

  // ---------- Secret admin bypass (Method D) ----------
  const handleAdminBypassSubmit = async () => {
    if (bypassPassword !== ADMIN_BYPASS_PASSWORD) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }
    if (bypassVerifyCode !== ADMIN_VERIFY_CODE) {
      setError("بيانات الدخول غير صحيحة");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);
    setError("");
    // STEP 1: Authenticate with Firebase using the dedicated bypass test phone.
    // Without this, the bypass admin has no `request.auth` token and every
    // Firestore write/read will silently fail.
    try {
      const conf = await startPhoneSignIn(BYPASS_AUTH_PHONE);
      await conf.confirm(BYPASS_AUTH_CODE);
    } catch (e: any) {
      const code = e?.code || "";
      const msg = String(e?.message || e);
      console.log("[Bypass Firebase Auth ERROR]", { code, msg });
      setError(
        "تعذّر تسجيل دخول الطوارئ في Firebase. تأكد أن الرقم " +
          BYPASS_AUTH_PHONE +
          " مضاف كرقم تجريبي في Firebase Console مع الكود " +
          BYPASS_AUTH_CODE +
          ` (${code || msg})`
      );
      setLoading(false);
      return;
    }
    // STEP 2: Build the local admin user object using the OWNER phone (the
    // real admin identity), not the bypass test phone. Firestore rules
    // recognize +200000000001 (bypass phone) as an owner via isOwnerPhone(),
    // so admin access is granted server-side too.
    const ownerPhone = BYPASS_AUTH_PHONE;
    const existing = findCustomerByPhone(ownerPhone);
    const userObj = existing
      ? { ...existing, phone: ownerPhone, role: "admin" as const, permissions: [] }
      : { ...PRIMARY_ADMIN, phone: ownerPhone, permissions: [] as any };
    updateRegisteredCustomer(userObj as any);
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
    const ownerOverride = isOwnerPhone(phoneToUse);
    // Prefer the explicit caller-provided role (handles admin bypass overriding stale registry).
    // Owner phones are ALWAYS upgraded to admin, regardless of any stale "customer" record.
    const resolvedRole = ownerOverride
      ? ("admin" as const)
      : (existingUser?.role || existingRecord?.role || role);
    const resolvedPerms = existingUser?.permissions ?? existingRecord?.permissions;
    const resolvedVip = existingUser?.vip ?? existingRecord?.vip;

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
    if (ownerOverride) {
      // updateRegisteredCustomer overwrites role; registerCustomer would preserve
      // the stale "customer" role and silently keep the owner downgraded.
      updateRegisteredCustomer(userToSet);
    } else {
      await registerCustomer(userToSet);
    }
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
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <Text style={[styles.brand, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
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
                دخول مسؤول النظام
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                أدخل كلمة السر ورمز التحقق
              </Text>

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
                  autoFocus
                />
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.input, borderColor: colors.border, borderRadius: colors.radius - 4 },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: colors.foreground, fontFamily: "Inter_700Bold", letterSpacing: 6 }]}
                  placeholder="رمز التحقق"
                  placeholderTextColor={colors.mutedForeground}
                  value={bypassVerifyCode}
                  onChangeText={(v) => { setBypassVerifyCode(v); setError(""); }}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={6}
                  textAlign="center"
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
                disabled={!bypassPassword || bypassVerifyCode.length < 4}
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
