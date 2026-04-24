/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/gtag';

/**
 * Client-side analytics listener that sends GA4 page_view events
 * on initial load and on every route change.
 */
export default function ClientAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams?.toString();

  useEffect(() => {
    if (!pathname) return;

    const pathWithSearch = search ? `${pathname}?${search}` : pathname;
    trackPageView(pathWithSearch);
  }, [pathname, search]);

  return null;
}

