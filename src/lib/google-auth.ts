'use client';

import { GoogleAuthProvider, signInWithPopup, type Auth } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ensureUserDoc, needsOnboarding, getDashboardRoute } from '@/lib/auth';

export async function signInWithGoogle(): Promise<{ redirectTo: string }> {
  if (!auth) throw new Error('Firebase auth no disponible');

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const credential = await signInWithPopup(auth as Auth, provider);
  const { uid, email, displayName } = credential.user;

  const userDoc = await ensureUserDoc(uid, email ?? '', displayName ?? '');

  if (!userDoc || needsOnboarding(userDoc)) {
    return { redirectTo: '/onboarding' };
  }

  return { redirectTo: getDashboardRoute(userDoc.plan) };
}
