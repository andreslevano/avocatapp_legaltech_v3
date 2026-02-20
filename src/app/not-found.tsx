import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-app flex flex-col items-center justify-center px-4">
      <h1 className="text-h1 text-text-primary mb-2">404</h1>
      <p className="text-body text-text-secondary mb-6">Página no encontrada</p>
      <Link href="/" className="btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}
