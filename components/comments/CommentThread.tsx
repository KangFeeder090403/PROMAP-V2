'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Lock, MessageSquarePlus, Pencil, RefreshCw } from 'lucide-react'
import { MentionTextarea } from '@/components/comments/MentionTextarea'
import { tokenizeMentions, COMMENT_MAX_LENGTH } from '@/lib/mention-parse'
import { timeAgo } from '@/lib/date-utils'
import { editDeadline, isWithinEditWindow } from '@/lib/comment-edit'

interface Comment {
  id: string
  content: string
  createdAt: string
  editedAt: string | null
  author: { id: string; name: string }
}

type ThreadResponse = {
  comments: Comment[]
  mentionNames: Record<string, string>
}

const AVATAR_TONES = [
  'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
]

/** Inisial maksimal 2 huruf dari nama. Pola sama dengan sidebar (tidak diimpor lintas fitur). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Warna avatar deterministik per user id — id sama selalu warna sama. */
function avatarTone(id: string): string {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum = (sum + (id.codePointAt(i) ?? 0)) % 997
  return AVATAR_TONES[sum % AVATAR_TONES.length]
}

/**
 * Render `@userId` literal jadi highlight "@Nama".
 * Nama datang dari peta hasil satu query batch di server (GET .../comments),
 * bukan dari author komentar di thread — orang yang di-mention tapi belum
 * pernah berkomentar dulu tampil sebagai cuid mentah.
 */
function renderContent(content: string, nameById: Record<string, string>) {
  return tokenizeMentions(content).map((token, i) =>
    token.type === 'text' ? (
      <span key={i}>{token.value}</span>
    ) : (
      <span
        key={i}
        className="font-medium text-blue-600 dark:text-blue-400"
        title={nameById[token.id] ? undefined : 'Pengguna tidak ditemukan'}
      >
        @{nameById[token.id] ?? 'pengguna tidak dikenal'}
      </span>
    )
  )
}

function ThreadSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat komentar">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CommentThread({
  actionPlanId,
  currentUserId,
  canComment = true,
}: {
  actionPlanId: string
  currentUserId?: string
  canComment?: boolean
}) {
  const [thread, setThread] = useState<ThreadResponse | null>(null)
  const [loadError, setLoadError] = useState<'FORBIDDEN' | 'ERROR' | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  // now dioper eksplisit ke timeAgo — diambil sekali saat mount supaya render
  // tidak berubah di tengah jalan dan tidak memicu mismatch hidrasi.
  const [now] = useState(() => new Date())
  // nowTick TERPISAH dari now. `now` beku sejak mount dan fetchComments() tidak
  // memperbaruinya; drawer AP bisa terbuka berjam-jam, jadi tanpa tick tombol
  // Edit tetap terlihat untuk komentar yang jendelanya sudah habis.
  const [nowTick, setNowTick] = useState(() => new Date())

  const fetchComments = useCallback(async () => {
    try {
      setLoadError(null)
      const res = await fetch(`/api/action-plans/${actionPlanId}/comments`)
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        setLoadError('FORBIDDEN')
        return
      }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setThread({ comments: data.comments ?? [], mentionNames: data.mentionNames ?? {} })
    } catch {
      setLoadError('ERROR')
    }
  }, [actionPlanId])

  useEffect(() => {
    setThread(null)
    fetchComments()
  }, [fetchComments])

  async function handleSend() {
    const content = draft.trim()
    if (!content) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/action-plans/${actionPlanId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // Draft SENGAJA tidak dikosongkan saat gagal — tulisan user tidak boleh hilang.
        throw new Error(data.error || 'Gagal mengirim komentar')
      }
      setDraft('')
      await fetchComments()
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Gagal mengirim komentar')
    } finally {
      setSending(false)
    }
  }

  /** Komentar milik user yang MASIH dalam jendela edit, dievaluasi pada nowTick. */
  function canEdit(c: Comment): boolean {
    return !!currentUserId && c.author.id === currentUserId && isWithinEditWindow(c.createdAt, nowTick)
  }

  const hasEditable = (thread?.comments ?? []).some(canEdit)

  // Interval hidup HANYA selama masih ada komentar yang bisa diedit — bukan
  // ticking global tanpa syarat. Begitu komentar terakhir lewat 15 menit,
  // hasEditable jadi false dan interval berhenti sendiri.
  useEffect(() => {
    if (!hasEditable) return
    const t = setInterval(() => setNowTick(new Date()), 30_000)
    return () => clearInterval(t)
  }, [hasEditable])

  function startEdit(c: Comment) {
    setEditingId(c.id)
    setEditDraft(c.content)
    setEditError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
    setEditError(null)
  }

  async function handleSaveEdit(commentId: string) {
    const content = editDraft.trim()
    if (!content) return
    setSavingEdit(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/action-plans/${actionPlanId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // Draft TIDAK dibuang dan mode edit TIDAK ditutup paksa — konsisten
        // dengan handleSend. Pada 409 user masih bisa menyalin tulisannya ke
        // komentar baru lewat tombol sekunder di bawah.
        throw new Error(data.error || 'Gagal menyimpan perubahan')
      }
      setEditingId(null)
      setEditDraft('')
      await fetchComments()
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Gagal menyimpan perubahan')
    } finally {
      setSavingEdit(false)
    }
  }

  /** Pindahkan tulisan yang gagal disimpan ke kotak komentar baru. */
  function moveEditToNewComment() {
    setDraft(editDraft)
    cancelEdit()
  }

  const overLimit = draft.length > COMMENT_MAX_LENGTH
  const remaining = COMMENT_MAX_LENGTH - draft.length
  const editOverLimit = editDraft.length > COMMENT_MAX_LENGTH

  function renderList() {
    if (loadError === 'FORBIDDEN') {
      return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Anda tidak punya akses
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Diskusi Action Plan ini hanya untuk anggota yang terkait.
          </p>
        </div>
      )
    }

    if (loadError === 'ERROR') {
      return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
          <p className="text-sm text-slate-700 dark:text-slate-200">Gagal memuat komentar</p>
          <button
            type="button"
            onClick={fetchComments}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba lagi
          </button>
        </div>
      )
    }

    if (thread === null) return <ThreadSkeleton />

    if (thread.comments.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <MessageSquarePlus className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Belum ada diskusi di sini
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {canComment
              ? 'Tulis catatan pertama di kolom bawah. Ketik @ untuk memanggil rekan yang terkait.'
              : 'Diskusi akan muncul di sini begitu ada komentar masuk.'}
          </p>
        </div>
      )
    }

    return thread.comments.map((c) => (
      <div
        key={c.id}
        className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <div
          aria-hidden="true"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarTone(c.author.id)}`}
        >
          {initials(c.author.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {c.author.name}
            </span>
            <span
              className="text-xs text-slate-400 dark:text-slate-500"
              title={new Date(c.createdAt).toLocaleString('id-ID')}
            >
              {timeAgo(c.createdAt, now)}
            </span>
            {c.editedAt && (
              // Teks polos, bukan badge berwarna — warna dicadangkan untuk 8 status AP.
              <span
                className="text-xs text-slate-400 dark:text-slate-500"
                title={`Disunting ${new Date(c.editedAt).toLocaleString('id-ID')}`}
              >
                (diedit)
              </span>
            )}
            {editingId !== c.id && canEdit(c) && (
              <button
                type="button"
                onClick={() => startEdit(c)}
                aria-label="Edit komentar"
                title={`Bisa diedit sampai ${editDeadline(c.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                className="ml-auto inline-flex items-center gap-1 rounded text-xs font-medium text-slate-500 transition-colors hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>

          {editingId === c.id ? (
            <div className="space-y-2">
              <MentionTextarea
                value={editDraft}
                onChange={setEditDraft}
                actionPlanId={actionPlanId}
                maxLength={COMMENT_MAX_LENGTH}
                disabled={savingEdit}
                placeholder="Perbaiki komentar..."
              />
              {editError && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{editError}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {editError && (
                  <button
                    type="button"
                    onClick={moveEditToNewComment}
                    className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Salin ke komentar baru
                  </button>
                )}
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={savingEdit}
                  className="ml-auto inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(c.id)}
                  disabled={savingEdit || !editDraft.trim() || editOverLimit}
                  className="inline-flex h-8 items-center rounded-md bg-blue-500 px-3 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-300">
              {renderContent(c.content, thread.mentionNames)}
            </p>
          )}
        </div>
      </div>
    ))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">{renderList()}</div>

      {canComment && loadError !== 'FORBIDDEN' && (
        <div className="space-y-2">
          <MentionTextarea
            value={draft}
            onChange={setDraft}
            actionPlanId={actionPlanId}
            maxLength={COMMENT_MAX_LENGTH}
            disabled={sending}
            placeholder="Tulis komentar... ketik @ untuk mention rekan"
          />
          {sendError && (
            <p role="alert" className="flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{sendError}</span>
            </p>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {draft.length > COMMENT_MAX_LENGTH - 500 && (
              <span
                className={`mr-auto text-xs ${
                  overLimit
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Sisa {remaining} karakter
              </span>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !draft.trim() || overLimit}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {sending ? 'Mengirim...' : 'Kirim'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
