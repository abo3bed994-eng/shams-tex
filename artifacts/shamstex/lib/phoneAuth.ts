// Unified Phone Auth wrapper that uses:
//   • Firebase JS SDK (web) — signInWithPhoneNumber + RecaptchaVerifier
//   • @react-native-firebase/auth (native iOS/Android) — signInWithPhoneNumber
//
// Both flows return a "confirmation" handle whose .confirm(code) verifies the OTP.

import { Platform } from "react-native";
import { auth as webAuth, setupRecaptcha } from "./firebase";
import {
  signInWithPhoneNumber as webSignInWithPhone,
  onAuthStateChanged as webOnAuthStateChanged,
  ConfirmationResult as WebConfirmationResult,
} from "firebase/auth";

export type PhoneAuthConfirmation = {
  confirm: (code: string) => Promise<{ uid: string; phoneNumber: string | null }>;
};

let nativeAuthModule: any = null;
function getNativeAuth() {
  if (nativeAuthModule) return nativeAuthModule;
  try {
    // Lazy require so web bundle never tries to load native module.
    const mod = require("@react-native-firebase/auth").default;
    nativeAuthModule = mod;
    return mod;
  } catch (e) {
    return null;
  }
}

export async function startPhoneSignIn(e164Phone: string): Promise<PhoneAuthConfirmation> {
  if (Platform.OS === "web") {
    const verifier = setupRecaptcha();
    const result: WebConfirmationResult = await webSignInWithPhone(webAuth, e164Phone, verifier);
    return {
      confirm: async (code: string) => {
        const cred = await result.confirm(code);
        return {
          uid: cred.user.uid,
          phoneNumber: cred.user.phoneNumber,
        };
      },
    };
  }

  // Native (iOS / Android)
  const rnAuth = getNativeAuth();
  if (!rnAuth) {
    throw new Error("@react-native-firebase/auth is not available in this build");
  }
  const confirmation = await rnAuth().signInWithPhoneNumber(e164Phone);
  return {
    confirm: async (code: string) => {
      const cred = await confirmation.confirm(code);
      return {
        uid: cred?.user?.uid ?? "",
        phoneNumber: cred?.user?.phoneNumber ?? null,
      };
    },
  };
}

// Live Firebase Auth session state — platform-aware. Returns the real
// authenticated user (uid + phone) or null when there is NO Firebase session.
// Used by the diagnostic badge so we can SEE whether app-login actually
// established a Firebase session (Firestore rules require request.auth != null).
export function subscribeAuthState(
  cb: (info: { uid: string; phone: string | null } | null) => void
): () => void {
  if (Platform.OS === "web") {
    return webOnAuthStateChanged(webAuth, (u) => {
      cb(u ? { uid: u.uid, phone: u.phoneNumber } : null);
    });
  }
  const rnAuth = getNativeAuth();
  if (!rnAuth) {
    cb(null);
    return () => {};
  }
  return rnAuth().onAuthStateChanged((u: any) => {
    cb(u ? { uid: u.uid, phone: u.phoneNumber ?? null } : null);
  });
}

export async function signOut(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      await webAuth.signOut();
    } else {
      const rnAuth = getNativeAuth();
      if (rnAuth) await rnAuth().signOut();
    }
  } catch {}
}
