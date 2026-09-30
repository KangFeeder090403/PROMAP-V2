// Server Component — tanpa 'use client'. Latar statis murni, nol JS di bundel.
// ponytail: orb sengaja dibuat diam. Kalau nanti butuh gerak lagi, pakai CSS
// `@keyframes` + varian `motion-safe:`, bukan GSAP — tidak ada alasan menarik
// runtime animasi hanya untuk menggeser empat blur.
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Grid bergaris halus */}
      <div
        className="absolute inset-0 opacity-[0.045] dark:opacity-[0.09]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1E40AF 1px, transparent 1px), linear-gradient(to bottom, #1E40AF 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial soft vignette overlay agar bagian tengah lebih terang.
          ponytail: interpolasi sRGB — Tailwind 3 tidak punya `bg-radial`
          (yang memakai oklab). Naikkan kembali saat proyek pindah ke v4.
          Warna ditulis eksplisit, bukan `transparent`, supaya tidak bergantung
          pada interpolasi premultiplied browser. */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0),rgba(255,255,255,0.5),#ffffff)] dark:bg-[radial-gradient(rgba(2,6,23,0),rgba(2,6,23,0.6),#020617)]" />

      {/* Orb 1 - Electric Blue (kiri atas) */}
      <div className="absolute -left-20 -top-20 h-[560px] w-[560px] rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 opacity-30 blur-[90px] dark:from-blue-500 dark:to-indigo-600 dark:opacity-40" />

      {/* Orb 2 - Vibrant Cyan/Sky (kanan tengah) */}
      <div className="absolute -right-20 top-[30vh] h-[520px] w-[520px] rounded-full bg-gradient-to-bl from-sky-400 to-blue-600 opacity-25 blur-[100px] dark:from-sky-500 dark:to-blue-700 dark:opacity-35" />

      {/* Orb 3 - Deep Royal Blue (kiri bawah) */}
      <div className="absolute -left-10 top-[65vh] h-[600px] w-[600px] rounded-full bg-gradient-to-r from-blue-700 to-indigo-800 opacity-25 blur-[110px] dark:from-blue-800 dark:to-indigo-900 dark:opacity-35" />

      {/* Orb 4 - Pusat atas Hero Spotlight */}
      <div className="absolute left-1/2 top-[-100px] h-[450px] w-[650px] -translate-x-1/2 rounded-full bg-blue-500/25 blur-[100px] dark:bg-blue-600/35" />
    </div>
  )
}
