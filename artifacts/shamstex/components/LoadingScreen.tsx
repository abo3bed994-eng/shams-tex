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
  logoSize = 180,
  fullscreen = true,
}: Props) {
  const colors = useColors();
  const spin = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // Ring sits ~22px outside the logo on every side.
  const ringSize = logoSize + 44;
  const ringThickness = 3;

  return (
    <View
      style={[
        fullscreen ? styles.containerFull : styles.containerInline,
        { backgroundColor: colors.background },
      ]}
    >
      <Animated.View style={{ opacity: fadeIn, alignItems: "center" }}>
        <View
          style={[
            styles.stack,
            { width: ringSize, height: ringSize },
          ]}
        >
          {/* Faint full ring as a subtle track */}
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderWidth: ringThickness,
                borderColor: colors.gold,
                opacity: 0.12,
              },
            ]}
          />

          {/* Rotating arc — only top + right edges are bright gold, the
              other two are transparent so we see a quarter-circle sweeping. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderWidth: ringThickness,
                borderTopColor: colors.gold,
                borderRightColor: colors.gold,
                borderBottomColor: "transparent",
                borderLeftColor: "transparent",
                transform: [{ rotate }],
              },
            ]}
          />

          <Image
            source={require("../assets/images/logo.png")}
            style={{ width: logoSize, height: logoSize }}
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
  stack: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
  },
  tagBlock: {
    alignItems: "center",
    marginTop: 28,
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
  },
});
