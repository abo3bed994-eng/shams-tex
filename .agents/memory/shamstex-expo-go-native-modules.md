---
name: Shams Tex Expo Go native-module crashes
description: Why react-native-keyboard-controller's scroll view crashes in Expo Go and what to use instead
---

# react-native-keyboard-controller crashes in Expo Go

`KeyboardAwareScrollView` from `react-native-keyboard-controller` relies on a native
ViewManager (`ClippingScrollViewDecoratorView`) that is NOT bundled in Expo Go. Any
screen that renders it crashes at runtime in Expo Go with:
"Can't find ViewManager 'ClippingScrollViewDecoratorView'".

**Why:** The user tests on Android Expo Go (via the dev domain inside canvas iframes),
not a custom dev build, so any library shipping its own native module that isn't in the
Expo Go binary will hard-crash the screen.

**How to apply:** In this app, keyboard handling on touched screens (cart, addresses,
any form) must use React Native's built-in `KeyboardAvoidingView` + `ScrollView`, not
the keyboard-controller scroll views. CORRECTION (was previously believed harmless):
the `KeyboardProvider` wrapper does NOT no-op without the native module — mounting it at
the root crashes `RootLayout` on launch in Expo Go (the app "exits immediately" /
console shows "error occurred in the <RootLayout(./_layout.tsx)> component"). So the
entire `react-native-keyboard-controller` dependency was removed (provider import +
wrapper in `_layout.tsx`, the unused `KeyboardAwareScrollViewCompat` component, and the
package.json dep). Do not re-add it unless the app moves to a custom dev build. Before
adding any library with a native module, confirm it is in the Expo Go binary or it will
crash on launch — a lazy `require()` inside a try/catch (as in `lib/phoneAuth.ts` for
`@react-native-firebase/auth`) is the safe pattern for native modules used only in builds.
