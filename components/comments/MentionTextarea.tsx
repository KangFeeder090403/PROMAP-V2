'use client'

import { useEffect, useRef, useState } from 'react'

interface UserOption {
  id: string
  name: string
}

// Textarea sederhana dengan autocomplete "@" — insert literal `@<userId>` sesuai
// format yang dibaca lib/mentions.ts extractMentionIds. Bukan rich-text editor.
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState<number | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    const caret = e.target.selectionStart
    onChange(text)

    const upToCaret = text.slice(0, caret)
    const match = upToCaret.match(/@([a-zA-Z ]*)$/)
    if (match) {
      setQuery(match[1].toLowerCase())
      setMentionStart(caret - match[0].length)
    } else {
      setQuery(null)
      setMentionStart(null)
    }
  }

  function insertMention(u: UserOption) {
    if (mentionStart === null || !textareaRef.current) return
    const caret = textareaRef.current.selectionStart
    const before = value.slice(0, mentionStart)
    const after = value.slice(caret)
    const next = `${before}@${u.id} ${after}`
    onChange(next)
    setQuery(null)
    setMentionStart(null)
  }

  const suggestions = query === null
    ? []
    : users.filter((u) => u.name.toLowerCase().includes(query)).slice(0, 5)

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {query !== null && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-w-xs rounded-md border border-slate-200 bg-white shadow-md overflow-hidden">
          {suggestions.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => insertMention(u)}
              className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
