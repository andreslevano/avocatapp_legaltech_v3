'use client';

import { useEffect } from 'react';
import HeroSection from '@/components/landing/HeroSection';
import PersonaTabs from '@/components/landing/PersonaTabs';
import ValueProps from '@/components/landing/ValueProps';
import PricingSection from '@/components/landing/PricingSection';
import ZapierChatbot from '@/components/ZapierChatbot';
import { trackSessionStart } from '@/lib/gtag';

export default function HomePage() {
  useEffect(() => {
    trackSessionStart();
  }, []);

  return (
    <>
      <HeroSection />
      <PersonaTabs />
      <ValueProps />
      <PricingSection />
      <ZapierChatbot />
    </>
  );
}
