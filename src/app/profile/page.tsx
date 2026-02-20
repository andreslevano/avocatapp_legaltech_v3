'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User, Auth } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useI18n } from '@/hooks/useI18n';

interface ProfileData {
  displayName?: string;
  phone?: string;
  legalSpecialty?: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (auth && typeof auth.onAuthStateChanged === 'function' && 'app' in auth) {
      setIsFirebaseReady(true);
      const unsubscribe = onAuthStateChanged(auth as Auth, (u) => {
        if (u) {
          setUser(u);
        } else {
          router.push('/login');
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [router]);

  const loadProfile = useCallback(async (uid: string, authUser?: User | null) => {
    if (!db) return;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile({
          displayName: data.displayName ?? data.profile?.displayName ?? authUser?.displayName ?? '',
          phone: data.phone ?? data.profile?.phone ?? '',
          legalSpecialty: data.legalSpecialty ?? data.profile?.legalSpecialty ?? '',
        });
      } else {
        setProfile({
          displayName: authUser?.displayName ?? '',
          phone: '',
          legalSpecialty: '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setProfile({
        displayName: authUser?.displayName ?? '',
        phone: '',
        legalSpecialty: '',
      });
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.uid && db) {
      setProfileLoading(true);
      loadProfile(user.uid, user);
    } else if (!user) {
      setProfileLoading(false);
    }
  }, [user?.uid, user, db, loadProfile]);

  const handleSave = async () => {
    if (!user?.uid || !db) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          displayName: profile.displayName,
          email: user.email,
          profile: {
            phone: profile.phone,
            legalSpecialty: profile.legalSpecialty,
          },
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user?.uid) loadProfile(user.uid, user);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sidebar mx-auto"></div>
          <p className="mt-4 text-text-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !isFirebaseReady) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8 relative">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-h1 text-text-primary mb-2">{t('profile.title')}</h1>
        <p className="text-body text-text-secondary mb-8">{t('profile.subtitle')}</p>

        {/* Personal Information Card */}
        <div className="bg-card overflow-hidden shadow rounded-lg border border-border mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-h2 text-text-primary mb-4">{t('profile.personalInfo')}</h2>
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-muted/30 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-text-primary font-bold text-2xl">
                  {(profile.displayName || user.email || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-text-primary">
                  {profile.displayName || user.displayName || t('profile.user')}
                </h3>
                <p className="text-text-secondary">{user.email}</p>
                <p className="text-sm text-text-secondary mt-1">
                  {t('profile.memberSince')}{' '}
                  {new Date(user.metadata.creationTime || '').toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings Card */}
        <div className="bg-card overflow-hidden shadow rounded-lg border border-border">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-h2 text-text-primary mb-4">{t('profile.accountSettings')}</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('profile.fullName')}
                </label>
                <input
                  type="text"
                  value={profile.displayName ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
                  className="input-field"
                  placeholder={t('profile.enterFullName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('profile.email')}
                </label>
                <input
                  type="email"
                  value={user.email || ''}
                  disabled
                  className="input-field bg-surface-muted/20 cursor-not-allowed"
                />
                <p className="mt-1 text-sm text-text-secondary">{t('profile.emailCannotChange')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('profile.phone')}
                </label>
                <input
                  type="tel"
                  value={profile.phone ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  className="input-field"
                  placeholder={t('profile.enterPhone')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {t('profile.legalSpecialty')}
                </label>
                <select
                  value={profile.legalSpecialty ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, legalSpecialty: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Selecciona especialidad</option>
                  <option value="Derecho Civil">Derecho Civil</option>
                  <option value="Derecho Penal">Derecho Penal</option>
                  <option value="Derecho Laboral">Derecho Laboral</option>
                  <option value="Derecho Comercial">Derecho Comercial</option>
                  <option value="Derecho de Familia">Derecho de Familia</option>
                  <option value="Derecho Administrativo">Derecho Administrativo</option>
                  <option value="Otra">Otra</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Floating circle buttons */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
          <div className="relative group">
            <button
              onClick={handleCancel}
              title={t('profile.cancel')}
              className="w-14 h-14 rounded-full bg-surface-muted/30 border border-border text-text-primary shadow-lg flex items-center justify-center hover:bg-surface-muted/50 transition-all"
              aria-label={t('profile.cancel')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-sidebar text-text-on-dark text-sm font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t('profile.cancel')}
            </span>
          </div>
          <div className="relative group">
            <button
              onClick={handleSave}
              disabled={saving}
              title={t('profile.saveChanges')}
              className="w-14 h-14 rounded-full bg-sidebar text-text-on-dark shadow-lg flex items-center justify-center hover:bg-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('profile.saveChanges')}
            >
              {saving ? (
                <div className="w-6 h-6 border-2 border-text-on-dark/30 border-t-text-on-dark rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-sidebar text-text-on-dark text-sm font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t('profile.saveChanges')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
