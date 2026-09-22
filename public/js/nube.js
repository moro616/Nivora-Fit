"use strict";
/* ============================================================
   nube.js — cuenta, datos y suscripción
   Supabase para auth y base de datos; Mercado Pago para el cobro.
   Todo lo que toca la red pasa por acá.
   ============================================================ */

/* Si todavía no cargaste las claves de Supabase, la app igual funciona:
   guarda todo en el teléfono y no pide cuenta. Sirve para probarla. */
const HAY_NUBE = !!(window.CONFIG && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY && window.supabase);
const SB = HAY_NUBE ? window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

/* Los links de los mails (confirmar cuenta, recuperar contraseña) tienen que
   llevar a la app, que vive en /app/, y no a la landing. */
const urlDeLaApp = () => (CONFIG.URL_APP || location.origin).replace(/\/+$/, "") + "/app/";

const Cuenta = {
  usuario: null,      // { id, email }
  perfil: null,       // fila de la tabla perfiles
  acceso: null,       // { permitido, motivo, diasRestantes }
  sincronizando: false
};

/* ---------- acceso: prueba gratis o suscripción paga ---------- */
function calcularAcceso(fila) {
  if (!fila) return { permitido: false, motivo: "sin-perfil", diasRestantes: 0 };
  if (fila.es_admin) return { permitido: true, motivo: "admin" };
  if (fila.suscripcion_estado === "activa") {
    return { permitido: true, motivo: "suscripcion", proximoCobro: fila.proximo_cobro };
  }
  /* Canceló pero ya había pagado el mes: entra hasta la fecha del cobro que no va a pasar. */
  if (fila.suscripcion_estado === "cancelada" && fila.proximo_cobro && new Date(fila.proximo_cobro) > new Date()) {
    return { permitido: true, motivo: "cancelada-vigente", hasta: fila.proximo_cobro };
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
  try { Cuenta.ultimoUsuario = localStorage.getItem("nivora.usuario"); } catch (e) { /* nada */ }
  /* Datos de otra cuenta en este teléfono: no se mezclan nunca. */
  if (local && Cuenta.ultimoUsuario && Cuenta.ultimoUsuario !== session.user.id) {
    lsBorrar(); restaurar({});
  }
  await cargarPerfil();

  /* El perfil lo crea la base apenas te registrás, pero puede tardar un
     instante. Antes de mostrarle nada a la persona, reintentamos. */
  if (!Cuenta.perfil) await esperarPerfil();

  if (!Cuenta.perfil) { mostrarPreparando(); return; }
  if (!Cuenta.acceso.permitido) { mostrarMuroPago(); return; }

  /* Se juntan los datos de este teléfono con los del servidor: nada se pisa. */
  const remoto = Cuenta.perfil && Cuenta.perfil.datos;
  if (remoto && remoto.updated) {
    const mismoUsuario = local && local.perfil && (!Cuenta.ultimoUsuario || Cuenta.ultimoUsuario === Cuenta.usuario.id);
    restaurar(mismoUsuario ? fusionar(local, remoto) : remoto);
    lsSet();
  }
  aplicarTema();
  ocultarPantallasDeCuenta();
  pintar();
  estadoGuardado(Cuenta.acceso.motivo === "prueba"
    ? `Prueba · ${Cuenta.acceso.diasRestantes} día${Cuenta.acceso.diasRestantes === 1 ? "" : "s"}`
    : Cuenta.acceso.motivo === "admin" ? "Administrador"
    : Cuenta.acceso.motivo === "cancelada-vigente" ? "Activa hasta " + fechaCorta(Cuenta.acceso.hasta.slice(0, 10))
    : "Sincronizado", true);
  if (!remoto || !remoto.updated) await subirEstado();
  else { Cuenta.ultimoUsuario = Cuenta.usuario.id; try { localStorage.setItem("nivora.usuario", Cuenta.usuario.id); } catch (e) { /* nada */ } }
}

async function cargarPerfil() {
  const { data, error } = await SB.from("perfiles").select("*").eq("id", Cuenta.usuario.id).maybeSingle();
  if (error) console.warn("perfil:", error.message);
  Cuenta.perfil = data || null;
  Cuenta.acceso = calcularAcceso(Cuenta.perfil);
  return Cuenta.perfil;
}

/* ---------- guardado ---------- */
let tGuardar = null, pendiente = false;
function guardar(nota) {
  S.updated = Date.now();
  lsSet();
  estadoGuardado(nota || "Guardado");
  pendiente = true;
  clearTimeout(tGuardar);
  tGuardar = setTimeout(subirEstado, 1200);
}

/* Subida segura:
   1. lee lo que hay en el servidor y lo junta con lo de este teléfono;
   2. escribe solo si nadie escribió en el medio (se compara "actualizado");
   3. si otro teléfono escribió justo antes, vuelve a juntar y reintenta.
   forzar: para "Borrar todo", donde lo que se quiere es justamente pisar. */
async function subirEstado(forzar) {
  if (!Cuenta.usuario) return;
  if (Cuenta.sincronizando) { pendiente = true; return; }
  Cuenta.sincronizando = true;
  pendiente = false;
  const uid = Cuenta.usuario.id;
  try {
    for (let intento = 0; intento < 4; intento++) {
      const { data: fila, error: e1 } = await SB.from("perfiles").select("datos, actualizado").eq("id", uid).maybeSingle();
      if (e1) throw e1;
      if (!forzar && fila && fila.datos && fila.datos.updated) {
        const antes = S.sesiones.length + S.medidas.length;
        restaurar(fusionar(snapshot(), fila.datos));
        lsSet();
        if (S.sesiones.length + S.medidas.length !== antes && !S.activa && !S.cardio) pintar();
      }
      let q = SB.from("perfiles").update({ datos: snapshot(true), actualizado: new Date().toISOString() }).eq("id", uid);
      if (fila && fila.actualizado) q = q.eq("actualizado", fila.actualizado);
      const { data, error } = await q.select("id");
      if (error) throw error;
      if (data && data.length) {
        estadoGuardado("Guardado");
        Cuenta.ultimoUsuario = uid;
        try { localStorage.setItem("nivora.usuario", uid); } catch (e) { /* nada */ }
        await sincronizarTablas();
        return;
      }
      await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
    }
    throw new Error("no se pudo guardar sin pisar otro cambio");
  } catch (e) {
    pendiente = true;
    estadoGuardado("Guardado en el teléfono · se sube al volver la señal");
  } finally {
    Cuenta.sincronizando = false;
    if (pendiente) { clearTimeout(tGuardar); tGuardar = setTimeout(subirEstado, 4000); }
  }
}

/* Si se corta la señal o se cierra la app con algo sin subir, se reintenta. */
window.addEventListener("online", () => { if (pendiente) subirEstado(); });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && pendiente && !Cuenta.sincronizando) { clearTimeout(tGuardar); subirEstado(); }
});

