// Sekali jalan: node scripts/gen-pwa-icons.mjs → public/icons/*.png (commit hasilnya)
// ponytail: sharp cuma transitif (via next), bukan dependensi langsung; npm i -D sharp bila import gagal.
import sharp from 'sharp'

const svg = (rx, fontSize, y) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="${rx}" fill="#0B1730"/>
  <text x="96" y="${y}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" fill="#D4AF37">P</text></svg>`)

const out = [
  ['icon-192.png', 192, svg(32, 96, 130)],
  ['icon-512.png', 512, svg(32, 96, 130)],
  ['icon-maskable-512.png', 512, svg(0, 72, 121)], // full-bleed, konten di safe zone 80%
  ['apple-touch-icon.png', 180, svg(0, 88, 126)], // iOS membulatkan sendiri, wajib opak
]

for (const [name, size, src] of out) {
  await sharp(src).resize(size, size).png().toFile(`public/icons/${name}`)
}
console.log('ok')