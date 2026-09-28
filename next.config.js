/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Whitelist host ketat guna mencegah SSRF dan Image Optimizer DoS (GHSA-9g9p-9gw9-jx7f)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Foto profil Google SSO
      },
    ],
  },
  serverExternalPackages: ['@prisma/adapter-pg', 'pg'],
}

module.exports = nextConfig