/* Además del snapshot, las sesiones y las medidas van a tablas propias:
   sirven para métricas, para exportar y para cualquier consulta SQL posterior. */
async function sincronizarTablas() {
  if (!Cuenta.usuario) return;
  const uid = Cuenta.usuario.id;
  /* La primera vez sube todo el historial; después, lo último. */
  let todo = false;
  try { todo = localStorage.getItem("nivora.tablas") !== "2:" + uid; } catch (e) { /* nada */ }
  const sesiones = (todo ? S.sesiones : S.sesiones.slice(-60)).map(s => ({
    usuario_id: uid, uid: s.id, fecha: s.fecha, bloque: s.bloque, series: s.series || 0,
    minutos: Math.round(s.min || 0), kcal: Math.round(s.kcal || 0), volumen: Math.round(s.volumen || 0),
    km: s.km == null ? null : Number(s.km)
  }));
  const medidas = S.medidas.slice(-60).map(m => {
    const ev = evaluar(S.perfil, m);
    return { usuario_id: uid, fecha: m.fecha, peso: m.peso || null, cuello: m.cuello || null,
      cintura: m.cintura || null, cadera: m.cadera || null, pecho: m.pecho || null,
      brazo: m.brazo || null, muslo: m.muslo || null, pantorrilla: m.pantorrilla || null,
      grasa_pct: ev && ev.grasa != null ? Number(ev.grasa.toFixed(2)) : null };
  });
  for (let i = 0; i < sesiones.length; i += 200) {
    const { error } = await SB.from("sesiones").upsert(sesiones.slice(i, i + 200), { onConflict: "usuario_id,uid" });
    if (error) { console.warn("tabla sesiones:", error.message); return; }
  }
  if (medidas.length) await SB.from("medidas").upsert(medidas, { onConflict: "usuario_id,fecha" });
  try { localStorage.setItem("nivora.tablas", "2:" + uid); } catch (e) { /* nada */ }
}

