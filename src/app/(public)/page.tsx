'use client';

import { useEffect } from 'react';
import HeroSection from '@/components/landing/HeroSection';
import ProblemSection from '@/components/landing/ProblemSection';
import PersonaTabs from '@/components/landing/PersonaTabs';
import ValueProps from '@/components/landing/ValueProps';
import HowItWorks from '@/components/landing/HowItWorks';
import AgentSection from '@/components/landing/AgentSection';
import PricingSection from '@/components/landing/PricingSection';
import TrustBand from '@/components/landing/TrustBand';
import CtaSection from '@/components/landing/CtaSection';
import ZapierChatbot from '@/components/ZapierChatbot';
import { trackSessionStart } from '@/lib/gtag';

export default function HomePage() {
  useEffect(() => {
    trackSessionStart();
  }, []);

  return (
    <>
      <HeroSection />
      <ProblemSection />
      <PersonaTabs />
      <ValueProps />
      <HowItWorks />
      <AgentSection />
      <PricingSection />
      <TrustBand />
      <CtaSection />
      <ZapierChatbot />
    </>
  );
}
