'use client';

import { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Pricing from '@/components/Pricing';
import Footer from '@/components/Footer';
import { trackSessionStart } from '@/lib/gtag';

export default function Home() {
  useEffect(() => {
    // Track session start on homepage
    trackSessionStart();
  }, []);

  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
