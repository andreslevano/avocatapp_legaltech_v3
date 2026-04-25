'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import OnboardingStep from '@/components/auth/OnboardingStep';

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) { router.push('/login'); return; }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
        return;
      }

      // If user already has a plan, redirect to dashboard
      if (db) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.plan && data.onboardingComplete) {
            router.push('/dashboard');
            return;
          }
          setDisplayName(data.displayName || data.firstName || firebaseUser.email || '');
        }
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-avocat-cream flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <OnboardingStep uid={user.uid} displayName={displayName} />;
}
