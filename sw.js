// Service worker del visor: guarda la página y las librerías en el teléfono para que abra al instante.
// La página se muestra desde la copia guardada y se actualiza por detrás (los cambios se ven la vez siguiente).
const VERSION = 'visor-v1';
const LIBS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.css',
  'https://unpkg.com/@geoman-io/leaflet-geoman-free@2.17.0/dist/leaflet-geoman.min.js',
  'https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js',
  'https://cdnjs.cloudflare.com/ajax/libs/proj4js/2.11.0/proj4.js',
  'https://unpkg.com/@tmcw/togeojson@5.8.1/dist/togeojson.umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://unpkg.com/shpjs@4.0.4/dist/shp.min.js'
];
const CDN = /^(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(['./'].concat(LIBS).map(u => c.add(u).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    // Página: copia guardada al instante, actualización por detrás
    e.respondWith(caches.open(VERSION).then(async c => {
      const guardada = await c.match(req, {ignoreSearch: true});
      const red = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
      if (guardada) { try { e.waitUntil(red); } catch (err) {} return guardada; }
      return (await red) || (await c.match('./')) || Response.error();
    }));
  } else if (CDN.test(u.host)) {
    // Librerías con versión fija: se usan desde el teléfono
    e.respondWith(caches.open(VERSION).then(async c => {
      const guardada = await c.match(req, {ignoreSearch: true});
      if (guardada) return guardada;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
  }
  // Todo lo demás (imágenes satelitales, catálogo, mapa base) va directo a internet.
});
