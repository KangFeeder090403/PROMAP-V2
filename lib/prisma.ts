import { PrismaClient } from '@prisma/client'

// Singleton — Next.js dev hot-reload bikin modul di-evaluasi ulang.
// Tanpa ini tiap reload buka koneksi baru sampai Neon menolak.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
