/* MarkEDdown offline app shell. User documents are NEVER written to the Cache API. */
const CACHE_NAME = "markeddown-shell-v4-20261101-inline-images";
const CORE = ["/", "/manifest.webmanifest", "/assets/logo/markeddown-studio-icon.svg", "/icons/markeddown-192.png", "/icons/markeddown-512.png"];
const sameOrigin = (url) => new URL(url, self.location.origin).origin === self.location.origin;
const assetUrlsFromHtml = (html) => {
  const found = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  return [...new Set(found.filter((path) => !path.includes("..")))];
};
// Vite splits CodeMirror, Markdown and ZIP into separate ES modules. An app
// shell with only index.js is NOT offline-capable: recursively cache imports.
const precacheDependencyGraph = async (cache, roots) => {
  const queued = [...roots];
  const visited = new Set();
  while (queued.length && visited.size < 120) {
    const url = new URL(queued.shift(), self.location.origin);
    if (url.origin !== self.location.origin || !url.pathname.startsWith("/assets/") || visited.has(url.pathname)) continue;
    visited.add(url.pathname);
    let response = await cache.match(url.pathname);
    if (!response) {
      response = await fetch(url.pathname, { cache: "reload" });
      if (!response.ok) throw new Error("Offline dependency unavailable: " + url.pathname);
      await cache.put(url.pathname, response.clone());
    }
    if (!url.pathname.endsWith(".js")) continue;
    const source = await response.clone().text();
    const specs = [...source.matchAll(/["']((?:\.\/|\/assets\/)[^"'?#]+\.(?:js|css|woff2|svg|png))["']/g)];
    for (const match of specs) {
      const dep = new URL(match[1], url.href);
      if (dep.origin === self.location.origin && dep.pathname.startsWith("/assets/") && !visited.has(dep.pathname)) queued.push(dep.pathname);
    }
  }
};
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const page = await fetch("/", { cache: "reload" });
    if (!page.ok) throw new Error("Unable to precache MarkEDdown shell");
    const html = await page.clone().text();
    await cache.put("/", page);
    const entries = [...CORE.slice(1), ...assetUrlsFromHtml(html)];
    const successes = await Promise.allSettled(entries.map(async (path) => cache.add(path)));
    // Important: the main entry module must be available offline.
    const scriptPaths = assetUrlsFromHtml(html).filter((path) => path.endsWith(".js"));
    if (scriptPaths.length && scriptPaths.some((path) => !successes[entries.indexOf(path)] || successes[entries.indexOf(path)].status !== "fulfilled")) {
      throw new Error("Main app scripts could not be cached");
    }
    await precacheDependencyGraph(cache, scriptPaths);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("markeddown-shell-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !sameOrigin(request.url)) return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CACHE_NAME)).put("/", response.clone());
        return response;
      } catch {
        return (await caches.open(CACHE_NAME)).match("/") || Response.error();
      }
    })());
    return;
  }
  // Fingerprinted JS/CSS, icons and fonts are safe to cache by URL.
  if (/^\/assets\//.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      // The install phase precaches with a path string. Browser module fetches
      // can supply different Vary headers (Accept/Origin), causing exact
      // Request matching to miss a successfully cached chunk.
      const cached = await cache.match(url.pathname, { ignoreVary: true, ignoreSearch: true });
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(url.pathname, response.clone());
      return response;
    })());
  }
});
self.addEventListener("message", (event) => {
  // Warm dynamically loaded chunks after a successful online page visit.
  if (event.data?.type !== "MARKEDDOWN_CACHE_RESOURCES" || !Array.isArray(event.data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const paths = event.data.urls.filter((url) => {
      try { const parsed = new URL(url, self.location.origin); return parsed.origin === self.location.origin && parsed.pathname.startsWith("/assets/"); }
      catch { return false; }
    }).slice(0, 80);
    await Promise.allSettled(paths.map((url) => cache.add(url)));
  })());
});
