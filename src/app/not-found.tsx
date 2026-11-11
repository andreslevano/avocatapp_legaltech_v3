import Link from 'next/link';
import { buttonClasses } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <h1 className="text-h1 text-text mb-2">404</h1>
      <p className="text-body text-text-muted mb-6">Página no encontrada</p>
      <Link href="/" className={`${buttonClasses({ variant: 'primary' })}`}>
        Volver al inicio
      </Link>
    </div>
  );
}
