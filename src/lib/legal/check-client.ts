'use client';

// Client side of the NDA legal check (F2 step 2).

import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CheckFinding, CheckVerdict } from './check';

export interface NdaCheckResult {
  id: string;
  contractId: string;
  documentId: string;
  title: string;
  ranAt: string;
  verdict: CheckVerdict;
  findings: CheckFinding[];
  unvalidatedBaseline: boolean;
}

export async function runCheck(user: User, contractId: string): Promise<NdaCheckResult> {
  const res = await fetch('/api/legal/check', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contractId }),
  });
  const data = await res.json().catch(() => ({})) as { check?: NdaCheckResult; error?: string };
  if (!res.ok || !data.check) throw new Error(data.error ?? 'No se pudo revisar el NDA.');
  return data.check;
}

export async function getNdaCheck(id: string): Promise<NdaCheckResult | null> {
  if (!db) return null;
  const s = await getDoc(doc(db, 'nda_checks', id));
  return s.exists() ? ({ id: s.id, ...s.data() } as NdaCheckResult) : null;
}
