"use strict";
/* ============================================================
   cardio.js — salir a correr o a caminar
   Usa el GPS del teléfono para medir distancia y ritmo. La pantalla
   queda encendida mientras dura la salida: con la pantalla apagada el
   navegador deja de recibir la ubicación. Si no hay GPS, se carga a mano.
   ============================================================ */

const CARDIO = {
  correr:  { nombre: "Correr",  titulo: "Carrera",  verbo: "Salí a correr",  maxVel: 8,   metBase: 8 },
  caminar: { nombre: "Caminar", titulo: "Caminata", verbo: "Salí a caminar", maxVel: 3.2, metBase: 3.5 }
};

/* MET según la velocidad (Compendio de Actividad Física, redondeado). */
function metCardio(tipo, kmh) {
  if (!kmh) return CARDIO[tipo].metBase;
  if (tipo === "caminar") return kmh < 3.5 ? 2.8 : kmh < 4.8 ? 3.5 : kmh < 5.8 ? 4.3 : 5;
  return Math.max(6, Math.min(14, kmh * 1.02));
}

function tarjetaCardio() {
  const ult = (S.sesiones || []).slice().reverse().find(s => s.km != null);
  return `<div class="card pad cardio-card">
    <div class="cardio-cab">
      <div>
        <h3>¿Hoy salís a la calle?</h3>
        <p class="sm muted">Medimos distancia, ritmo y calorías con el GPS del teléfono.${
          ult ? ` Última: ${redondear(ult.km, 2)} km ${diaRelativo(ult.fecha)}.` : ""}</p>
      </div>
    </div>
    <div class="linea-botones">
      <button class="btn ghost" data-cardio="correr">${iconoCardio("correr")}Correr</button>
      <button class="btn ghost" data-cardio="caminar">${iconoCardio("caminar")}Caminar</button>
    </div>
    <button class="linkbtn" id="cardio-manual" style="margin-top:10px">Ya lo hice, cargarlo a mano</button>
  </div>`;
}

function iconoCardio(t) {
  return t === "correr"
    ? `<svg class="ico-btn" viewBox="0 0 24 24" aria-hidden="true"><circle cx="15" cy="4.5" r="2"/><path d="M8 21l3.5-6 3 2.5V22M6 12l3-3.5 4 1 2.5 3.5 3 .5M11.5 15l-1.2-5"/></svg>`
    : `<svg class="ico-btn" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M12 8v6l-2.5 7M12 14l2.5 7M8.5 11.5 12 9l3.5 2.5"/></svg>`;
}

function conectarTarjetaCardio() {
  document.querySelectorAll("[data-cardio]").forEach(b => b.onclick = () => empezarCardio(b.dataset.cardio));
  const m = document.getElementById("cardio-manual");
  if (m) m.onclick = cardioManual;
}

/* ---------- la salida en curso ---------- */
let gpsId = null, tCardio = null, wakeLock = null;

/* Tocar Correr o Caminar NO arranca el reloj: primero se busca señal de GPS
   y la persona toca "Empezar" cuando está lista. */
function empezarCardio(tipo) {
  if (S.activa) return toast("Terminá primero el entrenamiento de gimnasio.");
  S.cardio = { tipo, fecha: hoyISO(), preparando: true, inicio: null, acumulado: 0, corriendo: false,
               desde: null, metros: 0, ultimo: null, gps: "buscando", parciales: [], ruta: [] };
  lsSet();
  pintar();
}

function msCardio(c) {
  if (c.preparando) return 0;
  return c.acumulado + (c.corriendo ? Date.now() - c.desde : 0);
}

function largarCardio() {
  const c = S.cardio;
  const caja = document.getElementById("cv-cuenta");
  let n = 3;
  const paso = () => {
    if (!S.cardio) return;
    if (n === 0) {
      c.preparando = false; c.corriendo = true;
      c.inicio = c.desde = Date.now();
      c.ruta = c.ultimo && c.gps !== "debil" ? [[c.ultimo.lat, c.ultimo.lon]] : [];
      guardar("En marcha");
      if (navigator.vibrate) navigator.vibrate(350);
      pintar();
      return;
    }
    if (caja) { caja.hidden = false; caja.textContent = n; }
    if (navigator.vibrate) navigator.vibrate(90);
    n--;
    setTimeout(paso, 1000);
  };
  paso();
}

