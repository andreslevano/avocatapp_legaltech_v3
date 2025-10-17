/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Comentado para permitir API routes
  trailingSlash: false, // Cambiado a false para evitar redirects 308
  typescript: {
    ignoreBuildErrors: false, // Habilitado para mejor DX
  },
  eslint: {
    ignoreDuringBuilds: false, // Habilitado para mejor DX
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