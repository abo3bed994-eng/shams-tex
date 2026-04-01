import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

export default function SplashScreenComponent({ onFinish }: { onFinish: () => void }) {
  const colors = useColors();
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
        <View
          style={[
            styles.logoCircle,
            { backgroundColor: "#FFFFFF", borderColor: colors.gold, borderWidth: 2 },
          ]}
        >
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textBlock, { opacity: textFade }]}>
        <Text style={[styles.brandName, { color: colors.gold, fontFamily: "Inter_700Bold" }]}>
          Shams Tex
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
    gap: 36,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: {
    width: 150,
    height: 150,
  },
  textBlock: {
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    fontSize: 34,
    letterSpacing: 4,
    textAlign: "center",
  },
  line: {
    height: 1.5,
    opacity: 0.7,
  },
  tagline: {
    fontSize: 14,
    textAlign: "center",
    letterSpacing: 1,
  },
});
