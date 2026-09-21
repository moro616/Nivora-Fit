"use strict";
/* ============================================================
   clima.js — el clima arriba de todo en Hoy
   Pide la ubicación solo cuando la persona toca, la redondea a ~1 km y
   consulta nuestro servidor, que le pregunta a MET Norway. Lo último
   que se consultó queda 20 minutos en el teléfono.
   ============================================================ */

const CLIMA_CLAVE = "nivora.clima";
const Clima = { cargando: false, error: "" };

function climaGuardado() {
  try { return JSON.parse(localStorage.getItem(CLIMA_CLAVE) || "null"); } catch (e) { return null; }
}

/* MET Norway usa códigos como "lightrainshowers_day". */
function leerSimbolo(cod) {
  const c = String(cod || "").replace(/_(day|night|polartwilight)$/, "");
  const noche = /_night$/.test(cod || "");
  if (/thunder/.test(c)) return { txt: "Tormenta", ico: "tormenta", malo: 3 };
  if (/snow|sleet/.test(c)) return { txt: /sleet/.test(c) ? "Aguanieve" : "Nieve", ico: "nieve", malo: 2 };
  if (/heavyrain/.test(c)) return { txt: "Lluvia fuerte", ico: "lluvia", malo: 3 };
  if (/lightrain/.test(c)) return { txt: /showers/.test(c) ? "Chaparrones débiles" : "Lluvia débil", ico: "lluvia", malo: 1 };
  if (/rain/.test(c)) return { txt: /showers/.test(c) ? "Chaparrones" : "Lluvia", ico: "lluvia", malo: 2 };
  if (c === "fog") return { txt: "Niebla", ico: "niebla", malo: 1 };
  if (c === "cloudy") return { txt: "Nublado", ico: "nube", malo: 0 };
  if (c === "partlycloudy") return { txt: "Parcialmente nublado", ico: noche ? "nubeluna" : "nubesol", malo: 0 };
  if (c === "fair") return { txt: "Mayormente despejado", ico: noche ? "luna" : "nubesol", malo: 0 };
  if (c === "clearsky") return { txt: "Despejado", ico: noche ? "luna" : "sol", malo: 0 };
  return { txt: "—", ico: "nube", malo: 0 };
}

function icoClima(nombre) {
  const P = {
    sol: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    luna: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
    nube: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8A6 6 0 0 0 6.4 11 3.8 3.8 0 0 0 7 18.5z"/>',
    nubesol: '<path d="M8.5 7.5a3.5 3.5 0 0 1 6.2-1M10.5 2.5v1.4M4.8 4.8l1 1M3 10.5h1.4"/><path d="M8 20h9.5a3.6 3.6 0 0 0 .3-7.2 5.4 5.4 0 0 0-10.4.7A3.3 3.3 0 0 0 8 20z"/>',
    nubeluna: '<path d="M11 4.5a4.2 4.2 0 0 0 4.8 4.8"/><path d="M8 20h9.5a3.6 3.6 0 0 0 .3-7.2 5.4 5.4 0 0 0-10.4.7A3.3 3.3 0 0 0 8 20z"/>',
    lluvia: '<path d="M7 14.5h10.5a4 4 0 0 0 .4-8A6 6 0 0 0 6.4 7 3.8 3.8 0 0 0 7 14.5z"/><path d="M8 17.5l-1 3M12 17.5l-1 3M16 17.5l-1 3"/>',
    tormenta: '<path d="M7 14.5h10.5a4 4 0 0 0 .4-8A6 6 0 0 0 6.4 7 3.8 3.8 0 0 0 7 14.5z"/><path d="M12.5 15.5l-2 3.5h3l-2 3.5"/>',
    niebla: '<path d="M4 9h16M3 13h18M5 17h14"/>',
    nieve: '<path d="M7 14.5h10.5a4 4 0 0 0 .4-8A6 6 0 0 0 6.4 7 3.8 3.8 0 0 0 7 14.5z"/><path d="M8 18.5h.01M12 20h.01M16 18.5h.01"/>'
  };
  return `<svg class="clima-ico" viewBox="0 0 24 24" aria-hidden="true">${P[nombre] || P.nube}</svg>`;
}

/* Un consejo corto para entrenar afuera. */
function consejoClima(h) {
  const s = leerSimbolo(h.simbolo);
  const kmh = h.viento * 3.6;
  if (s.ico === "tormenta") return { txt: "Hay tormenta: hoy mejor gimnasio o en casa.", tono: "bad" };
  if (s.malo >= 2 || h.lluvia >= 1) return { txt: "Está lloviendo: mejor gimnasio o esperá a que pare.", tono: "aviso" };
  if (h.temp >= 31) return { txt: "Mucho calor: salí temprano o al atardecer, e hidratate.", tono: "aviso" };
  if (h.temp <= 4) return { txt: "Hace frío: abrigate por capas y entrá en calor adentro.", tono: "aviso" };
  if (kmh >= 35) return { txt: "Hay mucho viento: elegí un recorrido reparado.", tono: "aviso" };
  if (s.malo === 1) return { txt: "Se puede salir, llevá algo por si llovizna.", tono: "" };
  return { txt: "Buen momento para correr o caminar afuera.", tono: "bien" };
}

/* La mejor hora de las próximas 12 para salir. */
function mejorHora(horas) {
  const puntaje = h => {
    const s = leerSimbolo(h.simbolo);
    return s.malo * 10 + (h.lluvia || 0) * 8 + Math.abs(h.temp - 17) + Math.max(0, h.viento * 3.6 - 20) / 3;
  };
  const hr = x => new Date(x.hora).getHours();
  const candidatas = horas.slice(1).filter(h => hr(h) >= 6 && hr(h) <= 22);
  if (!candidatas.length) return null;
  return candidatas.reduce((a, b) => puntaje(b) < puntaje(a) ? b : a);
}

