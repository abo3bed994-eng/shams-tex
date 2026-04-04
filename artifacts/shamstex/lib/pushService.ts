/**
 * Expo Push Notification Service
 * Handles token registration and sending push notifications via Expo Push API.
 * Works with Expo Go (foreground) and standalone builds (foreground + background).
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { FS } from "@/lib/firebase";

// Configure how notifications are shown while app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldShowAlert: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register this device for push notifications.
 * Saves the Expo push token to Firestore.
 * Call once on login or app startup when user is available.
 */
export async function registerForPushNotifications(
  phone: string,
  role: string
): Promise<string | null> {
  if (!Device.isDevice) {
    // Simulator — skip real push token
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    // Get the Expo push token
    // projectId is required for standalone builds (from expo.dev project settings)
    // In Expo Go it works without it; in standalone it needs the correct Expo project ID
    let expoPushToken: string;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      expoPushToken = tokenData.data;
    } catch {
      // Fallback for environments that need projectId
      const tokenData = await Notifications.getDevicePushTokenAsync();
      // DevicePushToken is FCM/APNs token — not usable with Expo Push API
      // Store it anyway for logging; in production configure proper projectId
      expoPushToken = tokenData.data as string;
    }

    // Save to Firestore
    await FS.savePushToken(phone, role, expoPushToken);

    // Android needs a notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("orders", {
        name: "طلبات جديدة",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
        lightColor: "#C9A84C",
        enableVibrate: true,
      });
      await Notifications.setNotificationChannelAsync("messages", {
        name: "رسائل",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    return expoPushToken;
  } catch (err) {
    console.warn("Push token registration failed:", err);
    return null;
  }
}

/**
 * Send push notifications to a list of Expo push tokens via Expo Push API.
 * Works from the client (no server needed for development).
 */
export async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
  channelId = "messages"
): Promise<void> {
  const validTokens = tokens.filter((t) => t && t.startsWith("ExponentPushToken["));
  if (validTokens.length === 0) return;

  const messages = validTokens.map((to) => ({
    to,
    title,
    body,
    sound: "default",
    priority: "high",
    channelId,
    data: data ?? {},
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages.length === 1 ? messages[0] : messages),
    });
  } catch (err) {
    console.warn("Expo push send failed:", err);
  }
}

/**
 * Send push notification to all employees and supervisors (for new orders).
 */
export async function notifyStaffNewOrder(
  orderId: string,
  customerName: string
): Promise<void> {
  try {
    const tokens = await FS.getPushTokensByRoles(["employee", "supervisor"]);
    await sendExpoPush(
      tokens,
      "🛍️ طلب جديد!",
      `طلب جديد من ${customerName} — #${orderId.slice(0, 8)}`,
      { type: "new_order", orderId },
      "orders"
    );
  } catch (err) {
    console.warn("notifyStaffNewOrder failed:", err);
  }
}

/**
 * Send a push notification to a specific user by their phone number.
 */
export async function notifyUserByPhone(
  phone: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const token = await FS.getPushTokenByPhone(phone);
    if (token) {
      await sendExpoPush([token], title, body, data, "messages");
    }
  } catch (err) {
    console.warn("notifyUserByPhone failed:", err);
  }
}

/**
 * Send push to all users matching certain roles.
 */
export async function notifyByRoles(
  roles: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const tokens = await FS.getPushTokensByRoles(roles);
    await sendExpoPush(tokens, title, body, data, "messages");
  } catch (err) {
    console.warn("notifyByRoles failed:", err);
  }
}

/**
 * Send push to ALL registered users.
 */
export async function notifyAll(
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const allTokens = await FS.getAllPushTokens();
    const tokens = allTokens.map((t) => t.expoPushToken);
    await sendExpoPush(tokens, title, body, data, "messages");
  } catch (err) {
    console.warn("notifyAll failed:", err);
  }
}
