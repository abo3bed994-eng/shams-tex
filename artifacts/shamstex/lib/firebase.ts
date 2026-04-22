import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  runTransaction,
  Unsubscribe,
  memoryLocalCache,
  writeBatch,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth,
} from "firebase/auth";
import { Platform } from "react-native";
import { canonicalPhone } from "./phoneUtils";

// Canonical Firestore doc key for a phone number. Strips formatting and prefers
// the canonical (last 10 digits) form so the same person resolves to the same
// document regardless of how the phone was typed (legacy local vs E.164).
function sessionKey(phone: string): string {
  const c = canonicalPhone(phone);
  return c || (phone || "").replace(/[^0-9A-Za-z]/g, "_") || "_";
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyD9tLziFlwyRBpSgMj0Pa_qfNG--XP2csQ",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "shamstexapp.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "shamstexapp",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "shamstexapp.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID || "22978900641",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:22978900641:web:c9fdc26bb0b7baea8db6e0",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-HK64J683SZ",
};

import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const storage = getStorage(app);

let auth: Auth;
try {
  auth = getAuth(app);
  auth.languageCode = "ar";
} catch {
  auth = getAuth(app);
}
export { auth };

let recaptchaVerifierInstance: RecaptchaVerifier | null = null;

export function setupRecaptcha(): RecaptchaVerifier {
  if (recaptchaVerifierInstance) {
    try { recaptchaVerifierInstance.clear(); } catch {}
    recaptchaVerifierInstance = null;
  }

  const oldContainer = document.getElementById("recaptcha-container");
  if (oldContainer) {
    oldContainer.remove();
  }
  const container = document.createElement("div");
  container.id = "recaptcha-container";
  document.body.appendChild(container);

  recaptchaVerifierInstance = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      recaptchaVerifierInstance = null;
    },
  });
  return recaptchaVerifierInstance;
}

// Real phone authentication is implemented in lib/phoneAuth.ts using:
//   • Firebase JS SDK (web)
//   • @react-native-firebase/auth (native)
// The fake client-side OTP previously implemented here has been removed.
export type { ConfirmationResult };

let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, { localCache: memoryLocalCache() });
} catch {
  db = getFirestore(app);
}
export { db };

