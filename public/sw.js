const CACHE_NAME = 'pos-kasir-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/assets/logo/logo.svg',
    '/assets/logo/logo-black.svg'
];

// Install event - caching base assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

// Activate event - cleaning old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serving assets from cache or network
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Exclude API calls, webhooks, hot-reloading (Vite ws), and backend admin routes from service worker caching
    if (
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/sanctum') ||
        url.pathname.startsWith('/_debugbar') ||
        url.pathname.startsWith('/@vite') ||
        url.pathname.includes('hot') ||
        event.request.url.includes('ws')
    ) {
        return;
    }

    // Static assets (CSS, JS, Fonts, Images) - Cache First with Network Fallback
    if (
        event.request.destination === 'style' ||
        event.request.destination === 'script' ||
        event.request.destination === 'image' ||
        event.request.destination === 'font' ||
        url.pathname.startsWith('/build/') // Vite built assets
    ) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request).then((networkResponse) => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                }).catch(() => {
                    // Fail silently for resources
                    return new Response('', { status: 408, statusText: 'Network Error' });
                });
            })
        );
        return;
    }

    // HTML / Page requests - Network First with Cache Fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If it's a valid HTML/Inertia page response, store in cache
                if (response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Network failed, try to serve from cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If not in cache, fallback to base index or root offline response
                    return caches.match('/');
                });
            })
    );
});
