import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const { width, height } = Dimensions.get("window");

export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  const colors = useColors();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const shineAnim = useRef(new Animated.Value(-width)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(shineAnim, {
        toValue: width,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(textFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(onFinish, 2800);
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
        <View style={[styles.logoWrapper, { borderColor: colors.gold + "55" }]}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Animated.View
            style={[
              styles.shine,
              {
                transform: [{ translateX: shineAnim }],
              },
            ]}
          />
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: textFade, alignItems: "center", gap: 6 }}>
        <Text style={[styles.brandName, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
          Shams Tex
        </Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          أقمشة فاخرة لكل مناسبة
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
  logoContainer: {
    alignItems: "center",
  },
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  shine: {
    position: "absolute",
    top: 0,
    left: -60,
    width: 60,
    height: "100%",
    backgroundColor: "rgba(201,168,76,0.3)",
    transform: [{ skewX: "-20deg" }],
  },
  brandName: {
    fontSize: 32,
    letterSpacing: 3,
    textAlign: "center",
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
    letterSpacing: 1,
  },
});
