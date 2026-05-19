import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type Props = {
  message?: string;
  showTagline?: boolean;
  taglineText?: string;
  taglineFontFamily?: string;
  logoSize?: number;
  fullscreen?: boolean;
};

export default function LoadingScreen({
  message,
  showTagline,
  taglineText,
  taglineFontFamily,
  logoSize = 220,
  fullscreen = true,
}: Props) {
  const colors = useColors();
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.25)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.05,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.55,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.0,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.2,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const glowSize = logoSize * 1.35;

  return (
    <View
      style={[
        fullscreen ? styles.containerFull : styles.containerInline,
        { backgroundColor: colors.background },
      ]}
    >
      <Animated.View style={{ opacity: fadeIn, alignItems: "center" }}>
        <View style={[styles.logoWrap, { width: logoSize, height: logoSize }]}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                backgroundColor: colors.gold,
                opacity: glowOpacity,
              },
            ]}
          />
          <Animated.Image
            source={require("../assets/images/loading-logo.png")}
            style={[
              styles.logo,
              {
                width: logoSize,
                height: logoSize,
                transform: [{ scale: pulseScale }],
              },
            ]}
            resizeMode="contain"
          />
        </View>

        {showTagline && taglineText ? (
          <View style={styles.tagBlock}>
            <Text
              style={[
                styles.tagline,
                {
                  color: colors.gold,
                  fontFamily: taglineFontFamily ?? "Inter_700Bold",
                },
              ]}
            >
              {taglineText}
            </Text>
            <View style={[styles.tagLine, { backgroundColor: colors.gold }]} />
          </View>
        ) : null}

        {message ? (
          <Text style={[styles.message, { color: colors.text, opacity: 0.7 }]}>{message}</Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerFull: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  containerInline: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
  },
  logo: {},
  tagBlock: {
    alignItems: "center",
    marginTop: 24,
    gap: 10,
  },
  tagline: {
    fontSize: 22,
    letterSpacing: 1.5,
    textAlign: "center",
    lineHeight: 34,
  },
  tagLine: {
    height: 1.5,
    width: 110,
    opacity: 0.7,
  },
  message: {
    marginTop: 16,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    opacity: 0.7,
  },
});