function distanciaM(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function arrancarGPS() {
  if (gpsId != null || !navigator.geolocation) {
    if (!navigator.geolocation && S.cardio) S.cardio.gps = "sin";
    return;
  }
  gpsId = navigator.geolocation.watchPosition(pos => {
    const c = S.cardio;
    if (!c) return;
    const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, t: pos.timestamp, acc: pos.coords.accuracy };
    c.gps = p.acc <= 25 ? "bien" : p.acc <= 50 ? "regular" : "debil";
    if (c.preparando || !c.corriendo) { c.ultimo = p; moverMapa(p, c); pintarDatosCardio(); return; }
    if (p.acc > 40) return;                       /* lectura muy imprecisa: la salteamos */
    if (c.ultimo) {
      const d = distanciaM(c.ultimo, p);
      const dt = Math.max(1, (p.t - c.ultimo.t) / 1000);
      /* Ni saltos imposibles ni el temblor del GPS estando quieto. */
      if (d / dt <= CARDIO[c.tipo].maxVel * 1.6 && d >= Math.min(4, p.acc / 3)) {
        const antes = Math.floor(c.metros / 1000);
        c.metros += d;
        (c.ruta || (c.ruta = [])).push([+p.lat.toFixed(5), +p.lon.toFixed(5)]);
        if (Math.floor(c.metros / 1000) > antes) {
          c.parciales.push(msCardio(c));
          if (navigator.vibrate) navigator.vibrate(200);
        }
        c.ultimo = p;
      } else if (d / dt > CARDIO[c.tipo].maxVel * 1.6) {
        c.ultimo = p;
      }
    } else c.ultimo = p;
    moverMapa(p, c);
    lsSet();
  }, err => {
    if (S.cardio) S.cardio.gps = err.code === 1 ? "negado" : "debil";
    pintarDatosCardio();
  }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
}

function pararGPS() {
  if (gpsId != null) navigator.geolocation.clearWatch(gpsId);
  gpsId = null;
  clearInterval(tCardio);
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

async function pantallaEncendida() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    }
  } catch (e) { /* sin permiso o sin soporte */ }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && S.cardio && S.cardio.corriendo) pantallaEncendida();
});

function ritmoTexto(ms, metros) {
  if (metros < 50) return "—";
  const segKm = (ms / 1000) / (metros / 1000);
  if (!isFinite(segKm) || segKm > 3600) return "—";
  return fmtSeg(Math.round(segKm));
}

function pintarCardio(v) {
  const c = S.cardio, T = CARDIO[c.tipo];
  if (c.preparando) return pintarPreparando(v, c, T);
  v.innerHTML = `
    <div class="cardio-vivo">
      <p class="eyebrow">${esc(T.titulo)} · ${c.corriendo ? "en curso" : "en pausa"}</p>
      <div class="cardio-reloj" id="cv-reloj">0:00</div>
      <div class="cardio-grid">
        <div><b id="cv-km">0,00</b><span>km</span></div>
        <div><b id="cv-ritmo">—</b><span>min/km</span></div>
        <div><b id="cv-kcal">0</b><span>kcal</span></div>
      </div>
      <p class="gps-estado" id="cv-gps"></p>
      <div class="cardio-parciales" id="cv-parciales"></div>
    </div>
    <div class="mapa-vivo" id="cv-mapa" aria-label="Tu recorrido"></div>
    <div class="linea-botones" style="margin-top:14px">
      <button class="btn" id="cv-pausa">${c.corriendo ? "Pausar" : "Seguir"}</button>
      <button class="btn ghost" id="cv-fin">Terminar</button>
    </div>
    <button class="btn ghost block peligro" id="cv-cancelar" style="margin-top:8px">Descartar</button>
    <p class="sm muted" style="margin:14px 2px 0">Dejá la app abierta con la pantalla prendida:
      si se apaga, el teléfono deja de pasar la ubicación y la distancia se corta.</p>`;

  document.getElementById("cv-pausa").onclick = () => {
    if (c.corriendo) { c.acumulado += Date.now() - c.desde; c.corriendo = false; (c.ruta || []).push(null); }
    else { c.desde = Date.now(); c.corriendo = true; c.ultimo = null; }
    guardar(); pintar();
  };
  document.getElementById("cv-fin").onclick = terminarCardio;
  document.getElementById("cv-cancelar").onclick = () => {
    if (!confirm("¿Descartás esta salida? No se va a guardar.")) return;
    pararGPS(); S.cardio = null; guardar(); pintar();
  };

  arrancarGPS();
  if (c.corriendo) pantallaEncendida();
  clearInterval(tCardio);
  tCardio = setInterval(pintarDatosCardio, 1000);
  pintarDatosCardio();
  armarMapa("cv-mapa", c.ruta, c.ultimo);
}

