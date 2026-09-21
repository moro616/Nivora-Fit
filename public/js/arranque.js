"use strict";
/* ============================================================
   arranque.js — el estado de la app y el encendido
   Acá vive todo lo que la app sabe de vos mientras la usás, cómo se
   guarda en el teléfono y qué pasa cuando se abre.
   ============================================================ */

const S = {
  perfil: null,    /* {nombre, sexo, nacimiento, altura, peso, nivel, objetivo, dias, equipo, actividad, limitaciones[], tema} */
  medidas: [],     /* mediciones con cinta, la última es la que manda */
  cargas: {},      /* cuánto peso levantás en cada ejercicio */
  sesiones: [],    /* entrenamientos terminados */
  activa: null,    /* el entrenamiento en curso, si hay uno */
  agenda: null,    /* la rutina de hoy ya armada */
  cardio: null,    /* la salida a correr o caminar en curso */
  vista: "hoy",
  updated: 0
};

/* ---------- utilidades ---------- */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
const hoyISO = () => new Date().toISOString().slice(0, 10);
const hoyISO_date = () => new Date(hoyISO() + "T00:00:00");
const num = (v, d) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : (d == null ? null : d); };
const redondear = (v, d) => v == null ? "—" : (Math.round(v * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString("es-AR");

function fechaCorta(iso) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}
function diaRelativo(iso) {
  const dias = Math.round((hoyISO_date() - new Date(iso + "T00:00:00")) / 86400000);
  if (dias === 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return "hace " + dias + " días";
  if (dias < 14) return "hace una semana";
  return "hace " + Math.round(dias / 7) + " semanas";
}

/* ---------- guardado en el teléfono ---------- */
const CLAVE = "nivora.v1";

/* paraNube: lo que sube al servidor no lleva ni el recorrido GPS ni la última
   coordenada; eso queda solo en el teléfono. */
function snapshot(paraNube) {
  return {
    perfil: S.perfil, medidas: S.medidas, cargas: S.cargas,
    sesiones: S.sesiones.slice(-3000), activa: S.activa, agenda: S.agenda,
    cardio: S.cardio && (paraNube ? { ...S.cardio, ultimo: null, ruta: null } : S.cardio),
    updated: S.updated || Date.now()
  };
}
function restaurar(d) {
  if (!d) return;
  S.perfil = d.perfil || null;
  S.medidas = d.medidas || [];
  S.cargas = d.cargas || {};
  S.sesiones = d.sesiones || [];
  S.activa = d.activa || null;
  S.agenda = d.agenda || null;
  S.cardio = d.cardio || null;
  S.updated = d.updated || 0;
  asegurarIds();
}

/* ---------- integridad ----------
   Cada entrenamiento lleva un id propio. Así, si la misma persona usa dos
   teléfonos, los historiales se suman en vez de pisarse. A los registros
   viejos sin id les damos uno que sale de su contenido: dos teléfonos le
   ponen el mismo id al mismo entrenamiento. */
function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function claveSesion(s) {
  return [s.fecha, s.bloque, s.min, s.series, s.km == null ? "" : s.km, s.volumen || 0].join("|");
}
function hashCorto(t) {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return "v" + (h >>> 0).toString(36);
}
function asegurarIds() {
  (S.sesiones || []).forEach(s => { if (!s.id) s.id = hashCorto(claveSesion(s)); });
}

/* Junta lo de este teléfono con lo del servidor.
   Listas (entrenamientos, medidas): se suman, sin duplicados.
   Cargas: por ejercicio, gana la más reciente.
   Perfil y rutina del día: gana el lado que se tocó último.
   Lo que está en curso en este teléfono (entrenamiento, salida) no se toca. */
function fusionar(local, remoto) {
  if (!remoto) return local;
  if (!local) return remoto;
  const nuevoGana = (remoto.updated || 0) > (local.updated || 0);
  const base = nuevoGana ? remoto : local, otro = nuevoGana ? local : remoto;

  const ses = new Map();
  [...(otro.sesiones || []), ...(base.sesiones || [])].forEach(s => {
    const id = s.id || hashCorto(claveSesion(s));
    ses.set(id, { ...s, id });
  });
  const med = new Map();
  [...(otro.medidas || []), ...(base.medidas || [])].forEach(m => med.set(m.fecha, m));

  const cargas = { ...(otro.cargas || {}) };
  Object.entries(base.cargas || {}).forEach(([k, c]) => {
    const o = cargas[k];
    if (!o || (c.fecha || "") >= (o.fecha || "")) cargas[k] = c;
  });

  return {
    perfil: base.perfil || otro.perfil,
    medidas: [...med.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    cargas,
    sesiones: [...ses.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    activa: local.activa || null,
    cardio: local.cardio || null,
    agenda: base.agenda || null,
    updated: Math.max(local.updated || 0, remoto.updated || 0)
  };
}
function lsGet() {
  try { const t = localStorage.getItem(CLAVE); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
function lsSet() {
  try { localStorage.setItem(CLAVE, JSON.stringify(snapshot())); } catch (e) { /* sin espacio o modo privado */ }
}
function lsBorrar() {
  try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
}

/* ---------- pestañas ---------- */
function irA(vista) {
  S.vista = vista;
  document.querySelectorAll("#tabbar [role=tab]").forEach(b =>
    b.setAttribute("aria-selected", String(b.dataset.tab === vista)));
  pintar();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function conectarTabs() {
  document.querySelectorAll("#tabbar [role=tab]").forEach(b => {
    b.onclick = () => irA(b.dataset.tab);
  });
  document.getElementById("btn-avatar").onclick = abrirAjustes;
  document.getElementById("btn-chat").onclick = abrirEntrenador;
  document.getElementById("scrim").onclick = () => cerrarSheet();
  document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarSheet(); });
}

/* ---------- encendido ---------- */
async function arrancar() {
  conectarTabs();
  aplicarTema();
  Instalar.alCambiar(refrescarInstalar);

  if (!HAY_NUBE) {
    /* Modo local: la app funciona igual, pero los datos viven solo en este
       teléfono. Sirve para probarla antes de conectar Supabase. */
    restaurar(lsGet());
    aplicarTema();
    ocultarPantallasDeCuenta();
    pintar();
    estadoGuardado("Guardado en el teléfono");
    return;
  }

  await revisarVueltaDePago();
  await iniciarApp();
}

document.addEventListener("DOMContentLoaded", arrancar);

/* Si la persona vuelve a la app después de un rato, refrescamos por si
   entrenó desde otro dispositivo. */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && HAY_NUBE && Cuenta.usuario) {
    cargarPerfil().then(() => { if (Cuenta.acceso && !Cuenta.acceso.permitido) mostrarMuroPago(); });
  }
});
