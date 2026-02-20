'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import Sidebar from './Sidebar';
import UserMenu from './UserMenu';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User | null;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
}

export default function DashboardLayout({ 
  children, 
  user, 
  title, 
  description, 
  icon, 
  iconColor 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-app">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-sidebar shadow-sm border-b border-border/50">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-text-on-dark/80 hover:text-text-on-dark hover:bg-hover/20 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-border"
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page title and description */}
            <div className="flex-1 flex items-center">
              <div className="w-10 h-10 bg-text-on-dark/20 rounded-lg flex items-center justify-center mr-4">
                <span className="text-text-on-dark font-bold text-lg">{icon}</span>
              </div>
              <div>
                <h1 className="text-h3 text-text-on-dark">{title}</h1>
                <p className="text-small text-text-on-dark/80">{description}</p>
              </div>
            </div>

            {/* User menu */}
            <UserMenu user={user} />
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
