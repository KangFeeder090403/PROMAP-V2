import { PrismaClient } from './generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Singleton — Next.js dev hot-reload bikin modul di-evaluasi ulang.
// Tanpa ini tiap reload buka koneksi baru sampai Neon menolak.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Neon Serverless + PgBouncer Connection Pooling:
// Di produksi (Vercel Serverless), batasi max pool per lambda ke 1 untuk mencegah
// pool exhaustion saat concurrent lambdas melonjak, sementara PgBouncer di Neon
// menangani pooling koneksi tingkat gateway database.
// Wajibkan TLS/SSL guna menangkal downgrade attack & sniffing kredensial teks polos.
const dbUrl = process.env.DATABASE_URL
const isSslRequired =
  process.env.NODE_ENV === 'production' ||
  Boolean(dbUrl && (dbUrl.includes('sslmode=require') || dbUrl.includes('ssl=true')))

const adapter = new PrismaPg({
  connectionString: dbUrl,
  max: process.env.NODE_ENV === 'production' ? 1 : 10,
  ssl: isSslRequired ? { rejectUnauthorized: false } : undefined,
})

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

globalForPrisma.prisma = prisma
