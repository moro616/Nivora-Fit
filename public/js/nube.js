"use strict";
/* ============================================================
   nube.js — cuenta, datos y suscripción
   Supabase para auth y base de datos; Mercado Pago para el cobro.
   Todo lo que toca la red pasa por acá.
   ============================================================ */

/* Si todavía no cargaste las claves de Supabase, la app igual funciona:
   guarda todo en el teléfono y no pide cuenta. Sirve para probarla. */
const HAY_NUBE = !!(window.CONFIG && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
const SB = HAY_NUBE ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

const Cuenta = {
  usuario: null,      // { id, email }
  perfil: null,       // fila de la tabla perfiles
  acceso: null,       // { permitido, motivo, diasRestantes }
  sincronizando: false
};

/* ---------- acceso: prueba gratis o suscripción paga ---------- */
function calcularAcceso(fila) {
  if (!fila) return { permitido: false, motivo: "sin-perfil", diasRestantes: 0 };
  if (fila.suscripcion_estado === "activa") {
    return { permitido: true, motivo: "suscripcion", proximoCobro: fila.proximo_cobro };
  }
  const fin = fila.trial_fin ? new Date(fila.trial_fin) : null;
  if (fin && fin > new Date()) {
    const dias = Math.ceil((fin - new Date()) / 86400000);
    return { permitido: true, motivo: "prueba", diasRestantes: dias, trialFin: fila.trial_fin };
  }
  return { permitido: false, motivo: fila.suscripcion_estado === "cancelada" ? "cancelada" : "vencida", diasRestantes: 0 };
}

/* ---------- arranque ---------- */
async function iniciarApp() {
  const local = lsGet();
  if (local) { restaurar(local); aplicarTema(); }

  const { data: { session } } = await SB.auth.getSession();
  if (!session) { lsBorrar(); mostrarAcceso(); return; }

  Cuenta.usuario = { id: session.user.id, email: session.user.email };
  await cargarPerfil();

  if (!Cuenta.acceso.permitido) { mostrarMuroPago(); return; }

  // el servidor manda: si tiene datos más nuevos que los locales, gana el servidor
  const remoto = Cuenta.perfil && Cuenta.perfil.datos;
  if (remoto && remoto.updated && (!local || remoto.updated > (local.updated || 0))) {
    restaurar(remoto); lsSet();
  }
  aplicarTema();
  ocultarPantallasDeCuenta();
  pintar();
  estadoGuardado(Cuenta.acceso.motivo === "prueba"
    ? `Prueba gratis · te quedan ${Cuenta.acceso.diasRestantes} día${Cuenta.acceso.diasRestantes === 1 ? "" : "s"}`
    : "Sincronizado con tu cuenta");
  if (!remoto || !remoto.updated) await subirEstado();
}

async function cargarPerfil() {
  const { data, error } = await SB.from("perfiles").select("*").eq("id", Cuenta.usuario.id).maybeSingle();
  if (error) console.warn("perfil:", error.message);
  Cuenta.perfil = data || null;
  Cuenta.acceso = calcularAcceso(Cuenta.perfil);
  return Cuenta.perfil;
}

/* ---------- guardado ---------- */
let tGuardar = null;
function guardar(nota) {
  lsSet();
  estadoGuardado(nota || "Guardado");
  clearTimeout(tGuardar);
  tGuardar = setTimeout(subirEstado, 1200);
}
async function subirEstado() {
  if (!Cuenta.usuario || Cuenta.sincronizando) return;
  Cuenta.sincronizando = true;
  try {
    const { error } = await SB.from("perfiles")
      .update({ datos: snapshot(), actualizado: new Date().toISOString() })
      .eq("id", Cuenta.usuario.id);
    if (error) throw error;
    estadoGuardado("Guardado en tu cuenta");
    await sincronizarTablas();
  } catch (e) {
    estadoGuardado("Guardado en este dispositivo; se sube cuando vuelva la conexión");
  } finally {
    Cuenta.sincronizando = false;
  }
}

/* Además del snapshot, las sesiones y las medidas van a tablas propias:
   sirven para métricas, para exportar y para cualquier consulta SQL posterior. */
async function sincronizarTablas() {
  if (!Cuenta.usuario) return;
  const uid = Cuenta.usuario.id;
  const sesiones = S.sesiones.slice(-60).map(s => ({
    usuario_id: uid, fecha: s.fecha, bloque: s.bloque, series: s.series,
    minutos: Math.round(s.min || 0), kcal: Math.round(s.kcal || 0), volumen: Math.round(s.volumen || 0)
  }));
  const medidas = S.medidas.slice(-60).map(m => {
    const ev = evaluar(S.perfil, m);
    return { usuario_id: uid, fecha: m.fecha, peso: m.peso || null, cuello: m.cuello || null,
      cintura: m.cintura || null, cadera: m.cadera || null, pecho: m.pecho || null,
      brazo: m.brazo || null, muslo: m.muslo || null, pantorrilla: m.pantorrilla || null,
      grasa_pct: ev && ev.grasa != null ? Number(ev.grasa.toFixed(2)) : null };
  });
  if (sesiones.length) await SB.from("sesiones").upsert(sesiones, { onConflict: "usuario_id,fecha,bloque" });
  if (medidas.length) await SB.from("medidas").upsert(medidas, { onConflict: "usuario_id,fecha" });
}

/* ---------- pantalla de acceso ---------- */
function ocultarPantallasDeCuenta() {
  document.getElementById("v-acceso").hidden = true;
  document.getElementById("v-muro").hidden = true;
}
function ocultarApp() {
  document.getElementById("tabbar").hidden = true;
  ["setup", "hoy", "agenda", "ejercicios", "cuerpo", "progreso"].forEach(v => {
    const el = document.getElementById("v-" + v); if (el) el.hidden = true;
  });
}
function mostrarAcceso(modo) {
  ocultarApp();
  document.getElementById("v-muro").hidden = true;
  const v = document.getElementById("v-acceso");
  v.hidden = false;
  const registro = modo === "registro";
  document.getElementById("who").innerHTML =
    `<b>${CONFIG.APP_NOMBRE}</b><small>Tu entrenador y tu evaluación corporal</small>`;
  document.getElementById("chip").textContent = registro ? "Crear cuenta" : "Entrar";
  v.innerHTML = `
    <div class="card pad">
      <p class="eyebrow">${registro ? "Creá tu cuenta" : "Entrá a tu cuenta"}</p>
      <h2 style="font-size:25px;font-weight:800;margin:6px 0 8px">
        ${registro ? "Empezá tus 7 días gratis" : "Bienvenido de vuelta"}</h2>
      <p class="sm muted" style="margin:0 0 16px">
        ${registro
          ? "Probás todo una semana sin poner tarjeta. Si te sirve, después seguís por $"
            + CONFIG.PRECIO_MENSUAL.toLocaleString("es-AR") + " por mes."
          : "Tus rutinas, medidas e historial te esperan donde los dejaste."}</p>
      <div class="field"><label for="ac-email">Correo</label>
        <input id="ac-email" type="email" inputmode="email" autocomplete="email" placeholder="vos@correo.com"></div>
      <div class="field"><label for="ac-pass">Contraseña</label>
        <input id="ac-pass" type="password" autocomplete="${registro ? "new-password" : "current-password"}"
          placeholder="${registro ? "Al menos 8 caracteres" : "Tu contraseña"}"></div>
      <p class="sm" id="ac-error" style="color:var(--bad);margin:-4px 0 12px;min-height:18px"></p>
      <button class="btn block" id="ac-enviar">${registro ? "Crear cuenta y empezar" : "Entrar"}</button>
      <button class="btn ghost block" id="ac-cambiar" style="margin-top:8px">
        ${registro ? "Ya tengo cuenta" : "Todavía no tengo cuenta"}</button>
      ${registro ? "" : `<button class="btn ghost block" id="ac-olvide" style="margin-top:8px">Olvidé mi contraseña</button>`}
      <p class="sm muted" style="margin:14px 0 0">Al crear tu cuenta aceptás los términos y la política de privacidad.
        Tus datos son tuyos: podés descargarlos o borrarlos cuando quieras.</p>
    </div>`;

  const err = m => { document.getElementById("ac-error").textContent = m || ""; };
  const boton = document.getElementById("ac-enviar");

  boton.onclick = async () => {
    const email = document.getElementById("ac-email").value.trim();
    const pass = document.getElementById("ac-pass").value;
    if (!email || !pass) return err("Completá correo y contraseña.");
    if (registro && pass.length < 8) return err("La contraseña necesita al menos 8 caracteres.");
    boton.disabled = true; boton.textContent = "Un segundo..."; err("");
    try {
      const r = registro
        ? await SB.auth.signUp({ email, password: pass })
        : await SB.auth.signInWithPassword({ email, password: pass });
      if (r.error) throw r.error;
      if (registro && !r.data.session) {
        v.innerHTML = `<div class="card pad">
          <p class="eyebrow">Falta un paso</p>
          <h2 style="font-size:23px;font-weight:800;margin:6px 0 8px">Revisá tu correo</h2>
          <p class="sm muted">Te mandamos un enlace a <b>${email}</b>. Tocalo para confirmar tu cuenta y volvé acá.</p>
          </div>`;
        return;
      }
      await iniciarApp();
    } catch (e) {
      err(traducirError(e.message));
      boton.disabled = false;
      boton.textContent = registro ? "Crear cuenta y empezar" : "Entrar";
    }
  };
  document.getElementById("ac-cambiar").onclick = () => mostrarAcceso(registro ? "login" : "registro");
  const olvide = document.getElementById("ac-olvide");
  if (olvide) olvide.onclick = async () => {
    const email = document.getElementById("ac-email").value.trim();
    if (!email) return err("Escribí tu correo primero y volvé a tocar.");
    await SB.auth.resetPasswordForEmail(email, { redirectTo: CONFIG.URL_APP });
    err(""); toast("Te mandamos un correo para recuperar la contraseña.");
  };
}
function traducirError(m) {
  const t = (m || "").toLowerCase();
  if (t.includes("invalid login")) return "El correo o la contraseña no coinciden.";
  if (t.includes("already registered") || t.includes("already exists")) return "Ese correo ya tiene cuenta. Probá entrando.";
  if (t.includes("email not confirmed")) return "Todavía no confirmaste tu correo. Revisá la bandeja de entrada.";
  if (t.includes("rate limit")) return "Demasiados intentos seguidos. Esperá un minuto.";
  if (t.includes("password")) return "La contraseña necesita al menos 8 caracteres.";
  return "No pudimos completar la operación. Probá de nuevo en un momento.";
}

/* ---------- muro de pago ---------- */
function mostrarMuroPago() {
  ocultarApp();
  document.getElementById("v-acceso").hidden = true;
  const v = document.getElementById("v-muro");
  v.hidden = false;
  const a = Cuenta.acceso;
  const titulo = a.motivo === "cancelada" ? "Tu suscripción está cancelada" : "Se terminó tu prueba gratis";
  const bajada = a.motivo === "cancelada"
    ? "Podés volver cuando quieras: tus datos siguen guardados tal cual los dejaste."
    : "Tus rutinas, medidas e historial siguen guardados. Activá la suscripción y seguís donde quedaste.";
  document.getElementById("who").innerHTML =
    `<b>${CONFIG.APP_NOMBRE}</b><small>${Cuenta.usuario ? Cuenta.usuario.email : ""}</small>`;
  document.getElementById("chip").textContent = "Suscripción";
  v.innerHTML = `
    <div class="card pad">
      <p class="eyebrow">${a.motivo === "cancelada" ? "Cuenta sin suscripción" : "Prueba terminada"}</p>
      <h2 style="font-size:25px;font-weight:800;margin:6px 0 8px">${titulo}</h2>
      <p class="sm muted" style="margin:0 0 18px">${bajada}</p>
      <div class="hero" style="box-shadow:none;margin-bottom:16px">
        <p class="eyebrow">Plan mensual</p>
        <h2 style="font-size:32px">$${CONFIG.PRECIO_MENSUAL.toLocaleString("es-AR")}<span
          style="font-family:var(--f-body);font-size:15px;font-weight:400;color:var(--muted)"> por mes</span></h2>
        <ul class="warns" style="margin-top:12px;color:var(--ink-2)">
          <li>Rutina adaptada a tu nivel, tu equipo y tus días</li>
          <li>Evaluación corporal completa con seguimiento de medidas</li>
          <li>Agenda, historial y progresión de cargas sin límite</li>
          <li>Guía de cada ejercicio con ilustración y video</li>
        </ul>
        <p class="sm muted" style="margin:10px 0 0">Se debita automáticamente cada mes. Cancelás cuando quieras,
        desde acá o desde tu cuenta de Mercado Pago.</p>
      </div>
      <p class="sm" id="mu-error" style="color:var(--bad);margin:0 0 10px;min-height:18px"></p>
      <button class="btn block" id="mu-suscribir">Suscribirme con Mercado Pago</button>
      <button class="btn ghost block" id="mu-refrescar" style="margin-top:8px">Ya pagué, actualizar mi estado</button>
      <button class="btn ghost block" id="mu-salir" style="margin-top:8px">Cerrar sesión</button>
    </div>`;

  const err = m => { document.getElementById("mu-error").textContent = m || ""; };
  const b = document.getElementById("mu-suscribir");
  b.onclick = async () => {
    b.disabled = true; b.textContent = "Abriendo Mercado Pago..."; err("");
    try {
      const { data: { session } } = await SB.auth.getSession();
      const r = await fetch("/.netlify/functions/crear-suscripcion", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + session.access_token }
      });
      const j = await r.json();
      if (!r.ok || !j.init_point) throw new Error(j.error || "sin init_point");
      window.location.href = j.init_point;
    } catch (e) {
      err("No pudimos abrir el pago en este momento. Probá de nuevo en un rato.");
      b.disabled = false; b.textContent = "Suscribirme con Mercado Pago";
    }
  };
  document.getElementById("mu-refrescar").onclick = async () => {
    await cargarPerfil();
    if (Cuenta.acceso.permitido) { ocultarPantallasDeCuenta(); await iniciarApp(); }
    else err("Todavía no vemos el pago acreditado. Puede tardar unos minutos.");
  };
  document.getElementById("mu-salir").onclick = cerrarSesion;
}

