import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Migrate/CLI pakai koneksi langsung (non-pooled), sesuai rekomendasi Neon.
  // Runtime query tetap pakai DATABASE_URL (pooled) lewat adapter di lib/prisma.ts.
  datasource: {
    url: process.env.DIRECT_URL,
  },
})
