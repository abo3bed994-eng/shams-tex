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
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";
import SplashScreenComponent from "@/components/SplashScreenComponent";
import Toast from "@/components/Toast";
import { registerForPushNotifications } from "@/lib/pushService";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, isLoading } = useApp();
  const [splashDone, setSplashDone] = useState(false);
  const navigated = useRef(false);
  const pushRegistered = useRef<string | null>(null);

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

  // Handle notification taps (when user opens app via notification)
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/notifications");
    });
    return () => sub.remove();
  }, []);

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

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AppProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
