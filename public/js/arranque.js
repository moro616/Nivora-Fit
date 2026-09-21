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

function snapshot() {
  return {
    perfil: S.perfil, medidas: S.medidas, cargas: S.cargas,
    sesiones: S.sesiones.slice(-200), activa: S.activa, agenda: S.agenda, cardio: S.cardio,
    updated: Date.now()
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
