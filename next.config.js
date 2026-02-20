/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for Firebase Hosting
  trailingSlash: false, // Cambiado a false para evitar redirects 308
  typescript: {
    ignoreBuildErrors: false, // Habilitado para mejor DX
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporalmente deshabilitado para deploy
  },
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Configuración para API routes
  experimental: {
    serverComponentsExternalPackages: ['pino', 'pdfkit', 'tesseract.js']
  },
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.alias = { ...config.resolve.alias };
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