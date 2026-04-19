import Constants from "expo-constants";

export const APP_VERSION: string = (Constants?.expoConfig?.version as string) ?? "1.1.0";

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function isUpdateRequired(minVersion: string | undefined | null): boolean {
  if (!minVersion) return false;
  return compareVersions(APP_VERSION, minVersion) < 0;
}
