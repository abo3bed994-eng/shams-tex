import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import GoldHeader from "@/components/GoldHeader";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "مقدمة",
    body: "تحرص شمس تكس على حماية خصوصية عملائها واحترام بياناتهم الشخصية. توضح هذه السياسة أنواع المعلومات التي نجمعها وكيفية استخدامها وحمايتها عند استخدامك لتطبيقنا. باستخدامك للتطبيق فإنك توافق على الممارسات الموضحة في هذه السياسة.",
  },
  {
    title: "المعلومات التي نجمعها",
    body: "نقوم بجمع المعلومات التي تقدمها عند إنشاء حسابك مثل الاسم ورقم الهاتف وعناوين التوصيل. كما نجمع بيانات طلباتك ومدفوعاتها وسجل تعاملاتك معنا لتحسين الخدمة. لا نقوم بجمع أي بيانات بنكية حساسة داخل التطبيق.",
  },
  {
    title: "كيفية استخدام المعلومات",
    body: "نستخدم بياناتك لتنفيذ طلباتك ومتابعة حالتها، والتواصل معك بشأن الطلبات والعروض والإشعارات المهمة، وتحسين تجربتك داخل التطبيق. لا نستخدم بياناتك لأي غرض آخر دون موافقتك.",
  },
  {
    title: "مشاركة المعلومات",
    body: "لا نقوم ببيع أو تأجير بياناتك الشخصية لأي طرف ثالث. قد نشارك الحد الأدنى من البيانات اللازمة مع شركات الشحن والتوصيل فقط بهدف إتمام تسليم طلبك، مع التزامهم بالحفاظ على سريتها.",
  },
  {
    title: "حماية البيانات",
    body: "نتخذ إجراءات تقنية وتنظيمية مناسبة لحماية بياناتك من الوصول أو الاستخدام أو الإفصاح غير المصرح به. ومع ذلك لا يمكن ضمان أمان أي وسيلة نقل عبر الإنترنت بشكل مطلق، لذا نوصي بالحفاظ على سرية بيانات دخولك.",
  },
  {
    title: "الإشعارات",
    body: "قد نرسل إليك إشعارات داخل التطبيق تتعلق بحالة طلباتك أو العروض الترويجية. يمكنك التحكم في إشعارات جهازك من إعدادات الهاتف في أي وقت.",
  },
  {
    title: "حقوقك",
    body: "يحق لك الاطلاع على بياناتك الشخصية أو تعديلها أو طلب حذف حسابك. للقيام بذلك يمكنك التواصل مع إدارة شمس تكس عبر قنوات التواصل الموضحة داخل التطبيق.",
  },
  {
    title: "التعديلات على السياسة",
    body: "قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سيتم نشر أي تغييرات داخل التطبيق، ويعد استمرارك في استخدام التطبيق بعد التحديث موافقة على السياسة المعدّلة.",
  },
  {
    title: "التواصل معنا",
    body: "إذا كان لديك أي استفسار بخصوص سياسة الخصوصية أو طريقة معالجة بياناتك، يسعدنا تواصلك مع فريق شمس تكس عبر صفحة تواصل معنا داخل التطبيق.",
  },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GoldHeader title="سياسة الخصوصية" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      >
        <Text style={[styles.updated, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          آخر تحديث: يونيو 2026
        </Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.title, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
              {s.title}
            </Text>
            <Text style={[styles.body, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  updated: { fontSize: 12, textAlign: "right", marginBottom: 4 },
  card: { padding: 16, borderWidth: 1, gap: 8 },
  title: { fontSize: 15, textAlign: "right" },
  body: { fontSize: 13, textAlign: "right", lineHeight: 22 },
});
