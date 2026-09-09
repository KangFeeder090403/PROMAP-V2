// Generator favicon.ico satu kali — square solid blue-500 (#3B82F6), 32x32.
// PNG di-embed dalam kontainer ICO (didukung semua browser modern).
// Jalankan sekali: node scripts/gen-favicon.mjs  →  app/favicon.ico
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const SIZE = 32
const [R, G, B] = [0x3b, 0x82, 0xf6]

// --- CRC32 (tabel) untuk chunk PNG ---
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crc])
}

// --- PNG 32x32 RGBA solid ---
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4))
let o = 0
for (let y = 0; y < SIZE; y++) {
  raw[o++] = 0 // filter none
  for (let x = 0; x < SIZE; x++) {
    raw[o++] = R
    raw[o++] = G
    raw[o++] = B
    raw[o++] = 0xff
  }
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
])

// --- Kontainer ICO (1 gambar PNG) ---
const dir = Buffer.alloc(6)
dir.writeUInt16LE(0, 0) // reserved
dir.writeUInt16LE(1, 2) // type = icon
dir.writeUInt16LE(1, 4) // count
const entry = Buffer.alloc(16)
entry[0] = SIZE // width
entry[1] = SIZE // height
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bpp
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12) // offset = 6 + 16
writeFileSync('app/favicon.ico', Buffer.concat([dir, entry, png]))
console.log(`app/favicon.ico ditulis (${dir.length + entry.length + png.length} byte).`)
