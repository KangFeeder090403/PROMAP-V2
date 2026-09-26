'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { AtSign } from 'lucide-react'
import { findMentionTrigger } from '@/lib/mention-parse'

interface UserOption {
  id: string
  name: string
  role?: string
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_OPERATIONAL: 'Admin Operasional',
  MANAGER: 'Manager',
  PIC: 'PIC',
}

const MAX_SUGGESTIONS = 5

/**
 * Textarea dengan autocomplete "@" — menyisipkan literal `@<userId>` sesuai
 * format yang dibaca lib/mention-parse extractMentionIds. Bukan rich-text editor.
 *
 * Kandidat diambil dari /api/action-plans/[id]/mentionable-users, BUKAN
 * /api/users: endpoint users memuat user PENDING/INACTIVE/GUEST dan lintas
 * divisi, sehingga menawarkan orang yang mention-nya pasti ditolak server.
 *
 * Dropdown sengaja div absolut, bukan shadcn/Radix Popover: Radix merebut fokus
 * dari textarea sehingga ketik-sambil-pilih rusak. Konsekuensinya keyboard a11y
 * ditangani manual di sini (ArrowUp/Down/Enter/Escape + role listbox/option).
 */
export function MentionTextarea({
  value,
  onChange,
  actionPlanId,
  placeholder,
  rows = 3,
  maxLength,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  actionPlanId: string
  placeholder?: string
  rows?: number
  maxLength?: number
  disabled?: boolean
}) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listboxId = useId()

  useEffect(() => {
    let alive = true
    fetch(`/api/action-plans/${actionPlanId}/mentionable-users`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (alive) setUsers(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (alive) setUsers([])
      })
    return () => {
      alive = false
    }
  }, [actionPlanId])

  const suggestions =
    query === null
      ? []
      : users.filter((u) => u.name.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS)

  const open = query !== null && suggestions.length > 0

  function closeMention() {
    setQuery(null)
    setMentionStart(null)
    setActiveIndex(0)
  }

  function syncTrigger(text: string, caret: number) {
    const trigger = findMentionTrigger(text.slice(0, caret))
    if (trigger) {
      setQuery(trigger.query)
      setMentionStart(trigger.start)
      setActiveIndex(0)
    } else {
      closeMention()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value)
    syncTrigger(e.target.value, e.target.selectionStart)
  }

  function insertMention(u: UserOption) {
    if (mentionStart === null || !textareaRef.current) return
    const caret = textareaRef.current.selectionStart
    const before = value.slice(0, mentionStart)
    const after = value.slice(caret)
    onChange(`${before}@${u.id} ${after}`)

    // +2, bukan +1: yang disisipkan adalah '@' (1 char) + id + ' ' (1 char).
    // Dengan +1 caret mendarat sebelum spasi dan ketikan berikutnya menempel ke id.
    const nextCaret = mentionStart + u.id.length + 2
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(nextCaret, nextCaret)
    })
    closeMention()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      insertMention(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeMention()
    }
  }

  const activeOptionId = open ? `${listboxId}-opt-${activeIndex}` : undefined

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={(e) => syncTrigger(value, e.currentTarget.selectionStart)}
        onBlur={closeMention}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        className="w-full min-w-0 resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-blue-400"
      />
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Saran orang untuk di-mention"
          className="absolute z-20 mt-1 w-full max-w-xs overflow-hidden rounded-md border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40"
        >
          {suggestions.map((u, i) => (
            <div
              key={u.id}
              id={`${listboxId}-opt-${i}`}
              role="option"
              tabIndex={-1}
              aria-selected={i === activeIndex}
              // onMouseDown + preventDefault: klik tidak boleh merebut fokus
              // dari textarea (blur akan menutup dropdown sebelum klik terproses).
              onMouseDown={(e) => {
                e.preventDefault()
                insertMention(u)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                i === activeIndex
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <AtSign className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
              <span className="min-w-0 flex-1 truncate">{u.name}</span>
              {u.role && (
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {ROLE_LABEL[u.role] ?? u.role}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
