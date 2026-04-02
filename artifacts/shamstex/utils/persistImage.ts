import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

export async function persistImageUri(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    const dir = FileSystem.documentDirectory + "product_images/";
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const dest = dir + filename;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

export async function persistImageUris(uris: string[]): Promise<string[]> {
  return Promise.all(uris.map(persistImageUri));
}
