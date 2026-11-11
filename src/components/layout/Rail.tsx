'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Logo from '@/components/brand/Logo';
import type { UserDoc } from '@/lib/auth';
import UserProfilePanel from '@/components/layout/UserProfilePanel';
import { Briefcase, FileText, LayoutDashboard, Sparkles, Users, Wrench } from 'lucide-react';

// ── Icons (Lucide, 20px in nav) ─────────────────────────────────────────────

const ICON = { size: 20, 'aria-hidden': true } as const;
const IconDashboard = () => <LayoutDashboard {...ICON} />;
const IconCases     = () => <Briefcase {...ICON} />;
const IconClients   = () => <Users {...ICON} />;
const IconAgent     = () => <Sparkles {...ICON} />;
const IconTools     = () => <Wrench {...ICON} />;
const IconDocs      = () => <FileText {...ICON} />;

// ── Nav definitions per plan ─────────────────────────────────────────────────

const NAV_ABOGADOS = [
  { href: '/dashboard',  label: 'Panel',        icon: <IconDashboard /> },
  { href: '/cases',      label: 'Casos',        icon: <IconCases /> },
  { href: '/clients',    label: 'Clientes',     icon: <IconClients /> },
  { href: '/agent',      label: 'Agente IA',    icon: <IconAgent /> },
  { href: '/tools',      label: 'Herramientas', icon: <IconTools /> },
  { href: '/documents',  label: 'Documentos',   icon: <IconDocs /> },
];

// Mobile bottom bar: 4 priority items (+ Perfil = 5 total)
const MOBILE_NAV_ABOGADOS = [
  { href: '/cases',      label: 'Casos',        icon: <IconCases /> },
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
  { href: '/clients',    label: 'Clientes',     icon: <IconClients /> },
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
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={[
        'w-9 h-9 flex items-center justify-center rounded-lg transition-colors',
        active
          ? 'bg-accent text-text-on-accent'
          : 'text-text-muted hover:text-text hover:bg-surface-muted',
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
  const pathname = usePathname() ?? '';

  const navItems    = getNavItems(userDoc.plan);
  const homeHref    = getHomeHref(userDoc.plan);
  const mobileItems = userDoc.plan === 'Abogados' ? MOBILE_NAV_ABOGADOS : navItems.slice(0, 4);

  const [profileOpen, setProfileOpen] = useState(false);
  const [anchorRect,  setAnchorRect]  = useState<DOMRect | null>(null);
  const avatarBtnRef      = useRef<HTMLButtonElement>(null);
  const mobileAvatarBtnRef = useRef<HTMLButtonElement>(null);

  const openProfile = () => {
    if (avatarBtnRef.current) setAnchorRect(avatarBtnRef.current.getBoundingClientRect());
    setProfileOpen(v => !v);
  };

  const openProfileMobile = () => {
    if (mobileAvatarBtnRef.current) setAnchorRect(mobileAvatarBtnRef.current.getBoundingClientRect());
    setProfileOpen(v => !v);
  };

  const initials = (user.displayName ?? user.email ?? 'U')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      {/* ── Desktop: left vertical rail ── */}
      <nav aria-label="Navegación principal" className="hidden md:flex w-rail h-full bg-bg flex-col items-center py-3 border-r border-border flex-shrink-0">
        <div className="mb-5">
          <Logo variant="mark" tone="gold" size={28} href={homeHref} />
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
          aria-label="Perfil de usuario"
          aria-expanded={profileOpen}
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors bg-accent-subtle ${
            profileOpen ? 'border-accent' : 'border-accent-border hover:border-accent'
          }`}
        >
          <span className="text-label font-semibold text-accent-text leading-none tracking-normal">{initials}</span>
        </button>
        <UserProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} anchorRect={anchorRect} />
      </nav>

      {/* ── Mobile: fixed bottom navigation ── */}
      <nav aria-label="Navegación principal (móvil)" className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-bg border-t border-border flex items-center justify-around z-nav px-2">
        {mobileItems.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="flex flex-col items-center gap-0.5 flex-1 py-2 min-h-touch">
              <span className={active ? 'text-accent-text' : 'text-text-muted'}>{icon}</span>
              <span className={`text-caption ${active ? 'text-accent-text' : 'text-text-muted'}`}>{label}</span>
            </Link>
          );
        })}
        <button ref={mobileAvatarBtnRef} onClick={openProfileMobile} aria-expanded={profileOpen} className="flex flex-col items-center gap-0.5 flex-1 py-2 min-h-touch">
          <div className="w-7 h-7 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center">
            <span className="text-label font-semibold text-accent-text leading-none tracking-normal">{initials}</span>
          </div>
          <span className="text-caption text-text-muted">Perfil</span>
        </button>
      </nav>
    </>
  );
}
