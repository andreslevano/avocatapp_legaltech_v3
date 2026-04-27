'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Logo from '@/components/brand/Logo';
import type { UserDoc } from '@/lib/auth';
import UserProfilePanel from '@/components/layout/UserProfilePanel';

// ── Icons ───────────────────────────────────────────────────────────────────

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);
const IconCases = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
  </svg>
);
const IconClients = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
const IconAgent = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);
const IconTools = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);
const IconDocs = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

// ── Nav definitions per plan ─────────────────────────────────────────────────

const NAV_ABOGADOS = [
  { href: '/dashboard',  label: 'Dashboard',    icon: <IconDashboard /> },
  { href: '/cases',      label: 'Casos',        icon: <IconCases /> },
  { href: '/clients',    label: 'Clientes',     icon: <IconClients /> },
  { href: '/agent',      label: 'Agente IA',    icon: <IconAgent /> },
  { href: '/tools',      label: 'Herramientas', icon: <IconTools /> },
  { href: '/documents',  label: 'Documentos',   icon: <IconDocs /> },
];

const NAV_ESTUDIANTES = [
  { href: '/agent',      label: 'Tutor IA',  icon: <IconAgent /> },
  { href: '/tools',      label: 'Escritos',  icon: <IconTools /> },
  { href: '/documents',  label: 'Dossier',   icon: <IconDocs /> },
];

const NAV_AUTOSERVICIO = [
  { href: '/agent',      label: 'Asistente',    icon: <IconAgent /> },
  { href: '/tools',      label: 'Herramientas', icon: <IconTools /> },
  { href: '/documents',  label: 'Documentos',   icon: <IconDocs /> },
];

function getNavItems(plan: string | null) {
  switch (plan) {
    case 'Abogados':    return NAV_ABOGADOS;
    case 'Estudiantes': return NAV_ESTUDIANTES;
    case 'Autoservicio': return NAV_AUTOSERVICIO;
    default:            return NAV_ESTUDIANTES;
  }
}

function getHomeHref(plan: string | null) {
  return plan === 'Abogados' ? '/dashboard' : '/agent';
}

// ── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ href, label, icon, active }: {
  href: string; label: string; icon: React.ReactNode; active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={[
        'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
        active
          ? 'bg-avocat-gold text-white'
          : 'text-[#6b6050] hover:text-[#c8c0ac] hover:bg-[#252218]',
      ].join(' ')}
    >
      {icon}
    </Link>
  );
}

// ── Rail ─────────────────────────────────────────────────────────────────────

interface RailProps {
  user: User;
  userDoc: UserDoc;
}

export default function Rail({ user, userDoc }: RailProps) {
  const pathname = usePathname();

  const navItems  = getNavItems(userDoc.plan);
  const homeHref  = getHomeHref(userDoc.plan);
  const mobileItems = navItems.slice(0, 4);

  const [profileOpen, setProfileOpen] = useState(false);
  const [anchorRect,  setAnchorRect]  = useState<DOMRect | null>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  const openProfile = () => {
    if (avatarBtnRef.current) setAnchorRect(avatarBtnRef.current.getBoundingClientRect());
    setProfileOpen(v => !v);
  };

  const initials = (user.displayName ?? user.email ?? 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* ── Desktop: left vertical rail ── */}
      <nav className="hidden md:flex w-[52px] h-full bg-[#161410] flex-col items-center py-3 border-r border-[#2e2b20] flex-shrink-0">
        <div className="mb-5">
          <Logo variant="symbol" theme="gold" size={28} href={homeHref} />
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          {navItems.map(({ href, label, icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={pathname === href || pathname.startsWith(`${href}/`)}
            />
          ))}
        </div>
        <button
          ref={avatarBtnRef}
          onClick={openProfile}
          title="Perfil de usuario"
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
            profileOpen
              ? 'bg-avocat-gold/30 border-avocat-gold'
              : 'bg-avocat-gold/20 border-avocat-gold/40 hover:border-avocat-gold/70'
          }`}
        >
          <span className="text-[11px] font-sans font-semibold text-avocat-gold leading-none">{initials}</span>
        </button>
        <UserProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} anchorRect={anchorRect} />
      </nav>

      {/* ── Mobile: fixed bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#161410] border-t border-[#2e2b20] flex items-center justify-around z-40 px-2">
        {mobileItems.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 flex-1 py-2">
              <span className={active ? 'text-avocat-gold' : 'text-[#6b6050]'}>{icon}</span>
              <span className={`text-[9px] font-sans ${active ? 'text-avocat-gold' : 'text-[#6b6050]'}`}>{label}</span>
            </Link>
          );
        })}
        <button onClick={openProfile} className="flex flex-col items-center gap-0.5 flex-1 py-2">
          <div className="w-7 h-7 rounded-full bg-avocat-gold/20 border border-avocat-gold/40 flex items-center justify-center">
            <span className="text-[10px] font-sans font-semibold text-avocat-gold leading-none">{initials}</span>
          </div>
          <span className="text-[9px] font-sans text-[#6b6050]">Perfil</span>
        </button>
      </nav>
    </>
  );
}
