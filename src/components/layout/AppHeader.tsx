'use client';

import type { ReactNode } from 'react';
import { useSidebar } from '@/contexts/SidebarContext';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  const { toggle } = useSidebar();

  return (
    <header className="h-12 flex items-center justify-between px-4 md:px-6 border-b border-[#2e2b20] bg-[#1e1c16] flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger button — mobile only */}
        <button
          onClick={toggle}
          aria-label="Menú de navegación"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218] transition-colors flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {title ? (
          <div className="min-w-0">
            <h1 className="font-sans font-medium text-[14px] text-[#e8d4a0] truncate leading-tight">{title}</h1>
            {subtitle && <p className="text-[11px] text-[#6b6050] truncate">{subtitle}</p>}
          </div>
        ) : (
          <span className="font-sans font-medium text-[14px] text-[#6b6050]">Avocat</span>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">{actions}</div>
      )}
    </header>
  );
}
