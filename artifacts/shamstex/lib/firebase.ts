import { initializeApp, getApps, getApp } from "firebase/app";
import {
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
  Unsubscribe,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD9tLziFlwyRBpSgMj0Pa_qfNG--XP2csQ",
  projectId: "shamstexapp",
  storageBucket: "shamstexapp.firebasestorage.app",
  messagingSenderId: "22978900641",
  appId: "1:22978900641:ios:6b20b46ea318ff0a8db6e0",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

export const FS = {
  async saveCustomer(customer: object & { id: string }) {
    await setDoc(doc(db, "customers", customer.id), customer);
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
    await setDoc(doc(db, "orders", order.id), order);
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

  subscribeOrders(callback: (orders: any[]) => void): Unsubscribe {
    return onSnapshot(collection(db, "orders"), (snap) => {
      callback(snap.docs.map((d) => d.data()));
    });
  },

  subscribeCustomers(callback: (customers: any[]) => void): Unsubscribe {
    return onSnapshot(collection(db, "customers"), (snap) => {
      callback(snap.docs.map((d) => d.data()));
    });
  },
};
