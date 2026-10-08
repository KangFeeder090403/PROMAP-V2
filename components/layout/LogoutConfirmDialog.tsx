'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { LogOut } from 'lucide-react'

export interface LogoutConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void> | void
}

export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    try {
      setLoading(true)
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start gap-3 pr-8 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <LogOut className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold text-foreground">
              Konfirmasi Keluar
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Yakin ingin keluar? Perubahan yang belum disimpan akan hilang.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Tanpa override arah: `flex-col-reverse` bawaan DialogFooter membalik
            DOM order [Batal, Keluar] jadi visual Keluar-atas, Batal-bawah, agar
            tombol paling mudah tersentuh di layar sempit bukan yang destruktif.
            DOM order tetap Batal dulu supaya autoFocus dan tab order aman. */}
        <DialogFooter className="mt-4 sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            autoFocus
            className="inline-flex items-center justify-center h-9 px-4 rounded-md border border-border bg-card hover:bg-muted text-foreground text-sm font-medium transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-destructive hover:bg-destructive/90 active:bg-destructive text-destructive-foreground text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {loading ? 'Memproses...' : 'Keluar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