function pintarPreparando(v, c, T) {
  v.innerHTML = `
    <div class="cardio-vivo preparando">
      <p class="eyebrow">${esc(T.titulo)} · preparando</p>
      <h2 class="prep-tit">Cuando estés listo, tocá Empezar</h2>
      <p class="gps-estado" id="cv-gps"></p>
      <div class="cardio-cuenta" id="cv-cuenta" hidden>3</div>
    </div>
    <div class="mapa-vivo" id="cv-mapa" aria-label="Tu ubicación"></div>
    <button class="btn block grande" id="cv-largar" style="margin-top:14px">Empezar</button>
    <button class="btn ghost block" id="cv-cancelar" style="margin-top:8px">Cancelar</button>
    <p class="sm muted" style="margin:14px 2px 0">Esperá a que diga <b>GPS con buena señal</b> para que la distancia sea precisa.
      Dejá la app abierta con la pantalla prendida durante la salida.</p>`;
  document.getElementById("cv-largar").onclick = e => { e.target.disabled = true; largarCardio(); };
  document.getElementById("cv-cancelar").onclick = () => { pararGPS(); S.cardio = null; lsSet(); pintar(); };
  arrancarGPS();
  pantallaEncendida();
  clearInterval(tCardio);
  tCardio = setInterval(pintarDatosCardio, 1000);
  pintarDatosCardio();
  armarMapa("cv-mapa", [], c.ultimo);
}

function pintarDatosCardio() {
  const c = S.cardio;
  const g0 = document.getElementById("cv-gps");
  if (!c || !g0) { clearInterval(tCardio); return; }
  const r = document.getElementById("cv-reloj");
  if (!r) { pintarGps(c, g0); return; }
  const ms = msCardio(c), seg = Math.floor(ms / 1000);
  r.textContent = seg >= 3600 ? Math.floor(seg / 3600) + ":" + fmtSeg(seg % 3600).padStart(5, "0") : fmtSeg(seg);
  document.getElementById("cv-km").textContent = redondear(c.metros / 1000, 2);
  document.getElementById("cv-ritmo").textContent = ritmoTexto(ms, c.metros);
  const kmh = seg ? (c.metros / 1000) / (seg / 3600) : 0;
  document.getElementById("cv-kcal").textContent = kcalSesion(seg / 60, pesoActual(), metCardio(c.tipo, kmh));
  pintarGps(c, document.getElementById("cv-gps"));
  const p = document.getElementById("cv-parciales");
  if (p) p.innerHTML = c.parciales.map((t, i) => {
    const tramo = t - (i ? c.parciales[i - 1] : 0);
    return `<span>km ${i + 1} <b>${fmtSeg(Math.round(tramo / 1000))}</b></span>`;
  }).join("");
}

function pintarGps(c, g) {
  const txt = { buscando: "Buscando señal de GPS…", bien: "GPS con buena señal", regular: "GPS con señal regular",
                debil: "Señal de GPS débil: salí a cielo abierto", negado: "Sin permiso de ubicación: el tiempo se mide igual, la distancia no",
                sin: "Este teléfono no da ubicación: se mide solo el tiempo" }[c.gps] || "";
  g.textContent = txt;
  g.className = "gps-estado g-" + c.gps;
}

function terminarCardio() {
  const c = S.cardio;
  const ms = msCardio(c);
  if (ms < 60000) return toast("Todavía no pasó ni un minuto. Seguí un poco más o descartala.");
  pararGPS();
  const min = Math.round(ms / 60000);
  const km = Math.round(c.metros) / 1000;
  const { id } = guardarCardio(c.tipo, c.fecha, min, km);
  guardarRuta(id, c.ruta);
  S.cardio = null;
  guardar(CARDIO[c.tipo].titulo + " guardada");
  pintar();
  resumenCardio(c.tipo, min, km, ms, id);
}

