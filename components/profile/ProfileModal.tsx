'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Lock,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  hasPassword: boolean
  companyName: string | null
  divisionName: string | null
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Admin Sistem',
  ADMIN_OPERATIONAL: 'Admin Operasional',
  MANAGER: 'Manager',
  PIC: 'PIC',
  GUEST: 'Guest',
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800/60',
  ADMIN_OPERATIONAL: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800/60',
  MANAGER: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800/60',
  PIC: 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  GUEST: 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
}

export function ProfileModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!open) {
      setError(null)
      setSuccess(null)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      return
    }

    let isMounted = true
    async function fetchProfile() {
      try {
        setLoading(true)
        setError(null)
        setSuccess(null)
        const res = await fetch('/api/me')
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Gagal memuat profil')
        }
        const data: ProfileData = await res.json()
        if (isMounted) {
          setProfile(data)
          setName(data.name || '')
          setPhone(data.phone || '')
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Gagal memuat profil')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchProfile()

    return () => {
      isMounted = false
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('Nama lengkap minimal 2 karakter')
      return
    }

    if (newPassword) {
      if (newPassword.length < 8) {
        setError('Kata sandi baru minimal 8 karakter')
        return
      }
      if (!currentPassword) {
        setError('Kata sandi saat ini wajib diisi')
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Konfirmasi kata sandi baru tidak cocok')
        return
      }
    }

    try {
      setSaving(true)
      const payload: {
        name: string
        phone?: string | null
        currentPassword?: string
        newPassword?: string
      } = {
        name: trimmedName,
        phone: phone.trim() || null,
      }

      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      const res = await fetch('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui profil')
      }

      router.refresh()

      setSuccess('Profil berhasil diperbarui')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => {
        onOpenChange(false)
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui profil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:rounded-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Profil Saya
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Kelola data diri dan kata sandi akun Anda.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="h-16 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-10 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-10 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Info Organisasi & Role */}
            {profile && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Hak Akses:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      ROLE_BADGE[profile.role] ||
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {ROLE_LABEL[profile.role] || profile.role}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 shrink-0 text-slate-500">
                    <Building2 className="h-3.5 w-3.5" />
                    Perusahaan:
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate text-right">
                    {profile.companyName ?? (profile.role === 'SUPER_ADMIN' ? 'Sistem Global' : '-')}
                  </span>
                </div>
                {profile.divisionName && (
                  <div className="flex items-center justify-between gap-2 text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 shrink-0 text-slate-500">
                      <Briefcase className="h-3.5 w-3.5" />
                      Divisi:
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate text-right">
                      {profile.divisionName}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Email (Readonly) */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-email" className="text-xs text-slate-700 dark:text-slate-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="profile-email"
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="pl-9 text-xs bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Email tidak dapat diubah secara mandiri.
              </p>
            </div>

            {/* Nama Lengkap */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-name" className="text-xs text-slate-700 dark:text-slate-300">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  required
                  disabled={saving}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Nomor Telepon */}
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone" className="text-xs text-slate-700 dark:text-slate-300">
                Nomor Telepon
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  disabled={saving}
                  className="pl-9 text-xs"
                />
              </div>
            </div>

            {/* Seksi Kata Sandi */}
            {profile?.hasPassword ? (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Ubah Kata Sandi
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-1">
                  Kosongkan jika Anda tidak ingin mengubah kata sandi akun.
                </p>

                <div className="space-y-2.5 pt-1">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="profile-current-password"
                      className="text-xs text-slate-700 dark:text-slate-300"
                    >
                      Kata Sandi Saat Ini
                    </Label>
                    <Input
                      id="profile-current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Masukkan kata sandi saat ini"
                      disabled={saving}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="profile-new-password"
                      className="text-xs text-slate-700 dark:text-slate-300"
                    >
                      Kata Sandi Baru (Min. 8 karakter)
                    </Label>
                    <Input
                      id="profile-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan kata sandi baru"
                      disabled={saving}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="profile-confirm-password"
                      className="text-xs text-slate-700 dark:text-slate-300"
                    >
                      Konfirmasi Kata Sandi Baru
                    </Label>
                    <Input
                      id="profile-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi baru"
                      disabled={saving}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : profile ? (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <span>
                    Akun Anda terhubung dengan Google SSO. Pengelolaan kata sandi ditangani oleh Google.
                  </span>
                </div>
              </div>
            ) : null}

            <DialogFooter className="pt-3 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="default"
                disabled={saving || loading}
                className="text-xs font-medium"
              >
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
