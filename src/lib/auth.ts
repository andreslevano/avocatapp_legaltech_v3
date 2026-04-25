import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type UserPlan = 'Abogados' | 'Estudiantes' | 'Autoservicio';

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  plan: UserPlan | null;
  onboardingComplete: boolean;
  isActive: boolean;
  isAdmin: boolean;
  role: string;
  createdAt: unknown;
  updatedAt: unknown;
}

/** Returns the default app route for a given plan */
export function getDashboardRoute(plan: UserPlan | null): string {
  switch (plan) {
    case 'Abogados':     return '/dashboard';
    case 'Estudiantes':  return '/agent';
    case 'Autoservicio': return '/agent';
    default:             return '/onboarding';
  }
}

/**
 * Ensures a Firestore user document exists.
 * - If no doc: creates one with plan=null, onboardingComplete=false
 * - If doc exists but plan=null: does not overwrite — caller should redirect to /onboarding
 * Returns the user doc data.
 */
export async function ensureUserDoc(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserDoc | null> {
  if (!db) return null;

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const newDoc: Omit<UserDoc, 'createdAt' | 'updatedAt'> & { createdAt: unknown; updatedAt: unknown } = {
      uid,
      email,
      displayName,
      plan: null,
      onboardingComplete: false,
      isActive: true,
      isAdmin: false,
      role: 'user',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, newDoc);
    return newDoc as UserDoc;
  }

  return snap.data() as UserDoc;
}

/** Returns true if the user needs to complete onboarding */
export function needsOnboarding(userDoc: UserDoc | null): boolean {
  if (!userDoc) return true;
  return !userDoc.plan || !userDoc.onboardingComplete;
}
