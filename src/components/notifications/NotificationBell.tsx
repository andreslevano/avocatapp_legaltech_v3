'use client';

// Bell with the unread count (F3), shown in every page header for users with contract alerts.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppAuth } from '@/contexts/AppAuthContext';
import { canUseContracts } from '@/lib/contracts/config';
import { watchNotifications } from '@/lib/contracts/client';

export default function NotificationBell() {
  const { user, userDoc } = useAppAuth();
  const enabled = canUseContracts(userDoc.plan, user);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!enabled || !user) return;
    return watchNotifications(user.uid, ns => setUnread(ns.filter(n => !n.readAt).length));
  }, [enabled, user]);

  if (!enabled) return null;
  return (
    <Link href="/notifications" aria-label={unread ? `Avisos (${unread} sin leer)` : 'Avisos'} title="Avisos"
      className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218] transition-colors flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[18px] h-[18px]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-avocat-gold text-[#1e1e1e] text-[9px] font-semibold flex items-center justify-center">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
