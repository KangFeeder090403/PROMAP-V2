'use client'

import { useEffect, useState } from 'react'
import { MentionTextarea } from '@/components/comments/MentionTextarea'

// Regex sama persis dengan lib/mentions.ts extractMentionIds — diduplikasi (bukan
// diimpor) karena file ini 'use client' dan lib/mentions.ts menarik lib/prisma.ts
// (driver pg, node-only) yang gagal di-bundle untuk client. Hanya dipakai untuk
// display highlight, bukan mutasi data.
function extractMentionIds(content: string): string[] {
  const matches = content.match(/@([a-z0-9]{20,30})/g) ?? []
  const ids = matches.map((m) => m.slice(1))
  return [...new Set(ids)]
}

interface Comment {
  id: string
  content: string
  createdAt: string
  author: { id: string; name: string }
}

// Render @userId literal jadi highlight "@Nama" — pola resolve id sama seperti
// lib/mentions.ts extractMentionIds, hanya untuk display (bukan mutasi data).
function renderContent(content: string, nameById: Map<string, string>) {
  const ids = extractMentionIds(content)
  if (ids.length === 0) return content

  const parts: React.ReactNode[] = []
  let rest = content
  let key = 0
  const pattern = new RegExp(`@(${ids.join('|')})`, 'g')
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(rest))) {
    if (match.index > lastIndex) parts.push(rest.slice(lastIndex, match.index))
    const name = nameById.get(match[1])
    parts.push(
      <span key={key++} className="font-medium text-blue-600">
        @{name ?? match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }
  parts.push(rest.slice(lastIndex))
  return parts
}

export function CommentThread({ actionPlanId }: { actionPlanId: string }) {
  const [comments, setComments] = useState<Comment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [actionPlanId])

  async function fetchComments() {
    try {
      setError(null)
      const res = await fetch(`/api/action-plans/${actionPlanId}/comments`)
      if (!res.ok) throw new Error()
      setComments(await res.json())
    } catch {
      setError('Gagal memuat komentar')
    }
  }

  async function handleSend() {
    if (!draft.trim()) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/action-plans/${actionPlanId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Gagal mengirim komentar')
      }
      setDraft('')
      fetchComments()
    } catch (e: any) {
      setError(e.message || 'Gagal mengirim komentar')
    } finally {
      setSending(false)
    }
  }

  const nameById = new Map((comments ?? []).map((c) => [c.author.id, c.author.name]))

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments === null ? (
          <p className="text-sm text-slate-500">Memuat...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada komentar</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-medium text-slate-700">{c.author.name}</span>
                <span>{new Date(c.createdAt).toLocaleString('id-ID')}</span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">
                {renderContent(c.content, nameById)}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <MentionTextarea value={draft} onChange={setDraft} placeholder="Tulis komentar... gunakan @ untuk mention" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {sending ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </div>
    </div>
  )
}
