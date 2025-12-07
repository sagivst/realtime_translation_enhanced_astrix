/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/3333_4444__Operational/Monitoring_Dashboard',
  assetPrefix: '/3333_4444__Operational/Monitoring_Dashboard',
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://20.170.155.53:8080'
  }
}

export default nextConfig
