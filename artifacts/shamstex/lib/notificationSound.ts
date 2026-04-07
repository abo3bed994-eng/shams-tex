import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

let lastPlayedAt = 0;
const THROTTLE_MS = 2000;

export async function playNotificationAlert() {
  const now = Date.now();
  if (now - lastPlayedAt < THROTTLE_MS) return;
  lastPlayedAt = now;

  try {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  } catch {}

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      require("../assets/sounds/notification.mp3"),
      { shouldPlay: true, volume: 0.7 }
    );

    sound.setOnPlaybackStatusUpdate((status) => {
      if ("didJustFinish" in status && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
      }
    });
  } catch {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }
    } catch {}
  }
}
