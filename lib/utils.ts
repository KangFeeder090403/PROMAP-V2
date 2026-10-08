import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** True hanya untuk URL absolut http(s) — tolak javascript:, data:, dll. */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const { protocol } = new URL(value.trim())
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
