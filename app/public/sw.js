// Makes the app installable on Android Chrome (DECISIONS.md #13). It caches nothing: every request goes to the network,
// so a new deploy is always what loads. Only when a page load fails (no internet) it answers with a short offline page
// instead of the browser's error screen.
const OFFLINE_HTML = `<!doctype html><html lang="hy"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Վարորդական քննություն</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0;padding:32px 16px;background:#f6f7f9;color:#1b1f24}@media (prefers-color-scheme:dark){body{background:#111418;color:#e6e9ed}}</style></head><body><h1>Ինտերնետ չկա</h1><p>Հավելվածը բացելու համար ինտերնետ է պետք։ Քո առաջընթացը պահված է այս սարքում։</p><p><button onclick="location.reload()">Կրկին փորձել</button></p></body></html>`

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })),
  )
})
