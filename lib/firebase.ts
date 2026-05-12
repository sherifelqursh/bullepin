import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  // RN-only persistence layer
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore -- getReactNativePersistence is exported at runtime but not in the .d.ts
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from "firebase/firestore";
import { Platform } from "react-native";

// ---- Project config -------------------------------------------------------
// Defaults are the bullepin-prod Firebase project. EXPO_PUBLIC_* env vars
// override them at build time so we can point preview/prod at separate
// projects without code changes.
const firebaseConfig = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyDc8-UtjPHxoKl4CKlSDyJujNy5CbQc4RA",
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "bullepin-893eb.firebaseapp.com",
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "bullepin-893eb",
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    "bullepin-893eb.firebasestorage.app",
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "115478863194",
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ??
    "1:115478863194:web:8adf5ce721ac11f8b2a763",
  measurementId:
    process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-LHNGFYSE4E",
};

// ---- Singleton init -------------------------------------------------------
export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Auth: on RN we need AsyncStorage persistence so the session survives reloads.
let _auth: Auth;
if (Platform.OS === "web") {
  _auth = getAuth(app);
} else {
  try {
    _auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if it's already been called (hot reload).
    _auth = getAuth(app);
  }
}
export const auth = _auth;

// Firestore on React Native: the default gRPC-over-WebChannel transport
// flakes on many mobile networks and Expo Go ("Network request failed").
// Force long-polling on native; web defaults are fine.
let _db: Firestore;
if (Platform.OS === "web") {
  _db = getFirestore(app);
} else {
  try {
    _db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    // initializeFirestore throws if already called (Fast Refresh).
    _db = getFirestore(app);
  }
}
export const db = _db;

// NOTE: Cloud Storage isn't initialised — this project is on the Spark
// (free) plan which doesn't include Storage for new projects. Cover photos
// and avatars are stored as base64 data URLs inside Firestore docs, which
// stays within Spark quotas. If you upgrade to Blaze later, you can
// re-introduce Storage uploads in lib/api.ts.