function tarjetaClima() {
  if (!HAY_NUBE && location.hostname !== "localhost") return "";
  const c = climaGuardado();
  const h = c && c.d && c.d.horas && c.d.horas[0];
  if (!h) {
    return `<button class="clima vacio" id="clima">
      ${icoClima("nubesol")}
      <span class="clima-txt"><b>${Clima.cargando ? "Buscando el clima…" : "¿Cómo está el día para entrenar afuera?"}</b>
        <small>${Clima.error ? esc(Clima.error) : "Tocá para ver el clima donde estás"}</small></span>
    </button>`;
  }
  const s = leerSimbolo(h.simbolo), k = consejoClima(h);
  return `<button class="clima" id="clima" aria-label="Ver el pronóstico">
    ${icoClima(s.ico)}
    <span class="clima-temp">${Math.round(h.temp)}°</span>
    <span class="clima-txt"><b>${esc(s.txt)}${c.lugar ? " · " + esc(c.lugar) : ""}</b>
      <small class="t-${k.tono}">${esc(k.txt)}</small></span>
    <span class="menu-flecha" aria-hidden="true">›</span>
  </button>`;
}

function conectarClima() {
  const b = document.getElementById("clima");
  if (!b) return;
  const c = climaGuardado();
  b.onclick = () => (c && c.d ? hojaClima() : pedirClima(true));
  /* Si ya dio permiso antes y el dato está viejo, se renueva solo. */
  if (c && Date.now() - c.t > 20 * 60 * 1000 && !Clima.cargando) pedirClima(false);
}

function pedirClima(conAviso) {
  if (!navigator.geolocation) { Clima.error = "Este teléfono no da ubicación."; return repintarClima(); }
  Clima.cargando = true; Clima.error = "";
  if (conAviso) repintarClima();
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = +pos.coords.latitude.toFixed(2), lon = +pos.coords.longitude.toFixed(2);
    try {
      const r = await fetch(`/.netlify/functions/clima?lat=${lat}&lon=${lon}`);
      if (!r.ok) throw new Error("http " + r.status);
      const d = await r.json();
      const lugar = (S.perfil && S.perfil.ciudad) || "";
      localStorage.setItem(CLIMA_CLAVE, JSON.stringify({ t: Date.now(), lat, lon, lugar, d }));
    } catch (e) {
      Clima.error = "No pudimos traer el clima. Probá en un rato.";
    }
    Clima.cargando = false;
    repintarClima();
  }, err => {
    Clima.cargando = false;
    Clima.error = err.code === 1 ? "Sin permiso de ubicación. Activalo en el navegador para ver el clima." : "No pudimos ubicarte. Probá de nuevo.";
    repintarClima();
  }, { enableHighAccuracy: false, maximumAge: 30 * 60 * 1000, timeout: 15000 });
}

function repintarClima() {
  const b = document.getElementById("clima");
  if (!b) return;
  const t = document.createElement("div");
  t.innerHTML = tarjetaClima();
  if (t.firstElementChild) { b.replaceWith(t.firstElementChild); conectarClima(); }
}

function hojaClima() {
  const c = climaGuardado();
  const horas = c.d.horas;
  const h = horas[0], s = leerSimbolo(h.simbolo), k = consejoClima(h);
  const mejor = mejorHora(horas);
  const hhmm = x => new Date(x).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  abrirSheet(`
    <div class="sheet-head"><h3>Clima para entrenar</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="clima-grande">
      ${icoClima(s.ico)}
      <div><b>${Math.round(h.temp)}°</b><span>${esc(s.txt)}</span></div>
    </div>
    <div class="datos" style="margin-top:14px">
      <div><b>${Math.round(h.viento * 3.6)}</b><span>km/h de viento</span></div>
      <div><b>${Math.round(h.humedad)}%</b><span>humedad</span></div>
      <div><b>${redondear(h.lluvia || 0, 1)}</b><span>mm de lluvia</span></div>
    </div>
    <div class="ojo" style="margin-top:14px"><b>Para salir</b><p class="t-${k.tono}">${esc(k.txt)}${
      mejor ? ` La mejor hora de las próximas es a las <b>${hhmm(mejor.hora)}</b> (${Math.round(mejor.temp)}°, ${esc(leerSimbolo(mejor.simbolo).txt.toLowerCase())}).` : ""}</p></div>
    <label class="lbl" style="margin-top:16px">Próximas horas</label>
    <div class="clima-horas">${horas.slice(1, 13).map(x => `
      <div><small>${hhmm(x.hora).slice(0, 2)} h</small>${icoClima(leerSimbolo(x.simbolo).ico)}<b>${Math.round(x.temp)}°</b>${
        x.lluvia >= 0.1 ? `<i>${redondear(x.lluvia, 1)} mm</i>` : "<i>&nbsp;</i>"}</div>`).join("")}</div>
    <button class="btn ghost block" id="cl-actualizar" style="margin-top:16px">Actualizar</button>
    <p class="sm muted" style="margin:10px 0 0">Datos de MET Norway. Tu ubicación se usa aproximada (a 1 km) y no se guarda.</p>`);
  document.getElementById("cl-actualizar").onclick = () => { cerrarSheet(); localStorage.removeItem(CLIMA_CLAVE); pedirClima(true); };
}
