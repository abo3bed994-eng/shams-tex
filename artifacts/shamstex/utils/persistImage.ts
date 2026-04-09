import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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
    if (uri.startsWith("data:")) {
      const res = await fetch(uri);
      return res.blob();
    }
    if (uri.startsWith("blob:") || uri.startsWith("http")) {
      const res = await fetch(uri);
      return res.blob();
    }
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = getExtension(uri);
    const mimeType = getMimeType(ext);
    const byteChars = atob(base64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    return new Blob([byteArray], { type: mimeType });
  }

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const ext = getExtension(uri);
  const mimeType = getMimeType(ext);
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mimeType });
}

export async function persistImageUri(uri: string): Promise<string> {
  if (!uri) return uri;

  if (uri.startsWith("https://firebasestorage.googleapis.com") || uri.startsWith("https://storage.googleapis.com")) {
    return uri;
  }

  try {
    const ext = getExtension(uri);
    const folder = isVideoUri(uri) ? "videos" : "images";
    const filename = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const fileRef = storageRef(storage, filename);
    const blob = await uriToBlob(uri);
    await uploadBytes(fileRef, blob);
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (err) {
    console.warn("Firebase Storage upload failed, falling back to base64:", err);
    return fallbackToBase64(uri);
  }
}

async function fallbackToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:") || uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  const ext = getExtension(uri);
  const mimeType = getMimeType(ext);

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return uri;
  }
}

export async function persistImageUris(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(persistImageUri));
}
