/**
 * Auto-scroll tepi viewport untuk HTML5 drag & drop.
 *
 * Spec HTML DnD men-suppress wheel/keyboard dari `dragstart` sampai `dragend`.
 * Chromium di Windows/Linux mengikuti spec, jadi halaman tidak bisa digulir
 * selama user menyeret kartu. Fungsi ini menghitung kecepatan gulir per frame
 * berdasarkan jarak pointer ke tepi atas/bawah viewport.
 *
 * Fungsi murni tanpa akses DOM supaya bisa di-assert di luar browser.
 * Lihat scripts/check-edge-scroll.ts
 */
export function edgeScrollVelocity(
  clientY: number,
  viewportH: number,
  zone = 96,
  max = 18
): number {
  if (!Number.isFinite(clientY) || !Number.isFinite(viewportH) || viewportH <= 0) return 0
  if (zone <= 0) return 0

  // Zona atas dan bawah tidak boleh tumpang tindih — kalau viewport terlalu
  // pendek, kecilkan zona jadi setengah viewport supaya titik tengah tetap diam
  // dan hasilnya tidak pernah NaN / saling meniadakan.
  const z = Math.min(zone, viewportH / 2)

  if (clientY < z) return -Math.round(max * (1 - Math.max(clientY, 0) / z))
  if (clientY > viewportH - z) {
    return Math.round(max * (1 - Math.max(viewportH - clientY, 0) / z))
  }
  return 0
}