function guardarCardio(tipo, fecha, min, km) {
  const kmh = min ? km / (min / 60) : 0;
  const kcal = kcalSesion(min, pesoActual(), metCardio(tipo, kmh));
  const ritmo = km > 0.05 ? Math.round((min * 60) / km) : null;
  const id = nuevoId();
  S.sesiones.push({ id, fecha, bloque: tipo, nombre: CARDIO[tipo].titulo, tipo, series: 0, min, kcal, km, ritmo, volumen: 0 });
  S.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { kcal, id };
}

function resumenCardio(tipo, min, km, ms, id) {
  const s = S.sesiones.slice().reverse().find(x => x.tipo === tipo);
  const mejor = S.sesiones.filter(x => x.tipo === tipo && x.km).reduce((m, x) => Math.max(m, x.km), 0);
  abrirSheet(`
    <div class="sheet-head"><h3>${esc(CARDIO[tipo].titulo)} guardada</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="datos grande">
      <div><b>${redondear(km, 2)}</b><span>km</span></div>
      <div><b>${min}′</b><span>de ${tipo === "correr" ? "carrera" : "caminata"}</span></div>
      <div><b>${s ? s.kcal : 0}</b><span>kcal aprox.</span></div>
    </div>
    ${km > 0.05 ? `<p class="cuerpo">Ritmo promedio de <b>${ritmoTexto(ms, km * 1000)} min/km</b>.${
      km >= mejor && S.sesiones.filter(x => x.tipo === tipo).length > 1 ? " Es tu salida más larga hasta ahora." : ""}</p>` : ""}
    ${rutaDe(id) ? `<div class="mapa-ruta" id="rs-mapa"></div>` : ""}
    <button class="btn block" id="cerrar-resumen" style="margin-top:14px">Listo</button>`);
  if (rutaDe(id)) armarMapa("rs-mapa", rutaDe(id), null, true);
  document.getElementById("cerrar-resumen").onclick = () => cerrarSheet();
}

function cardioManual() {
  let tipo = "correr";
  abrirSheet(`
    <div class="sheet-head"><h3>Cargar una salida</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="ops fila" id="cm-tipo">
      <button class="op activo" data-t="correr"><b>Correr</b></button>
      <button class="op" data-t="caminar"><b>Caminar</b></button>
    </div>
    <div class="dos" style="margin-top:14px">
      <div class="field"><label for="cm-min">Minutos</label>
        <input id="cm-min" type="number" inputmode="numeric" placeholder="30"></div>
      <div class="field"><label for="cm-km">Kilómetros</label>
        <input id="cm-km" type="number" inputmode="decimal" placeholder="5"></div>
    </div>
    <div class="field"><label for="cm-fecha">Fecha</label>
      <input id="cm-fecha" type="date" value="${hoyISO()}" max="${hoyISO()}"></div>
    <button class="btn block" id="cm-guardar">Guardar</button>`);
  document.querySelectorAll("#cm-tipo .op").forEach(b => b.onclick = () => {
    tipo = b.dataset.t;
    document.querySelectorAll("#cm-tipo .op").forEach(o => o.classList.toggle("activo", o === b));
  });
  document.getElementById("cm-guardar").onclick = () => {
    const min = Math.round(num(document.getElementById("cm-min").value, 0));
    const km = num(document.getElementById("cm-km").value, 0);
    const fecha = document.getElementById("cm-fecha").value || hoyISO();
    if (!min || min > 600) return toast("Poné cuántos minutos duró.");
    if (km < 0 || km > 100) return toast("Revisá los kilómetros.");
    const { kcal } = guardarCardio(tipo, fecha, min, km);
    guardar("Salida guardada"); cerrarSheet(); pintar();
    toast(`${CARDIO[tipo].titulo} cargada · ${kcal} kcal.`);
  };
}


/* ============================================================
   Mapa del recorrido
   Leaflet (se carga solo cuando hace falta) con el mapa libre de
   OpenStreetMap. El recorrido queda guardado SOLO en este teléfono:
   no se sube al servidor.
   ============================================================ */
const CLAVE_RUTAS = "nivora.rutas";
function rutasGuardadas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_RUTAS) || "{}"); } catch (e) { return {}; }
}
function rutaDe(id) {
  if (!id) return null;
  const r = rutasGuardadas()[id];
  return r && r.filter(Boolean).length > 1 ? r : null;
}
/* Guarda como mucho 600 puntos por salida y las últimas 40 salidas. */
function guardarRuta(id, ruta) {
  if (!id || !ruta || ruta.filter(Boolean).length < 2) return;
  let pts = ruta;
  if (pts.length > 600) {
    const paso = Math.ceil(pts.length / 600);
    pts = pts.filter((p, i) => p === null || i % paso === 0 || i === pts.length - 1);
  }
  const todas = rutasGuardadas();
  todas[id] = pts;
  const ids = Object.keys(todas);
  if (ids.length > 40) ids.slice(0, ids.length - 40).forEach(k => delete todas[k]);
  try { localStorage.setItem(CLAVE_RUTAS, JSON.stringify(todas)); } catch (e) { /* sin espacio */ }
}

