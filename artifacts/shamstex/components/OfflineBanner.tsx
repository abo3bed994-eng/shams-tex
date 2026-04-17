import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colors = useColors();

  useEffect(() => {
    if (Platform.OS === "web") {
      const update = () => setIsOffline(!navigator.onLine);
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      return () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
    }

    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const NetInfo = await import("@react-native-community/netinfo");
        unsub = NetInfo.default.addEventListener((state) => {
          setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
        });
      } catch {
        setIsOffline(false);
      }
    })();
    return () => { unsub?.(); };
  }, []);

  useEffect(() => {
    if (isOffline) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.85, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity: fadeAnim, backgroundColor: colors.background }]}
      pointerEvents="auto"
    >
      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], backgroundColor: colors.card, borderColor: colors.gold + "40" }]}>

        <Animated.View style={[styles.iconCircle, { transform: [{ scale: pulseAnim }], borderColor: colors.gold + "30", backgroundColor: colors.gold + "12" }]}>
          <View style={[styles.iconInner, { backgroundColor: colors.gold + "22", borderColor: colors.gold + "50" }]}>
            <WifiOffIcon color={colors.gold} />
          </View>
        </Animated.View>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            لا يوجد اتصال بالإنترنت
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            يرجى التحقق من اتصالك بالشبكة{"\n"}وسيعود التطبيق تلقائياً
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.gold + "30" }]} />

        <Text style={[styles.hint, { color: colors.gold }]}>
          شمس تكس · تعانق الجودة كل خيط
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

function WifiOffIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconSvgWrapper}>
      <View style={[styles.wifiArc, styles.wifiArc1, { borderColor: color }]} />
      <View style={[styles.wifiArc, styles.wifiArc2, { borderColor: color }]} />
      <View style={[styles.wifiDot, { backgroundColor: color }]} />
      <View style={[styles.wifiSlash, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    padding: 36,
    alignItems: "center",
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSvgWrapper: {
    width: 44,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  wifiArc: {
    position: "absolute",
    borderWidth: 3,
    borderRadius: 100,
    borderColor: "transparent",
    borderBottomColor: "transparent",
  },
  wifiArc1: {
    width: 44,
    height: 44,
    top: -2,
    borderTopWidth: 3,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  wifiArc2: {
    width: 28,
    height: 28,
    top: 6,
    borderTopWidth: 3,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  wifiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    bottom: 0,
  },
  wifiSlash: {
    position: "absolute",
    width: 3,
    height: 52,
    borderRadius: 2,
    top: -8,
    transform: [{ rotate: "45deg" }],
    opacity: 0.85,
  },
  textBlock: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.8,
  },
  divider: {
    width: 60,
    height: 1,
    borderRadius: 1,
    marginVertical: 4,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    letterSpacing: 0.5,
    opacity: 0.85,
  },
});
