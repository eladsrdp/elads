// Service Worker — stale-while-revalidate ל-app shell; /api תמיד רשת בלבד.
const CACHE = 'priority-lite-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // ניווט (index.html) — רשת קודם, מטמון רק כשאין רשת. אחרת אחרי כל פריסה המשתמש רואה את
  // הגרסה הישנה בטעינה הראשונה (stale-while-revalidate מגיש את הישן ומעדכן ברקע).
  // קבצי JS/CSS עם hash בשם — בטוחים ל-stale-while-revalidate למטה.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        fetch(event.request)
          .then((res) => {
            if (res.ok) cache.put(event.request, res.clone())
            return res
          })
          .catch(async () => (await cache.match(event.request)) ?? (await cache.match('/')) ?? Response.error()),
      ),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      const fetched = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || fetched
    }),
  )
})
