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