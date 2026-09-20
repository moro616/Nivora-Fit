/* ============================================================
   sw.js — el service worker de Nivora Fit
   Es lo que hace que la app abra en el subsuelo del gimnasio sin una
   raya de señal, y lo que Android exige para ofrecer instalarla.

   Estrategia: primero la red, pero con paciencia corta. Si la red
   contesta en menos de 3,5 segundos, usamos lo nuevo y lo guardamos.
   Si tarda más o no hay conexión, servimos lo guardado. Así, con buena
   señal siempre ves la última versión, y con mala señal no esperás.

   Al publicar cambios grandes, subí VERSION: se borra lo viejo.
   ============================================================ */

const VERSION = "nivora-v2";
const PACIENCIA = 3500;

/* Lo mínimo para que la app arranque sin conexión. */
const BASE = [
  "/",
  "/app/",
  "/landing.css",
  "/estilos.css",
  "/fuentes.css",
  "/instalar.js",
  "/manifest.json",
  "/icono.svg",
  "/icono-180.png",
  "/icono-192.png",
  "/icono-512.png",
  "/icono-maskable.png",
  "/marca/nivora-fit-blanco.png",
  "/js/dibujos.js",
  "/js/ejercicios.js",
  "/js/cuerpo.js",
  "/js/motor.js",
  "/js/interfaz.js",
  "/js/entrenador.js",
  "/js/nube.js",
  "/js/arranque.js",
  "/fuentes/saira-500.woff2",
  "/fuentes/saira-600.woff2",
  "/fuentes/saira-800.woff2",
  "/fuentes/plex-sans-400.woff2",
  "/fuentes/plex-sans-500.woff2",
  "/fuentes/plex-sans-600.woff2",
  "/fuentes/plex-mono-500.woff2",
  "/fuentes/plex-mono-600.woff2",
  "/config.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"
];

/* De afuera, lo único que guardamos es la librería de Supabase. */
const AJENOS_PERMITIDOS = ["https://cdn.jsdelivr.net/npm/@supabase/"];

self.addEventListener("install", evento => {
  evento.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    /* Uno por uno: si falta un archivo (por ejemplo config.js antes del
       primer build), el resto se guarda igual. */
    await Promise.all(BASE.map(url =>
      cache.add(new Request(url, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", evento => {
  evento.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter(n => n !== VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", evento => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;

  const url = new URL(pedido.url);
  const propio = url.origin === self.location.origin;

  /* Pagos, webhook y chat: siempre en vivo, nunca de la caché. */
  if (propio && url.pathname.startsWith("/.netlify/")) return;
  /* Supabase y cualquier otra API externa: no tocamos. */
  if (!propio && !AJENOS_PERMITIDOS.some(p => pedido.url.startsWith(p))) return;

  evento.respondWith(redPrimero(evento, pedido, url));
});

async function redPrimero(evento, pedido, url) {
  const cache = await caches.open(VERSION);

  const desdeRed = fetch(pedido).then(resp => {
    /* Guardamos solo respuestas buenas (o las opacas del CDN). */
    if (resp && (resp.ok || resp.type === "opaque")) {
      const copia = resp.clone();
      evento.waitUntil(cache.put(pedido, copia).catch(() => {}));
    }
    return resp;
  });

  const guardado = () => buscarGuardado(cache, pedido, url);

  try {
    return await conTiempo(desdeRed, PACIENCIA, guardado);
  } catch (e) {
    const g = await guardado();
    if (g) return g;
    throw e;
  }
}

/* Espera a la red hasta `ms`; si se pasa y hay algo guardado, lo devuelve
   y deja que la red termine de fondo (para actualizar la caché). */
function conTiempo(promesa, ms, alternativa) {
  return new Promise((resolver, rechazar) => {
    let listo = false;
    const t = setTimeout(async () => {
      const g = await alternativa();
      if (g && !listo) { listo = true; resolver(g); }
    }, ms);
    promesa.then(r => {
      clearTimeout(t);
      if (!listo) { listo = true; resolver(r); }
    }, err => {
      clearTimeout(t);
      if (!listo) { listo = true; rechazar(err); }
    });
  });
}

async function buscarGuardado(cache, pedido, url) {
  const exacto = await cache.match(pedido, { ignoreSearch: pedido.mode === "navigate" });
  if (exacto) return exacto;
  /* Navegando sin conexión a cualquier ruta de la app: le damos la app. */
  if (pedido.mode === "navigate") {
    if (url.pathname.startsWith("/app")) return cache.match("/app/");
    return cache.match("/");
  }
  return undefined;
}
