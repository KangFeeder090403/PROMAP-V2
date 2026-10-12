export const WEEK_MS = 7 * 24 * 60 * 60 * 1000
export type InstallMode = 'android' | 'ios'

/** Logika murni jadwal popup — diuji di scripts/check-install-prompt.ts */
export function canShowInstallPrompt(o: {
  now: number
  lastShown: number | null
  installed: boolean
  mobile: boolean
  mode: InstallMode | null
}): boolean {
  if (o.installed || !o.mobile || !o.mode) return false
  if (o.lastShown === null || !Number.isFinite(o.lastShown)) return true
  if (o.lastShown > o.now) return true // jam perangkat mundur — jangan kunci selamanya
  return o.now - o.lastShown >= WEEK_MS
}