/**
 * Jarvis Proof of Work - Service Worker
 * 
 * Provides:
 * - Offline support for static assets
 * - Background sync for activity updates
 * - Push notification support
 * - Cache-first strategy for performance
 */

const CACHE_NAME = 'jarvis-pow-v1';
const STATIC_ASSETS = [
  '/pow/',
  '/pow/index.html',
  '/pow/app.js',
  '/pow/dashboard.css',
  '/pow/favicon.svg',
  '/pow/favicon-32.png',
  '/pow/manifest.json'
];

// API endpoints to cache with network-first strategy
const API_ENDPOINTS = [
  '/pow/api/activities',
  '/pow/api/stats'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('jarvis-pow-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) return;
  
  // Skip WebSocket connections
  if (url.pathname === '/ws') return;
  
  // API endpoints: network-first, cache fallback
  if (url.pathname.startsWith('/pow/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  
  // Static assets: cache-first, network fallback
  event.respondWith(cacheFirst(event.request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, no cache:', request.url);
    // Return offline fallback for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/pow/index.html');
    }
    throw error;
  }
}

// Network-first strategy (for API)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Return empty JSON for API fallback
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' },
      status: 503,
      statusText: 'Service Unavailable (Offline)'
    });
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || 'New activity logged',
      icon: '/pow/icon-192.png',
      badge: '/pow/favicon-32.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/pow/',
        activityId: data.activityId
      },
      actions: [
        { action: 'view', title: 'View Activity' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      tag: 'jarvis-pow-notification',
      renotify: true
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Jarvis Activity', options)
    );
  } catch (e) {
    console.error('[SW] Push notification error:', e);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const url = event.notification.data?.url || '/pow/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes('/pow') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline activity logging
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-activities') {
    event.waitUntil(syncActivities());
  }
});

async function syncActivities() {
  console.log('[SW] Syncing activities...');
  try {
    const response = await fetch('/pow/api/activities');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/pow/api/activities', response);
      console.log('[SW] Activities synced');
    }
  } catch (error) {
    console.log('[SW] Sync failed:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-activities') {
    event.waitUntil(syncActivities());
  }
});

console.log('[SW] Service worker loaded');
