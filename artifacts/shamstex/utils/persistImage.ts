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
    // Log technical details to developer console only — never surface to user.
    console.warn("[upload] failed:", String(err?.message || err));
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

export class UploadFailedError extends Error {
  constructor() {
    super("upload_failed");
    this.name = "UploadFailedError";
  }
}

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

  // Videos are too large for base64 in Firestore (1MB doc limit). Fail loudly
  // instead of silently producing an unusable record.
  if (isVideoUri(uri)) {
    if (Platform.OS !== "web") {
      Alert.alert("خطأ", "تعذّر رفع الفيديو، حاول مرة أخرى");
    }
    throw new UploadFailedError();
  }

  // Images: fall back to base64 so the user still has a usable preview locally.
  return toBase64(uri);
}

export async function persistImageUris(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(persistImageUri));
}
