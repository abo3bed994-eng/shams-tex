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
the keyboard-controller scroll views. The `KeyboardProvider` wrapper in `_layout.tsx`
is harmless (no-ops without the native module) and can stay. Before adding any new
library that has a native module, confirm it works under Expo Go or it will crash.
