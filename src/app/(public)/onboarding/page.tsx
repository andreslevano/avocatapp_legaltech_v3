'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import OnboardingStep from '@/components/auth/OnboardingStep';

function OnboardingContent() {
  const [user, setUser]               = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading]         = useState(true);
  const router                        = useRouter();
  const searchParams                  = useSearchParams();
  const isChangingPlan                = searchParams.get('mode') === 'change';

  useEffect(() => {
    if (!auth) { router.push('/login'); return; }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { router.push('/login'); return; }

      if (db) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (snap.exists()) {
          const data = snap.data();
          // Only redirect away if NOT in plan-change mode
          if (!isChangingPlan && data.plan && data.onboardingComplete) {
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
  }, [router, isChangingPlan]);

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

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-avocat-cream flex items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-avocat-gold border-t-transparent animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
