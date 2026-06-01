---
name: expo-print version pin (Shams Tex)
description: expo-print must match the Expo SDK, not jump to a future SDK major, or PDF/print crashes at runtime
---

# expo-print version must track the Expo SDK

In `artifacts/shamstex` (Expo SDK 54), `expo-print` must be pinned to the SDK-compatible
range (`^15.0.8`). A jump to `^56` (an SDK-56-era major) crashes at runtime when the invoice
PDF is generated ("تعذّر إنشاء ملف الفاتورة"). `react-native-webview` is kept at `13.15.0`.

**Why:** Expo native modules are versioned per SDK; installing a major from a newer SDK
links incompatible native code and crashes the print/PDF path, not at build time but when used.

**How to apply:** When touching invoice/PDF features or after dependency bumps, confirm
`expo-print` matches the installed Expo SDK (use `npx expo install expo-print` rather than a
manual latest-major). Surface the real error in the PDF catch block to diagnose faster.
