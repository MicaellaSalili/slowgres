import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocFromServer,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { SavedAnalysis, UserAccount, Entitlements, PlanAnalysis } from "../types/engine";

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Error handling contracts required by Firebase integration skill
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial connection test
export async function testFirestoreConnection(): Promise<boolean> {
  const path = "test/connection";
  try {
    await getDocFromServer(doc(db, path));
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("the client is offline")
    ) {
      console.error("Please check your Firebase configuration.");
    }
    // Test collection might not exist, which is okay as long as permission isn't rejected
    return false;
  }
}

// User Profile Schema definition
export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  plan: "free" | "premium";
  dailyQuotaUsed?: number;
  lastQuotaDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper: Convert FirebaseUser to UserAccount
export function mapFirebaseUserToAccount(
  fbUser: FirebaseUser,
  profile?: FirestoreUserProfile | null
): UserAccount {
  return {
    id: fbUser.uid,
    email: fbUser.email || "",
    name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
    avatar_url: fbUser.photoURL || undefined,
    provider: "google",
    created_at: profile?.createdAt || new Date().toISOString(),
    is_verified: fbUser.emailVerified,
    plan: profile?.plan || "free",
    analyses_performed: profile?.dailyQuotaUsed || 0,
  };
}

// Sync or fetch User Profile in Firestore
export async function syncUserProfile(
  fbUser: FirebaseUser
): Promise<{ user: UserAccount; entitlements: Entitlements }> {
  const userPath = `users/${fbUser.uid}`;
  const today = new Date().toISOString().split("T")[0];

  try {
    const userDocRef = doc(db, "users", fbUser.uid);
    const snap = await getDoc(userDocRef);

    let profile: FirestoreUserProfile;

    if (snap.exists()) {
      profile = snap.data() as FirestoreUserProfile;
      let needsUpdate = false;
      const updates: Partial<FirestoreUserProfile> = {};

      if (profile.lastQuotaDate !== today) {
        updates.dailyQuotaUsed = 0;
        updates.lastQuotaDate = today;
        updates.updatedAt = new Date().toISOString();
        needsUpdate = true;
      }

      if (fbUser.displayName && profile.displayName !== fbUser.displayName) {
        updates.displayName = fbUser.displayName;
        needsUpdate = true;
      }

      if (fbUser.photoURL && profile.photoURL !== fbUser.photoURL) {
        updates.photoURL = fbUser.photoURL;
        needsUpdate = true;
      }

      if (needsUpdate) {
        try {
          await updateDoc(userDocRef, updates);
          profile = { ...profile, ...updates };
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, userPath);
        }
      }
    } else {
      // First-time user creation
      profile = {
        uid: fbUser.uid,
        email: fbUser.email || "",
        displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
        photoURL: fbUser.photoURL || undefined,
        plan: "free",
        dailyQuotaUsed: 0,
        lastQuotaDate: today,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(userDocRef, profile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, userPath);
      }
    }

    const user = mapFirebaseUserToAccount(fbUser, profile);
    const isPremium = profile.plan === "premium";

    const entitlements: Entitlements = {
      plan: profile.plan,
      daily_limit: isPremium ? 999999 : 25,
      daily_used: profile.dailyQuotaUsed || 0,
      history_retention_days: isPremium ? 90 : 30,
      can_export: true,
      show_ads: false,
    };

    return { user, entitlements };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("{")) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

// Update User Quota in Firestore
export async function updateUserQuotaInFirestore(
  userId: string,
  newUsed: number
): Promise<void> {
  const userPath = `users/${userId}`;
  const today = new Date().toISOString().split("T")[0];
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      dailyQuotaUsed: newUsed,
      lastQuotaDate: today,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

// Update User Plan in Firestore
export async function updateUserPlanInFirestore(
  userId: string,
  plan: "free" | "premium"
): Promise<void> {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      plan,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

// Save Analysis to Firestore Subcollection
export async function saveAnalysisToFirestore(
  userId: string,
  saved: SavedAnalysis
): Promise<void> {
  const analysisPath = `users/${userId}/analyses/${saved.id}`;
  try {
    const docRef = doc(db, "users", userId, "analyses", saved.id);
    const data: Record<string, any> = {
      id: saved.id,
      userId,
      title: saved.title,
      total_time_ms: saved.total_time_ms,
      findings_count: saved.findings_count,
      created_at: saved.created_at,
      analysis_json: JSON.stringify(saved.analysis),
    };

    if (saved.query_text) {
      data.query_text = saved.query_text;
    }
    if (saved.planning_time_ms !== undefined) {
      data.planning_time_ms = saved.planning_time_ms;
    }
    if (saved.critical_count !== undefined) {
      data.critical_count = saved.critical_count;
    }

    await setDoc(docRef, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, analysisPath);
  }
}

// Delete an Analysis from Firestore
export async function deleteAnalysisFromFirestore(
  userId: string,
  analysisId: string
): Promise<void> {
  const analysisPath = `users/${userId}/analyses/${analysisId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "analyses", analysisId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, analysisPath);
  }
}

// Clear all Analyses for a User
export async function clearAllAnalysesFromFirestore(
  userId: string
): Promise<void> {
  const collectionPath = `users/${userId}/analyses`;
  try {
    const q = query(collection(db, "users", userId, "analyses"), limit(100));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, collectionPath);
  }
}

// Real-time listener for user's analyses subcollection
export function subscribeToUserAnalyses(
  userId: string,
  onData: (analyses: SavedAnalysis[]) => void,
  onError: (error: unknown) => void
): () => void {
  const collectionPath = `users/${userId}/analyses`;
  const q = query(
    collection(db, "users", userId, "analyses"),
    orderBy("created_at", "desc"),
    limit(50)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: SavedAnalysis[] = [];
      snapshot.forEach((d) => {
        const raw = d.data();
        try {
          const parsedAnalysis: PlanAnalysis = JSON.parse(raw.analysis_json);
          items.push({
            id: raw.id,
            title: raw.title,
            created_at: raw.created_at,
            query_text: raw.query_text,
            total_time_ms: raw.total_time_ms,
            planning_time_ms: raw.planning_time_ms,
            findings_count: raw.findings_count,
            critical_count: raw.critical_count || 0,
            analysis: parsedAnalysis,
          });
        } catch (e) {
          console.warn("Failed to parse analysis JSON for item:", raw.id);
        }
      });
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionPath);
    }
  );

  return unsubscribe;
}

// Sign in with Google (Firebase Auth)
export async function signInWithGoogleFirebase(): Promise<FirebaseUser> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

// Sign out (Firebase Auth)
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}
