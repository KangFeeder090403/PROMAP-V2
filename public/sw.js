// ProMaP Service Worker — Web Push saja.
// Sengaja TANPA fetch handler/cache: mencegah HTML/RSC berisi data sesi
// tersimpan di cache dan bocor antar user di perangkat bersama.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Web Push: tampilkan notifikasi di perangkat
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'ProMaP', body: event.data.text(), url: '/dashboard' }
  }

  const title = data.title ?? 'ProMaP'
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data: { url: data.url ?? '/dashboard' },
    // Tag unik: notifikasi baru tidak menimpa yang belum dibaca
    tag: `promap-notif-${Date.now()}`,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

function safeUrl(raw) {
  try {
    const u = new URL(raw ?? '/dashboard', self.location.origin)
    return u.origin === self.location.origin ? u.href : '/dashboard'
  } catch {
    return '/dashboard'
  }
}

// Klik notifikasi: fokus ke tab yang sudah terbuka atau buka tab baru (same-origin saja)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safeUrl(event.notification.data?.url)

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find(
          (c) => new URL(c.url).origin === self.location.origin
        )
        if (existing) {
          return existing
            .focus()
            .then((c) => c.navigate(url))
            .catch(() => clients.openWindow(url))
        }
        return clients.openWindow(url)
      })
  )
})
