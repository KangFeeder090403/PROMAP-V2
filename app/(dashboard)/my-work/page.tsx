import Link from 'next/link'
import { CheckSquare } from 'lucide-react'

// Placeholder UI-4. Slot navigasi & shell dulu supaya link tidak mati;
// isi (list task milik user) menyusul di UI-4.
export default function MyWorkPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50">
          <CheckSquare className="h-5 w-5 text-blue-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-800">
          Belum ada pekerjaan yang ditugaskan
        </h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Semua Action Plan dan task yang jadi tanggung jawab Anda akan tampil di sini.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/board"
            className="inline-flex h-9 items-center rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600"
          >
            Lihat Board
          </Link>
          <Link
            href="/proposals"
            className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Ajukan Proposal
          </Link>
        </div>
      </div>
    </div>
  )
}
