/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' - COMENTADO: Firebase Hosting usa Cloud Functions para API routes
  // Las API routes se manejan con Cloud Functions según firebase.json
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
  // Configuración webpack para PDFKit y Tesseract.js
  webpack: (config, { isServer }) => {
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
    }
    return config;
  }
}

module.exports = nextConfig
