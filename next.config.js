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
  // Exclude api.backup and api.disabled from page collection
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // Configuración webpack para PDFKit y Tesseract.js
  webpack: (config, { isServer }) => {
    // Polyfill de Buffer para el cliente (necesario para pdf-parse)
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer'),
      };
    }
    
    if (isServer) {
      // Configurar PDFKit para que funcione en el servidor
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      
      // Asegurar que los archivos de fuente se incluyan
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          canvas: 'canvas',
        });
      }
      
      // Ignore api.backup and api.disabled directories
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /api\.(backup|disabled)/,
        use: 'ignore-loader'
      });
    }
    return config;
  }
}

module.exports = nextConfig