async function cerrarSesion() {
  await SB.auth.signOut();
  lsBorrar();
  Cuenta.usuario = null; Cuenta.perfil = null; Cuenta.acceso = null;
  S.perfil = null; S.medidas = []; S.cargas = {}; S.sesiones = []; S.activa = null; S.agenda = null;
  mostrarAcceso("login");
}

async function cancelarSuscripcion() {
  const { data: { session } } = await SB.auth.getSession();
  const r = await fetch("/.netlify/functions/cancelar-suscripcion", {
    method: "POST", headers: { "Authorization": "Bearer " + session.access_token }
  });
  if (!r.ok) { toast("No pudimos cancelar ahora. Escribinos y lo resolvemos."); return false; }
  await cargarPerfil();
  toast("Suscripción cancelada. Podés volver cuando quieras.");
  return true;
}

/* Si vuelve de Mercado Pago con ?suscripcion=ok, esperamos a que llegue el webhook. */
async function revisarVueltaDePago() {
  const p = new URLSearchParams(location.search);
  if (!p.has("suscripcion")) return false;
  history.replaceState({}, "", location.pathname);
  for (let i = 0; i < 6; i++) {
    await cargarPerfil();
    if (Cuenta.acceso && Cuenta.acceso.permitido) return true;
    await new Promise(r => setTimeout(r, 2500));
  }
  return false;
}

if (HAY_NUBE) SB.auth.onAuthStateChange((evento) => {
  if (evento === "SIGNED_OUT") mostrarAcceso("login");
});
