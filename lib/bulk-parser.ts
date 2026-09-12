export type ParsedActionPlan = {
  raw: string
  title: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  deadlineDate: Date
  deadlineDisplay: string
  isValid: boolean
  error?: string
}

export type BulkParserDefaults = {
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  days: number
}

function parsePriority(
  token: string | undefined,
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH'
): { priority: 'LOW' | 'MEDIUM' | 'HIGH'; matched: boolean } {
  if (!token) return { priority: defaultPriority, matched: false }
  const clean = token.trim().toLowerCase()
  if (!clean) return { priority: defaultPriority, matched: false }

  if (['high', 'hihg', 'tinggi', 'h'].includes(clean)) {
    return { priority: 'HIGH', matched: true }
  }
  if (['medium', 'med', 'sedang', 'm'].includes(clean)) {
    return { priority: 'MEDIUM', matched: true }
  }
  if (['low', 'rendah', 'l'].includes(clean)) {
    return { priority: 'LOW', matched: true }
  }

  return { priority: defaultPriority, matched: false }
}

function parseDeadline(
  token: string | undefined,
  defaultDays: number
): { date: Date; matched: boolean; error?: string } {
  const now = new Date()

  if (!token || !token.trim()) {
    const fallback = new Date(now)
    fallback.setDate(fallback.getDate() + defaultDays)
    fallback.setHours(23, 59, 59, 999)
    return { date: fallback, matched: false }
  }

  const clean = token.trim().toLowerCase()

  // Relative format: X hari, X hr, X d, +X
  const relativeMatch = clean.match(/^(\+)?\s*(\d+)\s*(hari|hr|h|d|days?)?$/i)
  if (relativeMatch) {
    const days = parseInt(relativeMatch[2], 10)
    if (!isNaN(days)) {
      const target = new Date(now)
      target.setDate(target.getDate() + days)
      target.setHours(23, 59, 59, 999)
      return { date: target, matched: true }
    }
  }

  // Absolute format: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10) - 1
    const day = parseInt(isoMatch[3], 10)
    const target = new Date(year, month, day, 23, 59, 59, 999)
    if (!isNaN(target.getTime()) && target.getFullYear() === year && target.getMonth() === month && target.getDate() === day) {
      return { date: target, matched: true }
    }
    return { date: new Date(), matched: false, error: 'Format tanggal tidak valid' }
  }

  // Absolute format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10)
    const month = parseInt(dmyMatch[2], 10) - 1
    const year = parseInt(dmyMatch[3], 10)
    const target = new Date(year, month, day, 23, 59, 59, 999)
    if (!isNaN(target.getTime()) && target.getFullYear() === year && target.getMonth() === month && target.getDate() === day) {
      return { date: target, matched: true }
    }
    return { date: new Date(), matched: false, error: 'Format tanggal tidak valid' }
  }

  // Fallback if token present but unparseable
  const fallback = new Date(now)
  fallback.setDate(fallback.getDate() + defaultDays)
  fallback.setHours(23, 59, 59, 999)
  return { date: fallback, matched: false, error: `Format durasi "${token}" tidak dikenali` }
}

function formatDateDisplay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}/${m}/${y}`
}

export function parseBulkActionPlans(
  text: string,
  defaults: BulkParserDefaults = { priority: 'MEDIUM', days: 7 }
): ParsedActionPlan[] {
  if (!text) return []

  const lines = text.split('\n')
  const results: ParsedActionPlan[] = []

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    // Split on first occurrence of delimiter (, or ; or |)
    // Supports: [Judul], [Prioritas opsional], [Deadline/Durasi opsional]
    const parts = trimmed.split(/[,;|]/).map((p) => p.trim())
    const title = parts[0]

    if (!title) {
      results.push({
        raw: trimmed,
        title: '',
        priority: defaults.priority,
        deadlineDate: new Date(),
        deadlineDisplay: '',
        isValid: false,
        error: 'Judul tidak boleh kosong',
      })
      continue
    }

    const token2 = parts[1]
    const token3 = parts[2]

    // Determine if token2 is priority or deadline
    let priorityVal = defaults.priority
    let deadlineToken: string | undefined = undefined

    if (token2) {
      const p2 = parsePriority(token2, defaults.priority)
      if (p2.matched) {
        priorityVal = p2.priority
        deadlineToken = token3
      } else {
        // Maybe token2 was a deadline (e.g. "Title, 7 hari")
        const d2 = parseDeadline(token2, defaults.days)
        if (d2.matched) {
          deadlineToken = token2
          // Check if token3 is priority (e.g. "Title, 7 hari, High")
          if (token3) {
            const p3 = parsePriority(token3, defaults.priority)
            if (p3.matched) priorityVal = p3.priority
          }
        } else {
          // Token2 didn't match priority or recognizable deadline; check token3
          if (token3) {
            const p3 = parsePriority(token3, defaults.priority)
            if (p3.matched) priorityVal = p3.priority
          }
          deadlineToken = token2
        }
      }
    }

    const { date, error: deadlineErr } = parseDeadline(deadlineToken, defaults.days)

    results.push({
      raw: trimmed,
      title,
      priority: priorityVal,
      deadlineDate: date,
      deadlineDisplay: formatDateDisplay(date),
      isValid: !deadlineErr,
      error: deadlineErr,
    })
  }

  return results
}
