'use client'
export function refreshNotifs() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('promap:refresh-notifs'))
  }
}