export const FS = {
  async saveCustomer(customer: object & { id: string; phone: string }) {
    // Use phone as Firestore doc ID — prevents duplicate docs per phone number
    const withTimestamp = { ...customer, lastUpdated: new Date().toISOString() };
    await setDoc(doc(db, "customers", customer.phone), withTimestamp);
  },

  async deleteCustomer(phone: string) {
    await deleteDoc(doc(db, "customers", phone));
  },

  async getAllCustomers(): Promise<any[]> {
    const snap = await getDocs(collection(db, "customers"));
    return snap.docs.map((d) => d.data());
  },

  async saveProduct(product: object & { id: string }) {
    await setDoc(doc(db, "products", product.id), product);
  },

  async getAllProducts(): Promise<any[]> {
    const snap = await getDocs(collection(db, "products"));
    return snap.docs.map((d) => d.data());
  },

  async saveOrder(order: object & { id: string }) {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(order)) {
      if (v !== undefined) clean[k] = v;
    }
    await setDoc(doc(db, "orders", order.id), clean);
  },

  async getAllOrders(): Promise<any[]> {
    const snap = await getDocs(collection(db, "orders"));
    return snap.docs.map((d) => d.data());
  },

  async deleteOrder(orderId: string) {
    await deleteDoc(doc(db, "orders", orderId));
  },

  async saveSettings(settings: object) {
    await setDoc(doc(db, "config", "main"), settings);
  },

  async getSettings(): Promise<any | null> {
    const snap = await getDoc(doc(db, "config", "main"));
    return snap.exists() ? snap.data() : null;
  },

  subscribeProducts(callback: (products: any[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, "products"),
      (snap) => callback(snap.docs.map((d) => d.data())),
      () => {}
    );
  },

  subscribeOrders(callback: (orders: any[]) => void): Unsubscribe {
    // Try with orderBy, fallback to unordered on error
    let unsub = onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (snap) => {
        const data = snap.docs.map((d) => d.data());
        callback(data);
      },
      (_err) => {
        // Fallback: subscribe without ordering
        unsub = onSnapshot(
          collection(db, "orders"),
          (snap) => callback(snap.docs.map((d) => d.data())),
          () => {}
        );
      }
    );
    return () => unsub();
  },

  // Privacy-aware: customers see only their own orders; staff see all.
  subscribeOrdersForUser(
    userId: string,
    isStaff: boolean,
    callback: (orders: any[]) => void
  ): Unsubscribe {
    if (isStaff) {
      return FS.subscribeOrders(callback);
    }
    let unsub = onSnapshot(
      query(collection(db, "orders"), where("userId", "==", userId), orderBy("createdAt", "desc")),
      (snap) => callback(snap.docs.map((d) => d.data())),
      (_err) => {
        unsub = onSnapshot(
          query(collection(db, "orders"), where("userId", "==", userId)),
          (snap) => callback(snap.docs.map((d) => d.data())),
          () => {}
        );
      }
    );
    return () => unsub();
  },

  // Atomic claim: prevents two staff from receiving the same order at once.
  async claimOrder(orderId: string, staffId: string, staffName: string): Promise<{ ok: boolean; reason?: string; takenBy?: string }> {
    try {
      const result = await runTransaction(db, async (tx) => {
        const ref = doc(db, "orders", orderId);
        const snap = await tx.get(ref);
        if (!snap.exists()) return { ok: false, reason: "not_found" } as const;
        const data = snap.data() as any;
        if (data.assignedTo && data.assignedTo !== staffId) {
          return { ok: false, reason: "already_taken", takenBy: data.assignedToName ?? data.assignedTo } as const;
        }
        tx.update(ref, {
          status: "received",
          assignedTo: staffId,
          assignedToName: staffName,
        });
        return { ok: true } as const;
      });
      return result;
    } catch (e) {
      return { ok: false, reason: "tx_failed" };
    }
  },

  async appendAuditLog(entry: {
    actorId: string;
    actorName: string;
    actorRole: string;
    action: string;
    targetId?: string;
    targetType?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      await addDoc(collection(db, "audit_log"), {
        ...entry,
        createdAt: new Date().toISOString(),
        ts: serverTimestamp(),
      });
    } catch (e) {
      console.warn("audit log failed:", e);
    }
  },

  subscribeAuditLog(callback: (entries: any[]) => void, max = 200): Unsubscribe {
    let unsub = onSnapshot(
      query(collection(db, "audit_log"), orderBy("createdAt", "desc"), limit(max)),
      (snap) => callback(snap.docs.map((d) => d.data())),
      (_err) => {
        unsub = onSnapshot(
          query(collection(db, "audit_log"), limit(max)),
          (snap) => callback(snap.docs.map((d) => d.data())),
          () => {}
        );
      }
    );
    return () => unsub();
  },

  subscribeCustomers(callback: (customers: any[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, "customers"),
      (snap) => callback(snap.docs.map((d) => d.data())),
      () => {}
    );
  },

  subscribeNotifications(callback: (notifs: any[]) => void): Unsubscribe {
    let unsub = onSnapshot(
      query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(200)),
      (snap) => callback(snap.docs.map((d) => d.data())),
      (_err) => {
        unsub = onSnapshot(
          query(collection(db, "notifications"), limit(200)),
          (snap) => callback(snap.docs.map((d) => d.data())),
          () => {}
        );
      }
    );
    return () => unsub();
  },

  async saveNotification(notification: object & { id: string }) {
    await setDoc(doc(db, "notifications", notification.id), notification);
  },

  async batchMarkRead(ids: string[]) {
    const BATCH_SIZE = 500;
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = ids.slice(i, i + BATCH_SIZE);
      for (const id of chunk) {
        batch.set(doc(db, "notifications", id), { read: true }, { merge: true });
      }
      await batch.commit();
    }
  },

  async saveReturnRequest(req: object & { id: string }) {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(req)) {
      if (v !== undefined) clean[k] = v;
    }
    await setDoc(doc(db, "returnRequests", req.id), clean);
  },

  subscribeReturnRequests(callback: (reqs: any[]) => void): Unsubscribe {
    let unsub = onSnapshot(
      query(collection(db, "returnRequests"), orderBy("createdAt", "desc")),
      (snap) => callback(snap.docs.map((d) => d.data())),
      (_err) => {
        unsub = onSnapshot(
          collection(db, "returnRequests"),
          (snap) => callback(snap.docs.map((d) => d.data())),
          () => {}
        );
      }
    );
    return () => unsub();
  },

  async saveSession(phone: string, token: string) {
    // Sessions are keyed by canonical phone so the same person on a new device
    // always invalidates the prior session, regardless of phone format used at login.
    const key = sessionKey(phone);
    await setDoc(doc(db, "sessions", key), { token, phone, updatedAt: new Date().toISOString() });
  },

  async getSession(phone: string): Promise<string | null> {
    const key = sessionKey(phone);
    const snap = await getDoc(doc(db, "sessions", key));
    return snap.exists() ? snap.data().token : null;
  },

  subscribeSession(phone: string, callback: (token: string | null) => void): Unsubscribe {
    const key = sessionKey(phone);
    return onSnapshot(
      doc(db, "sessions", key),
      (snap) => callback(snap.exists() ? (snap.data().token as string) : null),
      () => {}
    );
  },

  // Push notification tokens — keyed by user phone
  async savePushToken(phone: string, role: string, expoPushToken: string) {
    await setDoc(doc(db, "pushTokens", phone), {
      phone,
      role,
      expoPushToken,
      updatedAt: new Date().toISOString(),
    });
  },

  async deletePushToken(phone: string) {
    await deleteDoc(doc(db, "pushTokens", phone));
  },

  async getPushTokensByRoles(roles: string[]): Promise<string[]> {
    const snap = await getDocs(collection(db, "pushTokens"));
    return snap.docs
      .map((d) => d.data())
      .filter((d) => roles.includes(d.role) && d.expoPushToken)
      .map((d) => d.expoPushToken as string);
  },

  async getPushTokenByPhone(phone: string): Promise<string | null> {
    const snap = await getDoc(doc(db, "pushTokens", phone));
    return snap.exists() ? (snap.data().expoPushToken as string) : null;
  },

  async getAllPushTokens(): Promise<{ phone: string; role: string; expoPushToken: string }[]> {
    const snap = await getDocs(collection(db, "pushTokens"));
    return snap.docs.map((d) => d.data() as any);
  },

  async setPresence(userId: string, info: { name: string; role: string; phone?: string }) {
    await setDoc(doc(db, "presence", userId), {
      userId,
      name: info.name,
      role: info.role,
      phone: info.phone || "",
      lastSeen: Date.now(),
    });
  },

  async clearPresence(userId: string) {
    await deleteDoc(doc(db, "presence", userId)).catch(() => {});
  },

  subscribePresence(callback: (entries: { userId: string; name: string; role: string; phone: string; lastSeen: number }[]) => void): Unsubscribe {
    return onSnapshot(collection(db, "presence"), (snap) => {
      callback(snap.docs.map((d) => d.data() as any));
    });
  },
};
