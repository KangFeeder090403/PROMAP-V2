'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export function UserApproveDialog({
  open,
  onOpenChange,
  userName,
  action,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string | undefined
  action: 'approve' | 'reject' | null
  onConfirm: () => void
  loading?: boolean
}) {
  const isApprove = action === 'approve'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {isApprove ? 'Setujui User' : 'Tolak User'}
          </DialogTitle>
          <DialogDescription>
            {isApprove
              ? `Setujui akun "${userName}"? Akun akan aktif dan bisa login.`
              : `Tolak akun "${userName}"? Akun akan dinonaktifkan.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-md text-white text-sm font-medium transition-colors disabled:opacity-50 ${
              isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {loading ? 'Memproses...' : isApprove ? 'Setujui' : 'Tolak'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
