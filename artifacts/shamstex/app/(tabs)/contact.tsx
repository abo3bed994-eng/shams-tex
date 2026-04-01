import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const CONTACTS = [
  { label: "الدعم الفني", number: "+20 100 000 0001", icon: "headphones" },
  { label: "المبيعات", number: "+20 100 000 0002", icon: "shopping-bag" },
  { label: "الجملة والتجار", number: "+20 100 000 0003", icon: "briefcase" },
];

const SOCIAL = [
  { label: "واتساب", icon: "message-circle", url: "https://wa.me/201000000001" },
  { label: "إنستغرام", icon: "instagram", url: "https://instagram.com/shamstex" },
  { label: "فيسبوك", icon: "facebook", url: "https://facebook.com/shamstex" },
];

export default function ContactScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const callNumber = (number: string) => {
    Linking.openURL(`tel:${number.replace(/\s+/g, "")}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, borderBottomColor: colors.border },
        ]}
      >
        <Text
          style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
        >
          تواصل معنا
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoCircle, { borderColor: colors.gold + "44" }]}>
            <Feather name="sun" size={36} color={colors.gold} />
          </View>
          <Text style={[styles.brandName, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            Shams Tex
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            أقمشة فاخرة لكل مناسبة
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            أرقام التواصل
          </Text>
          {CONTACTS.map((contact) => (
            <Pressable
              key={contact.number}
              onPress={() => callNumber(contact.number)}
              style={({ pressed }) => [
                styles.contactCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="phone-call" size={18} color={colors.gold} />
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {contact.label}
                </Text>
                <Text style={[styles.contactNumber, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  {contact.number}
                </Text>
              </View>
              <View style={[styles.contactIcon, { backgroundColor: colors.gold + "22" }]}>
                <Feather name={contact.icon as any} size={20} color={colors.gold} />
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            التواصل الاجتماعي
          </Text>
          <View style={styles.socialRow}>
            {SOCIAL.map((s) => (
              <Pressable
                key={s.label}
                onPress={() => Linking.openURL(s.url)}
                style={({ pressed }) => [
                  styles.socialBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Feather name={s.icon as any} size={22} color={colors.gold} />
                <Text
                  style={[styles.socialLabel, { color: colors.foreground, fontFamily: "Inter_500Medium" }]}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.aboutCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.gold + "33",
              borderRadius: colors.radius,
            },
          ]}
        >
          <Text style={[styles.aboutTitle, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
            من نحن
          </Text>
          <Text style={[styles.aboutText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Shams Tex شركة رائدة في مجال تجارة الأقمشة الفاخرة، نقدم أجود أنواع الخامات
            بأسعار تنافسية للأفراد والتجار على حد سواء. نحرص دائماً على توفير أرقى
            الأقمشة من حرير وقطن وساتان وغيرها من المصادر العالمية الموثوقة.
          </Text>
          <View style={styles.aboutStats}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>+500</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                عميل
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>+50</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                خامة
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>10+</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                سنوات خبرة
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22 },
  content: {
    padding: 16,
    gap: 24,
  },
  logoSection: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 24,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 13,
    letterSpacing: 1,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    textAlign: "right",
  },
  contactCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  contactInfo: {
    flex: 1,
    gap: 2,
    alignItems: "flex-end",
  },
  contactLabel: {
    fontSize: 11,
  },
  contactNumber: {
    fontSize: 16,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  socialRow: {
    flexDirection: "row-reverse",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
  },
  socialLabel: {
    fontSize: 12,
  },
  aboutCard: {
    padding: 20,
    borderWidth: 1,
    gap: 14,
  },
  aboutTitle: {
    fontSize: 18,
    textAlign: "right",
  },
  aboutText: {
    fontSize: 13,
    textAlign: "right",
    lineHeight: 22,
  },
  aboutStats: {
    flexDirection: "row-reverse",
    justifyContent: "space-around",
    marginTop: 8,
  },
  stat: {
    alignItems: "center",
    gap: 4,
  },
  statNum: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
});
