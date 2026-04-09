import React, { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  const colors = useColors();
  const { settings, language } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 55,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(lineWidth, {
          toValue: 120,
          duration: 500,
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      if (!finished.current) {
        finished.current = true;
        onFinish();
      }
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={settings.logoUri ? { uri: settings.logoUri } : require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={[styles.textBlock, { opacity: textFade }]}>
        <Text
          style={[styles.brandName, { color: colors.gold, fontFamily: "Inter_700Bold" }]}
        >
          SHAMS TEX
        </Text>
        <Animated.View
          style={[styles.line, { backgroundColor: colors.gold, width: lineWidth }]}
        />
        <Text
          style={[
            styles.tagline,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {settings.logoUri ? "SHAMS TEX" : (language === "ar" ? "الأقمشة كما يجب أن تكون" : "Fabrics as they should be")}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  logoContainer: { alignItems: "center" },
  logo: { width: 180, height: 180 },
  textBlock: { alignItems: "center", gap: 10 },
  brandName: { fontSize: 34, letterSpacing: 4, textAlign: "center" },
  line: { height: 1.5, opacity: 0.7 },
  tagline: { fontSize: 14, textAlign: "center", letterSpacing: 1 },
});