let mapaVivo = null, lineaViva = null, puntoVivo = null;
function cargarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((ok, mal) => {
    if (!document.getElementById("leaflet-css")) {
      const l = document.createElement("link");
      l.id = "leaflet-css"; l.rel = "stylesheet"; l.href = "/vendor/leaflet/leaflet.css";
      document.head.appendChild(l);
    }
    const s = document.createElement("script");
    s.src = "/vendor/leaflet/leaflet.js";
    s.onload = () => ok(window.L);
    s.onerror = () => mal(new Error("sin mapa"));
    document.head.appendChild(s);
  });
}
const tramos = ruta => {
  const out = [[]];
  (ruta || []).forEach(p => { if (p) out[out.length - 1].push(p); else if (out[out.length - 1].length) out.push([]); });
  return out.filter(t => t.length);
};

async function armarMapa(idCaja, ruta, pos, fijo) {
  const caja = document.getElementById(idCaja);
  if (!caja) return;
  let L;
  try { L = await cargarLeaflet(); } catch (e) { caja.innerHTML = `<p class="mapa-sin">El mapa necesita conexión.</p>`; return; }
  if (!document.getElementById(idCaja)) return;
  const m = L.map(caja, { zoomControl: false, attributionControl: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
  }).addTo(m);
  const t = tramos(ruta);
  const linea = L.polyline(t, { color: "#fff", weight: 5, opacity: 0.95, className: "ruta-linea" }).addTo(m);
  const ultimo = t.length ? t[t.length - 1][t[t.length - 1].length - 1] : pos ? [pos.lat, pos.lon] : null;
  if (fijo) {
    if (t.length) {
      L.circleMarker(t[0][0], { radius: 6, className: "ruta-inicio", fillOpacity: 1 }).addTo(m);
      L.circleMarker(ultimo, { radius: 6, className: "ruta-fin", fillOpacity: 1 }).addTo(m);
      m.fitBounds(linea.getBounds(), { padding: [22, 22] });
    }
    return;
  }
  mapaVivo = m; lineaViva = linea;
  puntoVivo = ultimo ? L.circleMarker(ultimo, { radius: 7, className: "ruta-yo", fillOpacity: 1 }).addTo(m) : null;
  if (t.length > 0 && t.flat().length > 1) m.fitBounds(linea.getBounds(), { padding: [30, 30], maxZoom: 17 });
  else if (ultimo) m.setView(ultimo, 16);
  else m.setView([-34.6, -58.4], 11);
}

function moverMapa(p, c) {
  if (!mapaVivo || !document.body.contains(mapaVivo.getContainer())) { mapaVivo = null; return; }
  const yo = [p.lat, p.lon];
  if (lineaViva) lineaViva.setLatLngs(tramos(c.ruta));
  if (puntoVivo) puntoVivo.setLatLng(yo);
  else puntoVivo = window.L.circleMarker(yo, { radius: 7, className: "ruta-yo", fillOpacity: 1 }).addTo(mapaVivo);
  mapaVivo.panTo(yo, { animate: true });
  if (mapaVivo.getZoom() < 14) mapaVivo.setZoom(16);
}

function verRuta(id) {
  const s = S.sesiones.find(x => x.id === id);
  if (!s) return;
  abrirSheet(`
    <div class="sheet-head"><h3>${esc(s.nombre || "Salida")}</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <p class="sm muted" style="margin:0 0 12px">${esc(fechaCorta(s.fecha))} · ${redondear(s.km, 2)} km · ${s.min} min${
      s.ritmo ? " · " + fmtSeg(s.ritmo) + " min/km" : ""} · ${s.kcal} kcal</p>
    <div class="mapa-ruta" id="vr-mapa"></div>
    <p class="sm muted" style="margin:10px 0 0">El recorrido se guarda solo en este teléfono.</p>`);
  armarMapa("vr-mapa", rutaDe(id), null, true);
}
