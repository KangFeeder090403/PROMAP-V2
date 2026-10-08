// Cek kontras WCAG token app/globals.css (:root & .dark). Jalankan: node scripts/check-contrast.mjs
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

function block(selector) {
  const m = css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`))
  if (!m) throw new Error(`blok ${selector} tidak ditemukan`)
  const out = {}
  for (const [, name, h, s, l] of m[1].matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g)) out[name] = [+h, +s / 100, +l / 100]
  return out
}

function hslToRgb([h, s, l]) {
  const a = s * Math.min(l, 1 - l)
  const f = (n) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)) }
  return [f(0), f(8), f(4)]
}
const lum = (rgb) => rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0)
const ratio = (a, b) => { const [x, y] = [lum(hslToRgb(a)), lum(hslToRgb(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

// Sanity: hitam vs putih = 21
console.assert(Math.abs(ratio([0, 0, 0], [0, 0, 1]) - 21) < 0.01, 'rumus kontras salah')

const SURFACES = ['background', 'card', 'popover', 'muted']
const RULES = [
  ...['foreground', 'fg-secondary', 'muted-foreground', 'brand-text', 'destructive-text'].flatMap((fg) => SURFACES.map((bg) => [fg, bg, 4.5])),
  ...['input', 'brand', 'ring', 'chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'].flatMap((fg) => SURFACES.map((bg) => [fg, bg, 3])),
  // primary bukan warna teks di dark (#2B4C8C di surface gelap < 3:1) — hanya fill tombol.
  ['primary-foreground', 'primary', 4.5],
  ['destructive-foreground', 'destructive', 4.5],
  ['sidebar-foreground', 'sidebar', 4.5],
  ['sidebar-accent', 'sidebar', 3],
]

let failed = 0
for (const [mode, sel] of [['light', ':root'], ['dark', '.dark']]) {
  const t = block(sel)
  console.log(`\n${mode}`)
  for (const [fg, bg, min] of RULES) {
    if (!t[fg] || !t[bg]) { console.log(`  MISSING ${fg} / ${bg}`); failed++; continue }
    const r = ratio(t[fg], t[bg])
    const ok = r >= min
    if (!ok) failed++
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${fg.padEnd(22)} on ${bg.padEnd(11)} ${r.toFixed(2)} (min ${min})`)
  }
}
console.log(failed ? `\n${failed} pasangan gagal` : '\nsemua lolos')
process.exit(failed ? 1 : 0)
