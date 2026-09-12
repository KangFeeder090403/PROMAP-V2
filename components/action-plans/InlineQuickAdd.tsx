'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X, Loader2, Check } from 'lucide-react'

interface InlineQuickAddProps {
  onAdd: (title: string) => Promise<boolean | void>
  placeholder?: string
  className?: string
  buttonText?: string
}

export function InlineQuickAdd({
  onAdd,
  placeholder = 'Ketik judul Action Plan lalu tekan Enter...',
  className = '',
  buttonText = 'Tambah Cepat',
}: InlineQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    } else {
      setTitle('')
    }
  }, [isOpen])

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || submitting) return

    try {
      setSubmitting(true)
      const res = await onAdd(trimmed)
      // If onAdd returns false, keep it open, otherwise reset
      if (res !== false) {
        setTitle('')
        // keep focus for rapid adding
        setTimeout(() => inputRef.current?.focus(), 10)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 py-1.5 px-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors ${className}`}
      >
        <Plus className="h-3.5 w-3.5" />
        <span>{buttonText}</span>
      </button>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={submitting}
          placeholder={placeholder}
          className="w-full h-8 px-3 pr-8 rounded-md border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {title && (
          <button
            type="button"
            onClick={() => setTitle('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!title.trim() || submitting}
        className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        {submitting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>

      <button
        type="button"
        onClick={() => setIsOpen(false)}
        disabled={submitting}
        className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs transition-colors"
      >
        Tutup
      </button>
    </div>
  )
}
