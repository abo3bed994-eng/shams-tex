import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

function getExtension(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(\?|#|$)/);
  if (match) return match[1].toLowerCase();
  if (uri.includes("video") || uri.includes("mov") || uri.includes("mp4")) return "mp4";
  return "jpg";
}

function getMimeType(ext: string): string {
  const videoExts = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
  return videoExts.includes(ext) ? "video/mp4" : "image/jpeg";
}

function isVideoUri(uri: string): boolean {
  const ext = getExtension(uri);
  return ["mp4", "mov", "avi", "mkv", "webm", "m4v"].includes(ext);
}

export async function persistImageUri(uri: string): Promise<string> {
  // Already persisted — return as-is
  if (uri.startsWith("data:") || uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  const ext = getExtension(uri);
  const isVideo = isVideoUri(uri);
  const mimeType = getMimeType(ext);

  if (Platform.OS === "web") {
    // Web: convert everything to base64 data URI (survives page refreshes)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mimeType};base64,${base64}`;
    } catch {
      return uri;
    }
  }

  // Native: copy to permanent documentDirectory
  const dir = FileSystem.documentDirectory + (isVideo ? "app_videos/" : "app_images/");

  try {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const filename = `media_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const dest = dir + filename;

    // Try direct copy first (works for file://, ph://, content:// on most cases)
    await FileSystem.copyAsync({ from: uri, to: dest });

    // Verify the copy worked
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;

    throw new Error("Copy succeeded but file not found");
  } catch {
    // Fallback: base64 (works for all URI types but larger storage)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:${mimeType};base64,${base64}`;
    } catch {
      // If all fails, return original URI
      return uri;
    }
  }
}

export async function persistImageUris(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(persistImageUri));
}
