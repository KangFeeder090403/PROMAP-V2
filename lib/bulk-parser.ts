export type ActionPlanBulkStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE'

export type ParsedActionPlan = {
  raw: string
  title: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  deadlineDate: Date
  deadlineDisplay: string
  status: ActionPlanBulkStatus
  isValid: boolean
  error?: string // blocking     -> isValid: false
  ignoredTokens?: string[] // non-blocking -> isValid tetap true
}

export type BulkParserDefaults = {
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  days: number
  status?: ActionPlanBulkStatus
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

function parseStatus(
  token: string | undefined,
  defaultStatus: ActionPlanBulkStatus
): { status: ActionPlanBulkStatus; matched: boolean } {
  if (!token) return { status: defaultStatus, matched: false }
  const clean = token.trim().toLowerCase().replace(/[-_]/g, ' ')
  if (!clean) return { status: defaultStatus, matched: false }

  if (
    [
      'started',
      'start',
      'not started',
      'belum mulai',
      'belum',
      'pending',
      'dimulai',
      'belum dimulai',
      'todo',
      'to do',
    ].includes(clean)
  ) {
    return { status: 'NOT_STARTED', matched: true }
  }
  if (
    [
      'on progress',
      'in progress',
      'on progres',
      'in progres',
      'progress',
      'progres',
      'dikerjakan',
      'sedang dikerjakan',
      'jalan',
      'berjalan',
      'wip',
    ].includes(clean)
  ) {
    return { status: 'IN_PROGRESS', matched: true }
  }
  if (['complete', 'completed', 'selesai', 'done', 'tuntas'].includes(clean)) {
    return { status: 'COMPLETE', matched: true }
  }

  return { status: defaultStatus, matched: false }
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
    if (
      !isNaN(target.getTime()) &&
      target.getFullYear() === year &&
      target.getMonth() === month &&
      target.getDate() === day
    ) {
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
    if (
      !isNaN(target.getTime()) &&
      target.getFullYear() === year &&
      target.getMonth() === month &&
      target.getDate() === day
    ) {
      return { date: target, matched: true }
    }
    return { date: new Date(), matched: false, error: 'Format tanggal tidak valid' }
  }

  // Fallback if token present but unparseable
  const fallback = new Date(now)
  fallback.setDate(fallback.getDate() + defaultDays)
  fallback.setHours(23, 59, 59, 999)
  // ponytail: heuristik "ada digit = user niat tanggal/durasi, jangan diam-diam diganti default".
  // Naikkan ke parser tanggal beneran (chrono) hanya kalau user minta format bebas
  // seperti "besok" / "akhir bulan".
  const looksLikeDate = /\d/.test(clean)
  return {
    date: fallback,
    matched: false,
    error: looksLikeDate ? `Format durasi "${token}" tidak dikenali` : undefined,
  }
}

function formatDateDisplay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${day}/${m}/${y}`
}

export function parseBulkActionPlans(
  text: string,
  defaults: BulkParserDefaults = { priority: 'MEDIUM', days: 7, status: 'NOT_STARTED' }
): ParsedActionPlan[] {
  if (!text) return []

  const fallbackStatus = defaults.status ?? 'NOT_STARTED'
  const lines = text.split('\n')
  const results: ParsedActionPlan[] = []

  for (const rawLine of lines) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue

    // Split on first occurrence of delimiter (, or ; or |)
    // Supports: [Judul], [Prioritas opsional], [Deadline/Durasi opsional], [Status opsional]
    const parts = trimmed.split(/[,;|]/).map((p) => p.trim())
    const title = parts[0]

    if (!title) {
      results.push({
        raw: trimmed,
        title: '',
        priority: defaults.priority,
        deadlineDate: new Date(),
        deadlineDisplay: '',
        status: fallbackStatus,
        isValid: false,
        error: 'Judul tidak boleh kosong',
      })
      continue
    }

    const otherTokens = parts.slice(1)
    let priorityVal = defaults.priority
    let statusVal = fallbackStatus
    let deadlineToken: string | undefined = undefined
    // Token yang tidak terpakai / kalah rebutan slot — dilaporkan, tidak memblokir submit.
    const ignored: string[] = []
    let statusTok: string | undefined
    let priorityTok: string | undefined

    // For each token after title, match status, priority, or deadline
    for (const tok of otherTokens) {
      if (!tok) continue

      // Check status match (last-wins, token yang kalah tetap dilaporkan)
      const sCheck = parseStatus(tok, fallbackStatus)
      if (sCheck.matched) {
        if (statusTok) ignored.push(statusTok)
        statusTok = tok
        statusVal = sCheck.status
        continue
      }

      // Check priority match (last-wins, token yang kalah tetap dilaporkan)
      const pCheck = parsePriority(tok, defaults.priority)
      if (pCheck.matched) {
        if (priorityTok) ignored.push(priorityTok)
        priorityTok = tok
        priorityVal = pCheck.priority
        continue
      }

      // Check deadline match or store as deadline token
      if (!deadlineToken) {
        deadlineToken = tok
        continue
      }
      ignored.push(tok)
    }

    const { date, matched, error: deadlineErr } = parseDeadline(deadlineToken, defaults.days)
    if (deadlineToken && !matched && !deadlineErr) ignored.unshift(deadlineToken)

    results.push({
      raw: trimmed,
      title,
      priority: priorityVal,
      deadlineDate: date,
      deadlineDisplay: formatDateDisplay(date),
      status: statusVal,
      isValid: !deadlineErr,
      error: deadlineErr,
      ignoredTokens: ignored.length ? ignored : undefined,
    })
  }

  return results
}