/* Reintenta un rato: tres vueltas, un segundo y medio entre cada una. */
async function esperarPerfil(vueltas) {
  for (let i = 0; i < (vueltas || 3); i++) {
    await new Promise(r => setTimeout(r, 1500));
    await cargarPerfil();
    if (Cuenta.perfil) return Cuenta.perfil;
  }
  return null;
}

/* ---------- la cuenta existe pero todavía no tiene perfil ----------
   No es que se venció una prueba: es que algo no terminó de crearse.
   Decirle "se terminó tu prueba gratis" a alguien que se registró recién
   es la peor manera de recibirlo. */
function mostrarPreparando() {
  ocultarApp();
  document.getElementById("v-acceso").hidden = true;
  const v = document.getElementById("v-muro");
  v.hidden = false;
  document.getElementById("who").innerHTML =
    `<b>${CONFIG.APP_NOMBRE}</b><small>${Cuenta.usuario ? Cuenta.usuario.email : ""}</small>`;
  document.getElementById("chip").textContent = "Preparando";
  v.innerHTML = `
    <div class="card pad">
      <p class="eyebrow">Un momento</p>
      <h2 style="font-size:25px;font-weight:800;margin:6px 0 8px">Estamos preparando tu cuenta</h2>
      <p class="sm muted" style="margin:0 0 18px">Tu cuenta quedó creada, pero todavía estamos
      terminando de armar tu perfil. Probá de nuevo en unos segundos; si sigue igual,
      escribinos y lo resolvemos enseguida.</p>
      <button class="btn block" id="pr-reintentar">Reintentar</button>
      <button class="btn ghost block" id="pr-salir" style="margin-top:8px">Cerrar sesión</button>
    </div>`;
  const b = document.getElementById("pr-reintentar");
  b.onclick = async () => {
    b.disabled = true; b.textContent = "Probando...";
    await esperarPerfil(2);
    b.disabled = false; b.textContent = "Reintentar";
    if (Cuenta.perfil) { ocultarPantallasDeCuenta(); await iniciarApp(); }
    else toast("Todavía no está lista. Esperá unos segundos más.");
  };
  document.getElementById("pr-salir").onclick = cerrarSesion;
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
        <div class="pass-caja">
          <input id="ac-pass" type="password" autocomplete="${registro ? "new-password" : "current-password"}"
            placeholder="${registro ? "Al menos 8 caracteres" : "Tu contraseña"}">
          <button type="button" class="pass-ver" id="ac-ver" aria-label="Mostrar contraseña" aria-pressed="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path class="tacha" d="M4 4l16 16"/></svg>
          </button>
        </div></div>
      ${registro ? `<label class="consentimiento" style="margin:0 0 12px">
        <input type="checkbox" id="ac-acepto">
        <span>Acepto los <a href="/terminos/" target="_blank" rel="noopener">términos y condiciones</a> y la
        <a href="/privacidad/" target="_blank" rel="noopener">política de privacidad</a>, y doy mi consentimiento
        para que se usen mis datos de salud (peso, medidas y molestias) para armar mi entrenamiento.</span>
      </label>` : ""}
      <p class="sm" id="ac-error" style="color:var(--bad);margin:-4px 0 12px;min-height:18px"></p>
      <button class="btn block" id="ac-enviar">${registro ? "Crear cuenta y empezar" : "Entrar"}</button>
      <button class="btn ghost block" id="ac-cambiar" style="margin-top:8px">
        ${registro ? "Ya tengo cuenta" : "Todavía no tengo cuenta"}</button>
      ${registro ? "" : `<button class="btn ghost block" id="ac-olvide" style="margin-top:8px">Olvidé mi contraseña</button>`}
      ${registro ? "" : `<p class="sm muted" style="margin:14px 0 0">
        <a href="/terminos/" target="_blank" rel="noopener">Términos</a> ·
        <a href="/privacidad/" target="_blank" rel="noopener">Privacidad</a></p>`}

    </div>`;

  const err = m => { document.getElementById("ac-error").textContent = m || ""; };
  const ver = document.getElementById("ac-ver");
  ver.onclick = () => {
    const i = document.getElementById("ac-pass");
    const mostrar = i.type === "password";
    i.type = mostrar ? "text" : "password";
    ver.setAttribute("aria-pressed", mostrar);
    ver.setAttribute("aria-label", mostrar ? "Ocultar contraseña" : "Mostrar contraseña");
    i.focus();
  };
  const boton = document.getElementById("ac-enviar");

  boton.onclick = async () => {
    const email = document.getElementById("ac-email").value.trim();
    const pass = document.getElementById("ac-pass").value;
    if (!email || !pass) return err("Completá correo y contraseña.");
    if (registro && pass.length < 8) return err("La contraseña necesita al menos 8 caracteres.");
    if (registro && !document.getElementById("ac-acepto").checked) return err("Para crear la cuenta tenés que aceptar los términos y la política de privacidad.");
    boton.disabled = true; boton.textContent = "Un segundo..."; err("");
    try {
      const r = registro
        ? await SB.auth.signUp({ email, password: pass, options: { emailRedirectTo: urlDeLaApp() } })
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
    await SB.auth.resetPasswordForEmail(email, { redirectTo: urlDeLaApp() });
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
  if (a.motivo === "sin-perfil") return mostrarPreparando();
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
      <div class="field" style="margin:0 0 12px"><label for="mp-email">Mail de tu cuenta de Mercado Pago <small>tiene que ser el mismo con el que entrás a Mercado Pago</small></label>
        <input id="mp-email" type="email" inputmode="email" autocomplete="email" value="${esc((Cuenta.usuario && Cuenta.usuario.email) || "")}"></div>
      <button class="btn block" id="mu-suscribir">Suscribirme con Mercado Pago</button>
      <button class="btn ghost block" id="mu-refrescar" style="margin-top:8px">Ya pagué, actualizar mi estado</button>
      <button class="btn ghost block" id="mu-salir" style="margin-top:8px">Cerrar sesión</button>
    </div>`;

  const err = m => { document.getElementById("mu-error").textContent = m || ""; };
  const b = document.getElementById("mu-suscribir");
  b.onclick = () => irAPagar(b, document.getElementById("mu-error"));
  document.getElementById("mu-refrescar").onclick = async () => {
    await cargarPerfil();
    if (Cuenta.acceso.permitido) { ocultarPantallasDeCuenta(); await iniciarApp(); }
    else err("Todavía no vemos el pago acreditado. Puede tardar unos minutos.");
  };
  document.getElementById("mu-salir").onclick = cerrarSesion;
}

async function cerrarSesion() {
  clearTimeout(tGuardar);
  if (pendiente) { try { await subirEstado(); } catch (e) { /* nada */ } }
  await SB.auth.signOut();
  lsBorrar();
  try { localStorage.removeItem("nivora.usuario"); localStorage.removeItem("nivora.rutas"); localStorage.removeItem("nivora.tablas"); } catch (e) { /* nada */ }
  Cuenta.usuario = null; Cuenta.perfil = null; Cuenta.acceso = null;
  S.perfil = null; S.medidas = []; S.cargas = {}; S.sesiones = []; S.activa = null; S.agenda = null; S.cardio = null;
  if (typeof pararGPS === "function") pararGPS();
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
