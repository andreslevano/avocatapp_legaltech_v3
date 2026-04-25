'use client';

import type { ReactNode } from 'react';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function AppHeader({ title, subtitle, actions }: AppHeaderProps) {
  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-[#2e2b20] bg-[#1e1c16] flex-shrink-0">
      <div className="min-w-0">
        {title ? (
          <>
            <h1 className="font-sans font-medium text-[14px] text-[#e8d4a0] truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-[#6b6050] truncate">{subtitle}</p>
            )}
          </>
        ) : (
          <span className="font-sans font-medium text-[14px] text-[#6b6050]">Avocat</span>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </header>
  );
}
