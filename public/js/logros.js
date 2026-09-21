"use strict";
/* ============================================================
   logros.js — el aviso de fin de prueba y los logros
   ============================================================ */

/* ---------- aviso: se termina la prueba ----------
   Aparece los últimos 2 días, arriba de todo en Hoy. Se puede cerrar
   por el día; al otro día vuelve si todavía no se suscribió. */
const CLAVE_AVISO_PRUEBA = "nivora.avisoPrueba";

function avisoPrueba() {
  const a = HAY_NUBE && Cuenta.acceso;
  if (!a || a.motivo !== "prueba" || a.diasRestantes > 2) return "";
  try { if (localStorage.getItem(CLAVE_AVISO_PRUEBA) === hoyISO()) return ""; } catch (e) { /* nada */ }
  const ultimo = a.diasRestantes <= 1;
  const precio = "$" + Number(CONFIG.PRECIO_MENSUAL).toLocaleString("es-AR");
  return `<div class="aviso-prueba" id="aviso-prueba">
    <div>
      <b>${ultimo ? "Hoy es tu último día de prueba" : "Te quedan 2 días de prueba"}</b>
      <p>Suscribite ahora y seguí sin cortes: ${precio} por mes, el primer débito recién cuando termina la prueba. Cancelás cuando quieras.</p>
    </div>
    <div class="aviso-botones">
      <button class="btn" id="ap-suscribir">Suscribirme</button>
      <button class="linkbtn" id="ap-cerrar">Más tarde</button>
    </div>
  </div>`;
}

function conectarAvisoPrueba() {
  const s = document.getElementById("ap-suscribir");
  if (!s) return;
  s.onclick = () => { abrirAjustes(); hojaPagos(); };
  document.getElementById("ap-cerrar").onclick = () => {
    try { localStorage.setItem(CLAVE_AVISO_PRUEBA, hoyISO()); } catch (e) { /* nada */ }
    const c = document.getElementById("aviso-prueba");
    if (c) c.remove();
  };
}

/* ---------- logros ----------
   Se calculan con lo que ya está guardado. Los conseguidos quedan en
   S.perfil.logros (id → fecha) y viajan con el resto del perfil. */
function estadisticasLogros() {
  const ses = S.sesiones || [];
  const gym = ses.filter(s => s.km == null), afuera = ses.filter(s => s.km != null);
  const meta = (S.perfil && S.perfil.dias) || 3;
  const sem = typeof semanas === "function" ? semanas(52) : [];
  let mejorRacha = 0, r = 0;
  sem.forEach((w, i) => {
    if (w.n >= meta) { r++; mejorRacha = Math.max(mejorRacha, r); }
    else if (i < sem.length - 1) r = 0;
  });
  return {
    total: ses.length,
    semanaCumplida: sem.some(w => w.n >= meta) ? 1 : 0,
    racha: mejorRacha,
    kmMax: afuera.reduce((m, s) => Math.max(m, s.km || 0), 0),
    kmTot: afuera.reduce((a, s) => a + (s.km || 0), 0),
    volMax: gym.reduce((m, s) => Math.max(m, s.volumen || 0), 0),
    volTot: gym.reduce((a, s) => a + (s.volumen || 0), 0),
    subidas: Object.values(S.cargas || {}).filter(c => (c.racha || 0) >= 1).length,
    medidas: (S.medidas || []).length,
    fotos: (S.perfil && S.perfil.fotos) || 0
  };
}

const LOGROS = [
  { id: "primer-paso",   ico: "rayo",     nombre: "Primer paso",       desc: "Tu primer entrenamiento",                 v: e => [e.total, 1] },
  { id: "semana",        ico: "check",    nombre: "Semana cumplida",   desc: "Cumpliste tu meta de la semana",          v: e => [e.semanaCumplida, 1] },
  { id: "racha-4",       ico: "fuego",    nombre: "Un mes firme",      desc: "4 semanas seguidas cumpliendo la meta",   v: e => [e.racha, 4] },
  { id: "racha-12",      ico: "fuego",    nombre: "Hábito formado",    desc: "12 semanas seguidas cumpliendo la meta",  v: e => [e.racha, 12] },
  { id: "entrenos-10",   ico: "pesa",     nombre: "Diez de diez",      desc: "10 entrenamientos",                       v: e => [e.total, 10] },
  { id: "entrenos-50",   ico: "pesa",     nombre: "Medio centenar",    desc: "50 entrenamientos",                       v: e => [e.total, 50] },
  { id: "entrenos-100",  ico: "estrella", nombre: "Club de los 100",   desc: "100 entrenamientos",                      v: e => [e.total, 100] },
  { id: "subida-1",      ico: "flecha",   nombre: "Más fuerte",        desc: "Subiste de peso en un ejercicio",         v: e => [e.subidas, 1] },
  { id: "subida-10",     ico: "flecha",   nombre: "Progresión",        desc: "Subiste de peso en 10 ejercicios",        v: e => [e.subidas, 10] },
  { id: "volumen-5000",  ico: "pesa",     nombre: "Cinco toneladas",   desc: "5.000 kg movidos en un entrenamiento",    v: e => [Math.round(e.volMax), 5000] },
  { id: "volumen-100k",  ico: "estrella", nombre: "Cien toneladas",    desc: "100.000 kg movidos en total",             v: e => [Math.round(e.volTot), 100000] },
  { id: "km-5",          ico: "ruta",     nombre: "Primeros 5 km",     desc: "5 km en una sola salida",                 v: e => [Math.floor(e.kmMax * 10) / 10, 5] },
  { id: "km-10",         ico: "ruta",     nombre: "Diez kilómetros",   desc: "10 km en una sola salida",                v: e => [Math.floor(e.kmMax * 10) / 10, 10] },
  { id: "km-100",        ico: "ruta",     nombre: "Cien kilómetros",   desc: "100 km recorridos en total",              v: e => [Math.floor(e.kmTot), 100] },
  { id: "medidas-4",     ico: "regla",    nombre: "Seguimiento",       desc: "4 mediciones cargadas",                   v: e => [e.medidas, 4] },
  { id: "foto-1",        ico: "camara",   nombre: "Punto de partida",  desc: "Tu primera foto de progreso",             v: e => [e.fotos, 1] }
];

