const CACHE_NAME = 'shop-admin-v1.0.1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('[SW] Cache addAll failed:', err);
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - Network first for Google Apps Script, cache first for local assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Always use network for Google Apps Script (your actual app)
  if (url.hostname.includes('script.google.com') || 
      url.hostname.includes('googleusercontent.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Offline fallback
          return new Response(
            `<!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Offline - Shop Admin</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  text-align: center;
                  padding: 20px;
                }
                .offline-container {
                  max-width: 400px;
                }
                h1 { font-size: 48px; margin: 0 0 20px 0; }
                p { font-size: 18px; line-height: 1.6; }
                button {
                  margin-top: 30px;
                  padding: 14px 32px;
                  font-size: 16px;
                  font-weight: 600;
                  background: white;
                  color: #667eea;
                  border: none;
                  border-radius: 8px;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                button:active {
                  transform: scale(0.98);
                }
              </style>
            </head>
            <body>
              <div class="offline-container">
                <h1>📡</h1>
                <h2>You're Offline</h2>
                <p>Shop Admin needs an internet connection to work. Please check your connection and try again.</p>
                <button onclick="location.reload()">Retry</button>
              </div>
            </body>
            </html>`,
            { 
              headers: { 
                'Content-Type': 'text/html',
                'Cache-Control': 'no-cache'
              } 
            }
          );
        })
    );
    return;
  }

  // Cache first strategy for local assets (wrapper page, icons, manifest)
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
      .catch(() => {
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
