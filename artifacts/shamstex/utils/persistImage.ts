import * as FileSystem from "expo-file-system/legacy";
import { Platform, Alert } from "react-native";

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

async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === "web") {
    if (uri.startsWith("data:") || uri.startsWith("blob:") || uri.startsWith("http")) {
      const res = await fetch(uri);
      return res.blob();
    }
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const ext = getExtension(uri);
  const mimeType = getMimeType(ext);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

async function tryFirebaseUpload(uri: string): Promise<string | null> {
  try {
    const { storage } = await import("@/lib/firebase");
    const { ref: storageRef, uploadBytes, getDownloadURL } = await import("firebase/storage");

    const ext = getExtension(uri);
    const folder = isVideoUri(uri) ? "videos" : "images";
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const fileRef = storageRef(storage, filename);
    const blob = await uriToBlob(uri);
    await uploadBytes(fileRef, blob);
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("storage/unauthorized") || msg.includes("permission") || msg.includes("403")) {
      console.warn("Firebase Storage: قواعد الأمان تمنع الرفع. يجب تفعيل Storage في Firebase Console وضبط القواعد.");
    } else {
      console.warn("Firebase Storage upload failed:", msg);
    }
    return null;
  }
}

async function toBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:") || uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  const ext = getExtension(uri);
  const mimeType = getMimeType(ext);

  try {
    if (Platform.OS === "web" && (uri.startsWith("blob:") || uri.startsWith("file:"))) {
      const res = await fetch(uri);
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return uri;
  }
}

let storageWarningShown = false;

export async function persistImageUri(uri: string): Promise<string> {
  if (!uri) return uri;

  if (
    uri.startsWith("https://firebasestorage.googleapis.com") ||
    uri.startsWith("https://storage.googleapis.com")
  ) {
    return uri;
  }

  const uploaded = await tryFirebaseUpload(uri);
  if (uploaded) return uploaded;

  if (!storageWarningShown) {
    storageWarningShown = true;
    if (Platform.OS !== "web") {
      Alert.alert(
        "تنبيه",
        "لم يتم تفعيل مستودع الصور السحابي (Firebase Storage) بعد.\n\nالصور ستُحفظ محلياً فقط ولن تظهر للمستخدمين الآخرين.\n\nيرجى تفعيل Firebase Storage من لوحة التحكم.",
        [{ text: "حسناً" }]
      );
    }
  }

  return toBase64(uri);
}

export async function persistImageUris(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(persistImageUri));
}
