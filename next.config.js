/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for Firebase Hosting - API routes handled by Cloud Functions via firebase.json rewrites
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
    serverComponentsExternalPackages: ['pino']
  }
}

module.exports = nextConfig