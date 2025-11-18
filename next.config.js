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
  // Exclude API routes from build (handled by Firebase Functions)
  // Note: API routes in src/app/api are handled by Firebase Cloud Functions
  // and should not be built as part of the static export
}

module.exports = nextConfig