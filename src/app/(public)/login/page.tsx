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
      <div data-theme="dark" className="hidden md:flex flex-col justify-between bg-bg px-12 py-16">
        <div>
          <Link href="/" className="text-accent-text font-display text-h2 font-semibold tracking-tight">
            Avocat
          </Link>
          <p className="mt-2 text-small text-text">Plataforma LegalTech</p>
        </div>

        <div>
          <blockquote className="font-display text-h2 leading-snug text-text italic">
            &ldquo;El derecho no debe ser un privilegio de quien puede pagarlo.&rdquo;
          </blockquote>
          <p className="mt-4 text-small text-text-muted">— Filosofía Avocat</p>
        </div>

        <div className="flex gap-3">
          {['Abogados', 'Estudiantes', 'Particulares'].map(label => (
            <span
              key={label}
              className="px-3 py-1 rounded-full bg-surface border border-border text-small text-text"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-12 bg-bg">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-h2 text-text mb-1">Bienvenido de nuevo</h1>
          <p className="text-small text-text-muted mb-8">Inicia sesión en tu cuenta de Avocat.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
