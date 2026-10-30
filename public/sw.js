// Service Worker for МГЭИ Schedule PWA (static GitHub Pages build)
// Caches the app shell for offline use; schedule data is network-first
// so updates land as soon as they are published.

const CACHE_NAME = 'mgei-schedule-static-v2'
const APP_SHELL = [
  './',
  './manifest.json',
  './logo.jpg',
]

const DATA_PREFIX = new URL('./data/', self.registration.scope).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for schedule data and navigations, cache-first fallback for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Schedule data: network first (fresh when online), cache fallback offline
  if (url.pathname.startsWith(DATA_PREFIX)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Everything else: try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
