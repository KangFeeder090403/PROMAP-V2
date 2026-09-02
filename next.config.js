/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Prisma 7 driver adapter (pg) pakai native Node API — jangan di-bundle Webpack.
    serverComponentsExternalPackages: ['@prisma/adapter-pg', 'pg'],
  },
}

module.exports = nextConfig