function icoLogro(n) {
  const P = {
    rayo: '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    fuego: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.3 2.4-5 3.3-8.4 1.9 1.3 2.4 3 2.3 4.6 1-.7 1.7-1.9 1.8-3.4 2.3 1.8 3.6 4.2 3.6 7.2C17 18.6 15.6 21 12 21z"/>',
    pesa: '<path d="M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11"/>',
    estrella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>',
    flecha: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
    ruta: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6.5a3 3 0 0 0 0-6h-5a3 3 0 0 1 0-6H16"/>',
    regla: '<path d="M3.5 15.5 15.5 3.5l5 5-12 12z"/><path d="M8 11l2 2M11 8l2 2M14 5l2 2M5 14l2 2"/>',
    camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${P[n] || P.estrella}</svg>`;
}

/* Revisa si hay logros nuevos. La primera vez marca en silencio lo que
   ya estaba conseguido, para no llenar la pantalla de avisos. */
function revisarLogros() {
  if (!S.perfil || S.activa) return;
  const e = estadisticasLogros();
  const primeraVez = !S.perfil.logros;
  const tiene = S.perfil.logros || (S.perfil.logros = {});
  const nuevos = LOGROS.filter(l => !tiene[l.id] && (([a, b]) => a >= b)(l.v(e)));
  if (!nuevos.length) { if (primeraVez) guardar(); return; }
  nuevos.forEach(l => { tiene[l.id] = hoyISO(); });
  guardar();
  if (primeraVez) return;
  const l = nuevos[0];
  mostrarLogro(l, nuevos.length - 1);
}

function mostrarLogro(l, otros) {
  const caja = document.createElement("div");
  caja.className = "logro-aviso";
  caja.setAttribute("role", "status");
  caja.innerHTML = `<span class="logro-medalla">${icoLogro(l.ico)}</span>
    <span><small>Logro desbloqueado</small><b>${esc(l.nombre)}</b>${otros ? `<i>y ${otros} más</i>` : ""}</span>`;
  caja.onclick = () => { caja.remove(); irA("progreso"); };
  document.body.appendChild(caja);
  if (navigator.vibrate) navigator.vibrate([60, 60, 120]);
  requestAnimationFrame(() => caja.classList.add("visible"));
  setTimeout(() => { caja.classList.remove("visible"); setTimeout(() => caja.remove(), 400); }, 4200);
}

/* La grilla de la pestaña Progreso. */
function bloqueLogros() {
  const e = estadisticasLogros();
  const tiene = (S.perfil && S.perfil.logros) || {};
  const hechos = LOGROS.filter(l => tiene[l.id]).length;
  return `<section class="card pad panel-bloque">
    <div class="graf-head"><h3 class="graf-tit">Logros</h3><span class="delta">${hechos} de ${LOGROS.length}</span></div>
    <div class="logros">${LOGROS.map(l => {
      const [a, b] = l.v(e);
      const ok = !!tiene[l.id];
      const pct = Math.min(100, Math.round((a / b) * 100));
      return `<div class="logro${ok ? " ok" : ""}" title="${esc(l.desc)}">
        <span class="logro-medalla">${icoLogro(l.ico)}</span>
        <b>${esc(l.nombre)}</b>
        <small>${ok ? esc(fechaCorta(tiene[l.id])) : esc(l.desc)}</small>
        ${ok ? "" : `<i class="logro-barra"><i style="width:${pct}%"></i></i>`}
      </div>`;
    }).join("")}</div>
  </section>`;
}
