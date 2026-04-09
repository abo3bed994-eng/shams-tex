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
  Unsubscribe,
  memoryLocalCache,
  writeBatch,
} from "firebase/firestore";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  Auth,
} from "firebase/auth";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyD9tLziFlwyRBpSgMj0Pa_qfNG--XP2csQ",
  authDomain: "shamstexapp.firebaseapp.com",
  projectId: "shamstexapp",
  storageBucket: "shamstexapp.firebasestorage.app",
  messagingSenderId: "22978900641",
  appId: "1:22978900641:web:c9fdc26bb0b7baea8db6e0",
  measurementId: "G-HK64J683SZ",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

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

let webOtpCodes: Record<string, string> = {};

export function generateWebOtp(phoneNumber: string): string {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  webOtpCodes[phoneNumber] = code;
  return code;
}

export function verifyWebOtp(phoneNumber: string, code: string): boolean {
  const stored = webOtpCodes[phoneNumber];
  if (stored && stored === code) {
    delete webOtpCodes[phoneNumber];
    return true;
  }
  return false;
}

export async function sendOtp(phoneNumber: string): Promise<ConfirmationResult | null> {
  if (Platform.OS !== "web") {
    throw new Error("Phone auth on mobile requires native build");
  }
  return null;
}

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
    await setDoc(doc(db, "sessions", phone), { token, updatedAt: new Date().toISOString() });
  },

  async getSession(phone: string): Promise<string | null> {
    const snap = await getDoc(doc(db, "sessions", phone));
    return snap.exists() ? snap.data().token : null;
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
};
