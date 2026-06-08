---
name: Expo Go vs dev-build mode (shamstex)
description: Why the app "won't open / exits immediately" in Expo Go, and the dev-script fix.
---

# Shams Tex must start Metro in Expo Go mode

`expo-dev-client` is a dependency of `artifacts/shamstex`. When it is installed,
`expo start` defaults to **development-build** mode: Metro advertises the URL
scheme `exp+shamstex://expo-development-client/...`. Expo Go cannot open that
scheme, so scanning the QR / opening the URL on a phone makes Expo Go exit
immediately ("لا يدخل على اكسبو").

**Fix:** the `dev` script in `artifacts/shamstex/package.json` must pass `--go`
to `expo start`. That forces the Expo-Go-compatible `exp://` URL while keeping
`expo-dev-client` available for EAS dev/native builds.

**Why this is safe:** the app is designed to run in Expo Go — every truly-native
module that Expo Go lacks (e.g. `@react-native-firebase/*`) is lazy-`require`d
inside try/catch with a JS/web fallback, so Go mode never hard-crashes on a
missing native module.

**How to apply:** if the user reports the app won't open / exits on Expo Go,
check the workflow log for `Using development build` or an
`exp+shamstex://expo-development-client` URL. If present, ensure `--go` is in the
`dev` script and restart the `artifacts/shamstex: expo` workflow. Do NOT remove
`expo-dev-client` (it's needed for native/EAS builds).
