import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import Icon from "@/components/Icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-80));
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const NetInfo = await import("@react-native-community/netinfo");
        unsubscribe = NetInfo.default.addEventListener((state) => {
          setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
        });
      } catch {
        setIsOffline(false);
      }
    })();
    return () => { unsubscribe?.(); };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -80,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.inner}>
        <Icon name="wifi-off" size={18} color="#fff" />
        <Text style={styles.text}>لا يوجد اتصال بالإنترنت</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#C0392B",
    zIndex: 9999,
    paddingBottom: 10,
  },
  inner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  text: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
});
