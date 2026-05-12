import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as updateAuthProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User as FbUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { clearProfileCache } from "./api";

export type PublicUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  avatarUrl: string | null;
};

type AuthState = {
  user: PublicUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (
    identifier: string,
    password: string,
    name?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: PublicUser) => void;
  changePassword: (current: string, next: string) => Promise<void>;
  updateProfile: (patch: {
    name?: string;
    phone?: string;
    avatarUrl?: string | null;
  }) => Promise<PublicUser>;
};

const Ctx = createContext<AuthState | null>(null);

async function ensureUserDoc(fbUser: FbUser, fallbackName?: string) {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as Omit<PublicUser, "id">;
  const lowerEmail = fbUser.email?.toLowerCase() ?? null;
  const seed: Omit<PublicUser, "id"> = {
    email: lowerEmail,
    phone: null,
    name:
      fallbackName?.trim() ||
      fbUser.displayName ||
      (fbUser.email?.split("@")[0] ?? "Friend"),
    avatarUrl: fbUser.photoURL ?? null,
  };
  await setDoc(ref, { ...seed, createdAt: serverTimestamp() });
  return seed;
}

function buildPublicUser(fbUser: FbUser, profile: Omit<PublicUser, "id">): PublicUser {
  return {
    id: fbUser.uid,
    email: profile.email ?? fbUser.email,
    phone: profile.phone ?? null,
    name: profile.name || fbUser.displayName || "Friend",
    avatarUrl: profile.avatarUrl ?? fbUser.photoURL ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state. On sign-in/up we also subscribe to the user's
  // Firestore profile doc so name/avatar changes flow into context live.
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    const stopAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      // Make sure a /users/{uid} doc exists.
      await ensureUserDoc(fbUser);
      profileUnsub = onSnapshot(doc(db, "users", fbUser.uid), (snap) => {
        const data = (snap.data() as Omit<PublicUser, "id"> | undefined) ?? {
          email: fbUser.email,
          phone: null,
          name: fbUser.displayName ?? "Friend",
          avatarUrl: fbUser.photoURL,
        };
        setUser(buildPublicUser(fbUser, data));
        setLoading(false);
      });
    });
    return () => {
      stopAuth();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const refresh = useCallback(async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) {
      setUser(null);
      return;
    }
    const snap = await getDoc(doc(db, "users", fbUser.uid));
    if (snap.exists()) {
      setUser(buildPublicUser(fbUser, snap.data() as any));
    }
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!identifier.includes("@")) {
      throw new Error("Use an email address to sign in.");
    }
    await signInWithEmailAndPassword(auth, identifier.trim(), password);
  }, []);

  const signUp = useCallback(
    async (identifier: string, password: string, name?: string) => {
      if (!identifier.includes("@")) {
        throw new Error("Use an email address to sign up.");
      }
      const cred = await createUserWithEmailAndPassword(
        auth,
        identifier.trim(),
        password
      );
      if (name?.trim()) {
        await updateAuthProfile(cred.user, { displayName: name.trim() });
      }
      await ensureUserDoc(cred.user, name);
    },
    []
  );

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    clearProfileCache();
    setUser(null);
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string) => {
      const fbUser = auth.currentUser;
      if (!fbUser?.email) throw new Error("Not signed in");
      const credential = EmailAuthProvider.credential(fbUser.email, current);
      await reauthenticateWithCredential(fbUser, credential);
      await updatePassword(fbUser, next);
    },
    []
  );

  const updateProfile = useCallback(
    async (patch: {
      name?: string;
      phone?: string;
      avatarUrl?: string | null;
    }) => {
      const fbUser = auth.currentUser;
      if (!fbUser) throw new Error("Not signed in");
      const ref = doc(db, "users", fbUser.uid);
      const update: DocumentData = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.phone !== undefined) update.phone = patch.phone;
      if (patch.avatarUrl !== undefined) update.avatarUrl = patch.avatarUrl;
      if (Object.keys(update).length) await updateDoc(ref, update);
      if (patch.name) {
        await updateAuthProfile(fbUser, { displayName: patch.name });
      }
      const snap = await getDoc(ref);
      const fresh = buildPublicUser(fbUser, snap.data() as any);
      setUser(fresh);
      return fresh;
    },
    []
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refresh,
      setUser,
      changePassword,
      updateProfile,
    }),
    [user, loading, signIn, signUp, signOut, refresh, changePassword, updateProfile]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
