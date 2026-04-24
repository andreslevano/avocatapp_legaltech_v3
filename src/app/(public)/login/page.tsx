import type { Metadata } from 'next';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Iniciar sesión — Avocat',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left panel — brand */}
      <div className="hidden md:flex flex-col justify-between bg-avocat-black px-12 py-16">
        <div>
          <Link href="/" className="text-avocat-gold font-display text-[28px] font-semibold tracking-tight">
            Avocat
          </Link>
          <p className="mt-2 text-small text-ds-text">Plataforma LegalTech</p>
        </div>

        <div>
          <blockquote className="font-display text-[26px] leading-snug text-avocat-cream italic">
            &ldquo;El derecho no debe ser un privilegio de quien puede pagarlo.&rdquo;
          </blockquote>
          <p className="mt-4 text-small text-avocat-gray9">— Filosofía Avocat</p>
        </div>

        <div className="flex gap-3">
          {['Abogados', 'Estudiantes', 'Particulares'].map(label => (
            <span
              key={label}
              className="px-3 py-1 rounded-full bg-ds-card border border-ds-border text-small text-ds-text"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-12 bg-avocat-cream">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-h2 text-avocat-black mb-1">Bienvenido de nuevo</h1>
          <p className="text-small text-avocat-gray5 mb-8">Inicia sesión en tu cuenta de Avocat.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
