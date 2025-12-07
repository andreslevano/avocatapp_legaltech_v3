/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export' - COMENTADO para desarrollo local (necesario para API routes y rutas dinámicas)
  // Descomentar solo para build de producción estático
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
  // Configuración webpack para PDFKit y Tesseract.js - copiar archivos de fuente
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Copiar archivos .afm de PDFKit al bundle
      config.module = {
        ...config.module,
        rules: [
          ...(config.module?.rules || []),
          {
            test: /\.afm$/,
            type: 'asset/resource',
            generator: {
              filename: 'static/[name][ext]'
            }
          },
          // Incluir archivos WASM y PROTO necesarios para tesseract.js
          {
            test: /\.(wasm|proto)$/,
            type: 'asset/resource',
            generator: {
              filename: 'static/[name][ext]'
            }
          },
        ],
      };
      
      // Asegurar que PDFKit y tesseract.js puedan encontrar sus archivos de datos
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          fs: false,
        },
      };
      
      // Configuración para tesseract.js workers
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'tesseract.js': 'commonjs tesseract.js'
        });
      }
    }
    return config;
  },
}

module.exports = nextConfig