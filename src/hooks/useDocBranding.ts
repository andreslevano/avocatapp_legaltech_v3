'use client';

// Document branding for client-side outputs (preview, Word, PDF). Live: follows users/{uid} so a
// change saved in Perfil applies without reloading. Resolution lives in src/lib/branding.ts.

import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppAuth } from '@/contexts/AppAuthContext';
import {
  resolveBranding, sanitizeBranding, withLogoSrc,
  type Branding, type BrandingOwner, type OrgTemplateContext, type ResolvedBranding,
} from '@/lib/branding';

export interface DocBranding {
  /** Word (.doc HTML): the logo stays the Storage download URL (Word fetches it; see report). */
  word: ResolvedBranding;
  /** Preview iframe + browser PDF: the logo inlined as a data URI (no canvas taint, no network). */
  pdf: ResolvedBranding;
  /** False while the logo is still being inlined — wait before building a PDF. */
  ready: boolean;
  /** The saved branding (sanitized) and its owner document — for the Perfil editor. */
  stored: Branding;
  owner: BrandingOwner;
}

const cache = new Map<string, Promise<string | null>>();

/** Storage download URL → data URI (bucket CORS allows GET from any origin). */
export function logoDataUri(url: string): Promise<string | null> {
  if (!cache.has(url)) {
    cache.set(url, fetch(url)
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then(blob => new Promise<string>((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => rej(fr.error);
        fr.readAsDataURL(blob);
      }))
      .catch(() => { cache.delete(url); return null; }));
  }
  return cache.get(url)!;
}

export function useDocBranding(org?: OrgTemplateContext | null): DocBranding {
  const { userDoc } = useAppAuth();
  const [owner, setOwner] = useState<BrandingOwner>(userDoc as unknown as BrandingOwner);

  useEffect(() => {
    if (!db || !userDoc.uid) return;
    return onSnapshot(doc(db, 'users', userDoc.uid), s => { if (s.exists()) setOwner(s.data() as BrandingOwner); }, () => undefined);
  }, [userDoc.uid]);

  const company = org?.company, cif = org?.cif, member = org?.member;
  const word = useMemo(
    () => resolveBranding(owner, company && cif ? { company, cif, member: member === true } : null),
    [owner, company, cif, member],
  );

  const logoUrl = word.logo?.src ?? null;
  const [inlined, setInlined] = useState<{ url: string; src: string | null } | null>(null);
  useEffect(() => {
    if (!logoUrl) return;
    let alive = true;
    logoDataUri(logoUrl).then(src => { if (alive) setInlined({ url: logoUrl, src }); });
    return () => { alive = false; };
  }, [logoUrl]);

  const done = !logoUrl || inlined?.url === logoUrl;
  const pdf = useMemo(() => (done && logoUrl ? withLogoSrc(word, inlined?.src) : word), [word, done, logoUrl, inlined]);
  const stored = useMemo(() => sanitizeBranding(owner.branding), [owner]);
  return { word, pdf, ready: done, stored, owner };
}
