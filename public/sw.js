// ProMaP Service Worker — handles Web Push + basic offline cache
const CACHE = 'promap-v1'
const OFFLINE_URLS = ['/dashboard']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(OFFLINE_URLS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

// Network-first: API langsung ke network, halaman lain coba cache sebagai fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request))
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
    tag: 'promap-notif',
    renotify: true,
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Klik notifikasi: fokus ke tab yang sudah terbuka atau buka tab baru
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find(
          (c) => new URL(c.url).origin === self.location.origin
        )
        if (existing) {
          existing.focus()
          return existing.navigate(url)
        }
        return clients.openWindow(url)
      })
  )
})
