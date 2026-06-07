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

// React-Native–friendly blob fetch.
// XHR with responseType="blob" is the canonical RN pattern: it streams the
// file via the native bridge instead of loading the whole thing into JS memory
// (which crashes for videos > ~30MB on low-end Android phones).
function uriToBlobXHR(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      if (xhr.response) resolve(xhr.response as Blob);
      else reject(new Error("empty_blob"));
    };
    xhr.onerror = () => reject(new Error("xhr_blob_failed"));
    xhr.ontimeout = () => reject(new Error("xhr_blob_timeout"));
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });
}

async function uriToBlob(uri: string): Promise<Blob> {
  if (Platform.OS === "web") {
    if (uri.startsWith("data:") || uri.startsWith("blob:") || uri.startsWith("http")) {
      const res = await fetch(uri);
      return res.blob();
    }
  }

  // Fast path on native: stream via XHR.
  try {
    return await uriToBlobXHR(uri);
  } catch (e) {
    console.warn("[upload] XHR blob path failed, falling back to base64:", String((e as Error)?.message || e));
  }

  // Legacy fallback: base64 round-trip. Memory-heavy but works as a last resort.
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// "media" → public product/banner media (images/, videos/).
// "private" → sensitive order images (transfer proofs, return invoices) under proofs/.
export type UploadFolder = "media" | "private";

async function uploadOnce(uri: string, dest: UploadFolder, scopeId?: string): Promise<string> {
  const { storage } = await import("@/lib/firebase");
  const { ref: storageRef, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");

  const ext = getExtension(uri);
  const isVideo = isVideoUri(uri);
  // Private uploads are bound to their order id: proofs/<orderId>/<file> so the
  // storage rules can verify order ownership. Public media: images/ or videos/.
  const prefix = dest === "private"
    ? `proofs/${scopeId && scopeId.length > 0 ? scopeId : "misc"}`
    : isVideo ? "videos" : "images";
  const filename = `${prefix}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const fileRef = storageRef(storage, filename);
  const blob = await uriToBlob(uri);
  const mimeType = getMimeType(ext);

  // Resumable upload: chunks the file, auto-retries on transient network errors,
  // and lets us await final completion via the snapshot-state promise.
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, blob, { contentType: mimeType });
    task.on(
      "state_changed",
      undefined,
      (err) => reject(err),
      () => resolve(),
    );
  });

  return await getDownloadURL(fileRef);
}

let lastUploadError: string = "";
export function getLastUploadError(): string {
  return lastUploadError;
}

async function tryFirebaseUpload(uri: string, dest: UploadFolder, scopeId?: string): Promise<string | null> {
  const MAX_ATTEMPTS = 3;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const url = await uploadOnce(uri, dest, scopeId);
      lastUploadError = "";
      return url;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[upload] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, String(err?.code || err?.message || err));
      if (attempt < MAX_ATTEMPTS) {
        await sleep(1500 * attempt);
      }
    }
  }
  lastUploadError = String(lastErr?.code || lastErr?.message || lastErr || "unknown");
  console.warn("[upload] gave up after retries:", lastUploadError);
  return null;
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

export async function persistImageUri(uri: string, dest: UploadFolder = "media", scopeId?: string): Promise<string> {
  if (!uri) return uri;

  if (
    uri.startsWith("https://firebasestorage.googleapis.com") ||
    uri.startsWith("https://storage.googleapis.com")
  ) {
    return uri;
  }

  const uploaded = await tryFirebaseUpload(uri, dest, scopeId);
  if (uploaded) return uploaded;

  // Videos are too large for base64 in Firestore (1MB doc limit). Fail loudly
  // instead of silently producing an unusable record.
  if (isVideoUri(uri)) {
    if (Platform.OS !== "web") {
      const detail = lastUploadError ? `\n\nالتفاصيل: ${lastUploadError}` : "";
      Alert.alert(
        "تعذّر رفع الفيديو",
        `حاول مرة أخرى. تأكد أن حجم الفيديو أقل من 100 ميجا وأنك متصل بإنترنت مستقر.${detail}`
      );
    }
    throw new UploadFailedError();
  }

  // Images: fall back to base64 so the user still has a usable preview locally.
  return toBase64(uri);
}

export async function persistImageUris(uris: string[], dest: UploadFolder = "media"): Promise<string[]> {
  return Promise.all(uris.map((u) => persistImageUri(u, dest)));
}
