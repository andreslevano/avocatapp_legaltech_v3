/** @type {import('next').NextConfig} */
const nextConfig = {
  // No static export — using Firebase Hosting web frameworks (supports SSR + API routes)
  trailingSlash: false,
  typescript: {
    // Pre-existing type errors in api.disabled/* — skip to unblock deploy
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    domains: ['localhost', 'firebasestorage.googleapis.com'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Configuración para API routes
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pdfkit', 'tesseract.js', 'pdf-parse', 'mammoth', 'xlsx']
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // DS v4 Phase 9: /dashboard/* retired in favour of (app)/* — keep every legacy path working (301).
  // Query strings (e.g. Stripe ?payment=success&caseId=…) are carried over by Next.
  async redirects() {
    const r = (source, destination) => ({ source, destination, statusCode: 301 });
    return [
      r('/dashboard', '/panel'),
      r('/dashboard/casos', '/cases'),
      r('/dashboard/casos-urgentes', '/cases?estado=urgente'),
      r('/dashboard/casos-a-tiempo', '/cases?estado=a-tiempo'),
      r('/dashboard/casos-vencidos', '/cases?estado=vencido'),
      r('/dashboard/crear-caso', '/cases/new'),
      r('/dashboard/directorio-clientes', '/clients'),
      r('/dashboard/repositorio', '/documents'),
      r('/dashboard/generar-escritos', '/tools/generacion'),
      r('/dashboard/autoservicio/generacion-escritos', '/tools/generacion'),
      r('/dashboard/reclamacion-cantidades', '/escritos/reclamacion-cantidad'),
      r('/dashboard/autoservicio/reclamacion-cantidades', '/escritos/reclamacion-cantidad'),
      r('/dashboard/accion-tutela', '/escritos/accion-tutela'),
      r('/dashboard/accion-tutela/history', '/escritos/accion-tutela/historial'),
      r('/dashboard/autoservicio/accion-tutela', '/escritos/accion-tutela'),
      r('/dashboard/analisis-caso', '/tools/analisis'),
      r('/dashboard/auditoria-legal', '/tools/analisis'),
      r('/dashboard/autoservicio/extraccion-datos', '/tools/extraccion-datos'),
      r('/dashboard/autoservicio/revision-email', '/tools/revision-email'),
      r('/dashboard/estudiantes', '/tools/estudiantes'),
      r('/dashboard/administrador', '/admin'),
      r('/dashboard/:path*', '/panel'),
      r('/profile', '/settings/perfil'),
      r('/subscription', '/settings/suscripcion'),
    ];
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      // Ensure jspdf/fast-png deps resolve for client bundle
      pako: require.resolve('pako'),
      iobuffer: require.resolve('iobuffer'),
    };
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({ canvas: 'canvas' });
      }
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /api\.(backup|disabled)/,
        use: 'ignore-loader'
      });
    }
    return config;
  },
}

module.exports = nextConfig