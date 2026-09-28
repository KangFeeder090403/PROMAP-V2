/**
 * Auth redirect helpers — single source of truth for public routes.
 * Middleware and auth pages import from here.
 */

/** Exact-match public pages (use `===`) */
export const PUBLIC_PAGES = ['/login', '/demo', '/landing'] as const

/** Prefix-match public API routes (use `startsWith`, trailing slash required) */
export const PUBLIC_PREFIX = ['/api/auth/', '/api/guest/', '/api/cron/'] as const

/**
 * Sanitise a callbackUrl to prevent open-redirect attacks.
 * Rejects absolute URLs, protocol-relative `//`, anything not starting with a single `/`.
 */
export function safeCallbackUrl(raw: string | null, fallback = '/'): string {
  if (!raw) return fallback
  // Must start with exactly one `/` (not `//`)
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  // Reject anything that looks like a protocol or absolute URL snuck in
  if (/^\/\\/.test(raw)) return fallback
  try {
    // If URL constructor resolves to a different origin, reject
    const parsed = new URL(raw, 'http://localhost')
    if (parsed.hostname !== 'localhost') return fallback
  } catch {
    return fallback
  }
  return raw
}
