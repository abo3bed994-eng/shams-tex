import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { I18nManager, KeyboardAvoidingView, Platform } from "react-native";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import SplashScreenComponent from "@/components/SplashScreenComponent";
import Toast from "@/components/Toast";
import NotificationBanner from "@/components/NotificationBanner";
import OfflineBanner from "@/components/OfflineBanner";
import { registerForPushNotifications } from "@/lib/pushService";

if (Platform.OS !== "web") {
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading } = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const navigated = useRef(false);
  const pushRegistered = useRef<string | null>(null);
  // Store pending notification navigation until the app is fully ready
  const pendingNotifNav = useRef<string | null>(null);
  const appReady = splashDone && !isLoading && navigated.current;

  // Register for push notifications whenever a user logs in
  useEffect(() => {
    if (user && pushRegistered.current !== user.phone) {
      pushRegistered.current = user.phone;
      registerForPushNotifications(user.phone, user.role).catch(() => {});
    }
    if (!user) {
      pushRegistered.current = null;
    }
  }, [user]);

  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        sub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data as Record<string, any>;
          let path = "/notifications";
          if (data?.orderId && (data?.type === "new_order" || data?.type === "order_status" || data?.type === "order_editable" || data?.type === "order_message" || data?.type === "order_edited")) {
            path = `/order/${data.orderId}`;
          }
          if (appReady) {
            router.push(path as any);
          } else {
            pendingNotifNav.current = path;
          }
        });
      } catch (_) {}
    })();
    return () => { sub?.remove(); };
  }, [appReady]);

  // Fire pending notification navigation once app is fully ready
  useEffect(() => {
    if (appReady && pendingNotifNav.current) {
      const path = pendingNotifNav.current;
      pendingNotifNav.current = null;
      setTimeout(() => router.push(path as any), 300);
    }
  }, [appReady]);

  useEffect(() => {
    if (splashDone && !isLoading && !navigated.current) {
      navigated.current = true;
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [splashDone, isLoading, user]);

  if (!splashDone) {
    return <SplashScreenComponent onFinish={() => setSplashDone(true)} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="admin/products" options={{ headerShown: false }} />
        <Stack.Screen name="admin/add-product" options={{ headerShown: false }} />
        <Stack.Screen name="admin/prices" options={{ headerShown: false }} />
        <Stack.Screen name="admin/users" options={{ headerShown: false }} />
        <Stack.Screen name="admin/notifications" options={{ headerShown: false }} />
        <Stack.Screen name="admin/tabs" options={{ headerShown: false }} />
        <Stack.Screen name="admin/settings" options={{ headerShown: false }} />
        <Stack.Screen name="admin/colors" options={{ headerShown: false }} />
        <Stack.Screen name="admin/featured" options={{ headerShown: false }} />
        <Stack.Screen name="admin/edit-product/[id]" options={{ headerShown: false }} />
      </Stack>
      <Toast />
      <NotificationBanner />
      <OfflineBanner />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", "ltr");
      document.documentElement.setAttribute("lang", "ar");
    }
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <KeyboardAvoidingView
                  style={{ flex: 1, backgroundColor: "#0A0A0A" }}
                  behavior="padding"
                  keyboardVerticalOffset={0}
                >
                  <RootLayoutNav />
                </KeyboardAvoidingView>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
