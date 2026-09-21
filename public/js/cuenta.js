"use strict";
/* ============================================================
   cuenta.js — el menú del avatar
   Mi perfil (con foto), mi entrenamiento, suscripción y pagos,
   apariencia y la salida. Cada sección abre su propia hoja.
   ============================================================ */

function avatarHTML(p, clase) {
  if (p && p.foto) return `<img class="${clase || ""}" src="${p.foto}" alt="">`;
  return esc(iniciales(p && p.nombre));
}

function textoPlan() {
  const a = Cuenta.acceso;
  if (!HAY_NUBE || !Cuenta.usuario || !a) return { txt: "Guardado solo en este teléfono", tono: "" };
  if (a.motivo === "prueba") return { txt: `Prueba gratis · ${a.diasRestantes} día${a.diasRestantes === 1 ? "" : "s"}`, tono: "aviso" };
  if (a.motivo === "suscripcion") return { txt: "Suscripción activa", tono: "bien" };
  if (a.motivo === "admin") return { txt: "Administrador · acceso sin cargo", tono: "bien" };
  if (a.motivo === "cancelada-vigente") return { txt: "Cancelada · activa hasta " + fechaCorta(a.hasta.slice(0, 10)), tono: "aviso" };
  return { txt: "Sin suscripción", tono: "bad" };
}

function filaMenu(id, titulo, detalle, ico) {
  return `<button class="menu-fila" id="${id}">
    <span class="menu-ico" aria-hidden="true">${ico}</span>
    <span class="menu-txt"><b>${esc(titulo)}</b>${detalle ? `<small>${esc(detalle)}</small>` : ""}</span>
    <span class="menu-flecha" aria-hidden="true">›</span></button>`;
}

const ICO = {
  perfil: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>`,
  entreno: `<svg viewBox="0 0 24 24"><path d="M6.5 9v6M17.5 9v6M4 10.5v3M20 10.5v3M6.5 12h11"/></svg>`,
  pago: `<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>`,
  tema: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>`,
  bajar: `<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/></svg>`,
  pdf: `<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>`,
  cel: `<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>`
};

/* ---------- el menú principal ---------- */
function abrirAjustes() {
  if (!S.perfil) return;
  const p = S.perfil;
  const plan = textoPlan();
  const conCuenta = HAY_NUBE && Cuenta.usuario;
  const inst = Instalar.estado();

  abrirSheet(`
    <div class="sheet-head"><h3>Tu cuenta</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>

    <div class="cuenta-cab">
      <button class="foto-grande" id="cu-foto" aria-label="Cambiar foto de perfil">
        ${avatarHTML(p)}<span class="foto-edit" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>
      </button>
      <div class="cuenta-quien">
        <b>${esc(p.nombre || "Sin nombre")}</b>
        <small>${esc(conCuenta ? Cuenta.usuario.email : "Sin cuenta")}</small>
        <span class="plan-chip t-${plan.tono}">${esc(plan.txt)}</span>
      </div>
    </div>

    <div class="menu">
      ${filaMenu("cu-perfil", "Datos personales", "Nombre, contacto, fecha de nacimiento, altura", ICO.perfil)}
      ${filaMenu("cu-entreno", "Mi entrenamiento", `${(OBJETIVOS[p.objetivo] || {}).nombre} · ${p.dias || 3} días · ${(NIVELES[p.nivel] || {}).nombre}`, ICO.entreno)}
      ${conCuenta ? filaMenu("cu-pagos", "Suscripción y pagos", "Estado, comprobantes y baja", ICO.pago) : ""}
    </div>

    <label class="lbl" style="margin-top:18px">Apariencia</label>
    <div class="segmento" id="cu-tema">${[["auto", "Automático"], ["oscuro", "Oscuro"], ["claro", "Claro"]].map(([id, n]) =>
      `<button type="button" class="${Tema.leer() === id ? "activo" : ""}" data-v="${id}">${esc(n)}</button>`).join("")}</div>

    <div class="menu" style="margin-top:18px">
      ${inst === "boton" || inst === "ios" || inst === "ios-otro-navegador" ? filaMenu("aj-instalar", "Instalar en el teléfono", "Abre al toque y anda sin señal", ICO.cel) : ""}
      ${filaMenu("cu-informe", "Descargar mi informe", "PDF con tu evaluación, actividad y marcas", ICO.pdf)}
      ${filaMenu("cu-exportar", "Copia de seguridad", "Archivo técnico con todos tus datos", ICO.bajar)}
    </div>

    <button class="btn block" id="cu-volver" style="margin-top:18px">Volver a la app</button>
    ${conCuenta ? `<button class="btn ghost block" id="cu-salir" style="margin-top:8px">Cerrar sesión</button>` : ""}
    <button class="btn ghost block peligro" id="cu-borrar" style="margin-top:8px">Borrar todo y empezar de cero</button>
    <p class="sm muted" style="margin:16px 0 0">Nivora Fit te da estimaciones y una rutina general.
    No reemplaza a un médico, un nutricionista ni un profesor. Si algo te duele, pará y consultá.</p>`);

  document.getElementById("cu-volver").onclick = () => cerrarSheet();
  document.getElementById("cu-foto").onclick = elegirFoto;
  document.getElementById("cu-perfil").onclick = hojaDatos;
  document.getElementById("cu-entreno").onclick = hojaEntreno;
  const pg = document.getElementById("cu-pagos");
  if (pg) pg.onclick = hojaPagos;
  document.querySelectorAll("#cu-tema button").forEach(b => b.onclick = () => {
    Tema.fijar(b.dataset.v);
    S.perfil.tema = b.dataset.v;
    aplicarTema();
    document.querySelectorAll("#cu-tema button").forEach(o => o.classList.toggle("activo", o === b));
  });
  const bi = document.getElementById("aj-instalar");
  if (bi) bi.onclick = () => { cerrarSheet(); pedirInstalacion(); };
  const inf = document.getElementById("cu-informe");
  inf.onclick = () => descargarInforme(inf);
  document.getElementById("cu-exportar").onclick = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nivora-fit-copia-" + hoyISO() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const salir = document.getElementById("cu-salir");
  if (salir) salir.onclick = () => { cerrarSheet(); cerrarSesion(); };
  document.getElementById("cu-borrar").onclick = () => {
    if (!confirm("Esto borra tu perfil, tus medidas y todo tu historial. ¿Seguro?")) return;
    S.perfil = null; S.medidas = []; S.cargas = {}; S.sesiones = []; S.activa = null; S.agenda = null; S.cardio = null;
    borrador = null; paso = 0;
    lsBorrar(); guardar("Datos borrados");
    cerrarSheet(); pintar();
  };
}

/* ---------- foto de perfil ----------
   Se achica a 256 px en el teléfono antes de guardarla: queda en unos
   20 KB, viaja con el resto del perfil y no hace falta un bucket aparte. */
function elegirFoto() {
  const input = document.getElementById("photo-input");
  input.value = "";
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) return toast("Elegí una imagen.");
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const lado = 256, c = document.createElement("canvas");
      c.width = c.height = lado;
      const m = Math.min(img.width, img.height);
      c.getContext("2d").drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
      URL.revokeObjectURL(url);
      S.perfil.foto = c.toDataURL("image/jpeg", 0.82);
      guardar("Foto guardada");
      pintarCabecera();
      abrirAjustes();
      toast("Foto actualizada.");
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast("No pudimos leer esa imagen."); };
    img.src = url;
  };
  input.click();
}

/* ---------- datos personales ---------- */
function hojaDatos() {
  const p = S.perfil;
  abrirSheet(`
    <div class="sheet-head"><button class="xbtn" id="volver" aria-label="Volver">‹</button>
      <h3>Datos personales</h3><button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>

    <div class="field"><label for="dp-nombre">Nombre y apellido</label>
      <input id="dp-nombre" value="${esc(p.nombre || "")}" autocomplete="name"></div>
    ${HAY_NUBE && Cuenta.usuario ? `<div class="field"><label for="dp-mail">Correo <small>es el de tu cuenta, no se cambia desde acá</small></label>
      <input id="dp-mail" value="${esc(Cuenta.usuario.email)}" disabled></div>` : ""}
    <div class="field"><label for="dp-tel">Teléfono <small>opcional</small></label>
      <input id="dp-tel" type="tel" inputmode="tel" value="${esc(p.telefono || "")}" placeholder="341 555 1234" autocomplete="tel"></div>
    <div class="dos">
      <div class="field"><label for="dp-nac">Fecha de nacimiento</label>
        <input id="dp-nac" type="date" value="${esc(p.nacimiento || "")}" max="${hoyISO()}"></div>
      <div class="field"><label for="dp-alt">Altura (cm)</label>
        <input id="dp-alt" type="number" inputmode="decimal" value="${p.altura || ""}"></div>
    </div>
    <label class="lbl">Sexo biológico <small>cambia las fórmulas de grasa y calorías</small></label>
    <div class="segmento" id="dp-sexo">${[["hombre", "Hombre"], ["mujer", "Mujer"]].map(([id, n]) =>
      `<button type="button" class="${p.sexo === id ? "activo" : ""}" data-v="${id}">${n}</button>`).join("")}</div>
    <div class="field" style="margin-top:14px"><label for="dp-ciudad">Ciudad <small>opcional</small></label>
      <input id="dp-ciudad" value="${esc(p.ciudad || "")}" autocomplete="address-level2"></div>

    <button class="btn block" id="dp-guardar" style="margin-top:6px">Guardar</button>`);

  let sexo = p.sexo;
  document.querySelectorAll("#dp-sexo button").forEach(b => b.onclick = () => {
    sexo = b.dataset.v;
    document.querySelectorAll("#dp-sexo button").forEach(o => o.classList.toggle("activo", o === b));
  });
  document.getElementById("volver").onclick = abrirAjustes;
  document.getElementById("dp-guardar").onclick = () => {
    const alt = num(document.getElementById("dp-alt").value, p.altura);
    if (!alt || alt < 120 || alt > 230) return toast("Revisá la altura en centímetros.");
    p.nombre = document.getElementById("dp-nombre").value.trim() || p.nombre;
    p.telefono = document.getElementById("dp-tel").value.trim();
    p.nacimiento = document.getElementById("dp-nac").value || p.nacimiento;
    p.ciudad = document.getElementById("dp-ciudad").value.trim();
    p.altura = alt;
    p.sexo = sexo;
    guardar("Datos guardados");
    pintar();
    abrirAjustes();
    toast("Datos guardados.");
  };
}

/* ---------- mi entrenamiento ---------- */
function hojaEntreno() {
  const p = S.perfil;
  const opts = (id, lista, actual) => `<div class="ops" id="${id}">${lista.map(([v, n, d]) =>
    `<button type="button" class="op${actual === v ? " activo" : ""}" data-v="${v}"><b>${esc(n)}</b>${d ? `<small>${esc(d)}</small>` : ""}</button>`).join("")}</div>`;

  abrirSheet(`
    <div class="sheet-head"><button class="xbtn" id="volver" aria-label="Volver">‹</button>
      <h3>Mi entrenamiento</h3><button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>

    <label class="lbl">Días por semana</label>
    <div class="segmento" id="me-dias">${[2, 3, 4, 5, 6].map(d =>
      `<button type="button" class="${(p.dias || 3) === d ? "activo" : ""}" data-v="${d}">${d}</button>`).join("")}</div>

    <label class="lbl" style="margin-top:16px">Objetivo</label>
    ${opts("me-obj", Object.entries(OBJETIVOS).map(([id, o]) => [id, o.nombre, `${o.reps[0]}–${o.reps[1]} reps · descanso ${o.descanso}″`]), p.objetivo)}

    <label class="lbl" style="margin-top:16px">Nivel</label>
    ${opts("me-niv", Object.entries(NIVELES).map(([id, n]) => [id, n.nombre, n.desc]), p.nivel)}

    <label class="lbl" style="margin-top:16px">Dónde entrenás</label>
    ${opts("me-eq", Object.entries(EQUIPO).map(([id, e]) => [id, e.nombre]), p.equipo)}

    <label class="lbl" style="margin-top:16px">Molestias a cuidar</label>
    <div class="chips" id="me-lim">${Object.entries(LIMITACIONES).map(([id, l]) =>
      `<button type="button" class="chipx${(p.limitaciones || []).includes(id) ? " activo" : ""}" data-v="${id}">${esc(l.nombre)}</button>`).join("")}</div>

    <button class="btn block" id="me-guardar" style="margin-top:20px">Guardar</button>`);

  const elegidos = { dias: p.dias || 3, objetivo: p.objetivo, nivel: p.nivel, equipo: p.equipo };
  const unico = (caja, campo, conv) => document.querySelectorAll(`#${caja} button`).forEach(b => b.onclick = () => {
    elegidos[campo] = conv ? conv(b.dataset.v) : b.dataset.v;
    document.querySelectorAll(`#${caja} button`).forEach(o => o.classList.toggle("activo", o === b));
  });
  unico("me-dias", "dias", Number); unico("me-obj", "objetivo"); unico("me-niv", "nivel"); unico("me-eq", "equipo");
  const lims = new Set(p.limitaciones || []);
  document.querySelectorAll("#me-lim button").forEach(b => b.onclick = () => {
    if (lims.has(b.dataset.v)) lims.delete(b.dataset.v); else lims.add(b.dataset.v);
    b.classList.toggle("activo");
  });
  document.getElementById("volver").onclick = abrirAjustes;
  document.getElementById("me-guardar").onclick = () => {
    const antes = JSON.stringify([p.objetivo, p.nivel, p.equipo, p.dias, p.limitaciones || []]);
    Object.assign(p, elegidos);
    p.limitaciones = [...lims];
    if (antes !== JSON.stringify([p.objetivo, p.nivel, p.equipo, p.dias, p.limitaciones]) && !S.activa) S.agenda = null;
    guardar("Ajustes guardados");
    pintar();
    abrirAjustes();
    toast("Listo. La próxima rutina ya viene con esto.");
  };
}

/* ---------- suscripción y pagos ---------- */
const ESTADO_PAGO = {
  approved: ["Aprobado", "bien"], authorized: ["Autorizada", "bien"], accredited: ["Acreditado", "bien"],
  pending: ["Pendiente", "aviso"], in_process: ["En proceso", "aviso"], paused: ["Pausada", "aviso"],
  rejected: ["Rechazado", "bad"], cancelled: ["Cancelado", ""], refunded: ["Devuelto", ""], charged_back: ["Contracargo", "bad"]
};

async function hojaPagos() {
  const a = Cuenta.acceso || {};
  const f = Cuenta.perfil || {};
  const plan = textoPlan();
  const precio = "$" + Number(CONFIG.PRECIO_MENSUAL).toLocaleString("es-AR");
  const activa = a.motivo === "suscripcion";
  const admin = a.motivo === "admin";

  abrirSheet(`
    <div class="sheet-head"><button class="xbtn" id="volver" aria-label="Volver">‹</button>
      <h3>Suscripción y pagos</h3><button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>

    <div class="plan-caja">
      <span class="plan-chip t-${plan.tono}">${esc(plan.txt)}</span>
      <p class="plan-precio">${precio}<span> por mes</span></p>
      <p class="sm muted" style="margin:0">${
        admin ? "Tu cuenta es de administrador: tenés acceso completo sin cargo y no se te cobra nada."
        : activa && f.proximo_cobro ? `Próximo débito el ${fechaLarga(f.proximo_cobro)} con Mercado Pago.`
        : a.motivo === "prueba" ? `Tu prueba termina el ${fechaLarga(f.trial_fin)}. Si te suscribís ahora, no perdés los días que te quedan: el primer débito es al terminar la prueba.`
        : a.motivo === "cancelada-vigente" ? `No se te va a volver a cobrar. Podés usar la app hasta el ${fechaLarga(a.hasta)}.`
        : "Débito automático mensual con Mercado Pago. Cancelás cuando quieras."}</p>
    </div>

    ${activa || admin ? "" : `<button class="btn block" id="pg-suscribir" style="margin-top:14px">Suscribirme con Mercado Pago</button>`}
    <p class="sm" id="pg-error" style="color:var(--bad);margin:8px 0 0;min-height:1px"></p>

    <label class="lbl" style="margin-top:14px">Comprobantes</label>
    <div class="exlist" id="pg-lista"><p class="vacio chico">Cargando…</p></div>

    ${activa ? `<button class="btn ghost block peligro" id="pg-cancelar" style="margin-top:20px">Darme de baja</button>
      <p class="sm muted" style="margin:8px 0 0">Se cancela el débito automático. Seguís teniendo acceso hasta el final del mes que ya pagaste.</p>` : ""}`);

  document.getElementById("volver").onclick = abrirAjustes;
  const sus = document.getElementById("pg-suscribir");
  if (sus) sus.onclick = () => irAPagar(sus, document.getElementById("pg-error"));
  const can = document.getElementById("pg-cancelar");
  if (can) can.onclick = async () => {
    if (!confirm("¿Te das de baja? No se te va a cobrar más y seguís usando la app hasta el final del período que ya pagaste.")) return;
    can.disabled = true; can.textContent = "Cancelando…";
    if (await cancelarSuscripcion()) { pintarCabeceraPlan(); hojaPagos(); }
    else { can.disabled = false; can.textContent = "Darme de baja"; }
  };

  const lista = document.getElementById("pg-lista");
  try {
    const { data, error } = await SB.from("pagos")
      .select("id, creado, monto, moneda, estado, tipo, mp_id")
      .order("creado", { ascending: false }).limit(24);
    if (error) throw error;
    const pagos = (data || []).filter(x => x.tipo !== "suscripcion" || x.estado === "authorized");
    if (!document.getElementById("pg-lista")) return;
    if (!pagos.length) {
      lista.innerHTML = `<p class="vacio chico">Todavía no hay pagos. Cuando Mercado Pago te debite, el comprobante aparece acá.</p>`;
      return;
    }
    lista.innerHTML = pagos.map(x => {
      const [txt, tono] = ESTADO_PAGO[x.estado] || [x.estado || "—", ""];
      return `<button class="exrow" data-pago="${x.id}">
        <span class="exnum mini">${esc(fechaCorta(x.creado.slice(0, 10)).split(" ")[0])}</span>
        <span class="extxt"><b>${x.monto != null ? "$" + Number(x.monto).toLocaleString("es-AR") : (x.tipo === "suscripcion" ? "Alta de suscripción" : "Pago")}</b>
          <small class="t-${tono}">${esc(txt)} · ${esc(fechaCorta(x.creado.slice(0, 10)))}</small></span>
        <span class="exver">ver</span></button>`;
    }).join("");
    lista.querySelectorAll("[data-pago]").forEach(b => b.onclick = () =>
      comprobante(pagos.find(x => String(x.id) === b.dataset.pago)));
  } catch (e) {
    lista.innerHTML = `<p class="vacio chico">No pudimos traer los comprobantes ahora. Probá en un rato.</p>`;
  }
}

function comprobante(x) {
  const [txt, tono] = ESTADO_PAGO[x.estado] || [x.estado || "—", ""];
  const nro = (x.mp_id || "").replace(/^preapproval-/, "").replace(/-[a-z_]+$/, "");
  abrirSheet(`
    <div class="sheet-head"><button class="xbtn" id="volver" aria-label="Volver">‹</button>
      <h3>Comprobante</h3><button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="recibo" id="recibo">
      <p class="recibo-marca">${esc(CONFIG.APP_NOMBRE)}</p>
      <p class="recibo-monto">${x.monto != null ? "$" + Number(x.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 }) : "—"}</p>
      <p class="t-${tono}" style="margin:0 0 14px;font-weight:600">${esc(txt)}</p>
      <dl>
        <div><dt>Fecha</dt><dd>${esc(new Date(x.creado).toLocaleString("es-AR", { dateStyle: "long", timeStyle: "short" }))}</dd></div>
        <div><dt>Concepto</dt><dd>Plan mensual ${esc(CONFIG.APP_NOMBRE)}</dd></div>
        <div><dt>Medio</dt><dd>Mercado Pago · débito automático</dd></div>
        ${nro ? `<div><dt>N.º de operación</dt><dd>${esc(nro)}</dd></div>` : ""}
        <div><dt>Cuenta</dt><dd>${esc(Cuenta.usuario.email)}</dd></div>
      </dl>
    </div>
    <button class="btn block" id="rc-imprimir" style="margin-top:14px">Guardar o imprimir</button>
    <p class="sm muted" style="margin:10px 0 0">El comprobante fiscal lo emite Mercado Pago y también está en tu cuenta de Mercado Pago, en Actividad.</p>`);
  document.getElementById("volver").onclick = hojaPagos;
  document.getElementById("rc-imprimir").onclick = () => {
    const w = window.open("", "_blank");
    if (!w) return toast("Tu navegador bloqueó la ventana. Probá con captura de pantalla.");
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Comprobante ${esc(nro)}</title>
      <style>body{font-family:system-ui,sans-serif;max-width:420px;margin:40px auto;padding:0 20px;color:#111}
      dl div{display:flex;justify-content:space-between;gap:20px;border-top:1px solid #ddd;padding:10px 0}
      dt{color:#666}dd{margin:0;text-align:right}.m{font-size:34px;font-weight:800;margin:6px 0}</style>
      <p><b>${esc(CONFIG.APP_NOMBRE)}</b></p><p class="m">${x.monto != null ? "$" + Number(x.monto).toLocaleString("es-AR", { minimumFractionDigits: 2 }) : "—"}</p>
      <p>${esc(txt)}</p>${document.querySelector("#recibo dl").outerHTML}
      <script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
  };
}

function fechaLarga(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long" });
}

function pintarCabeceraPlan() {
  if (Cuenta.acceso && Cuenta.acceso.motivo === "cancelada-vigente")
    estadoGuardado("Activa hasta " + fechaCorta(Cuenta.acceso.hasta.slice(0, 10)));
}

/* Abre el checkout de Mercado Pago. Lo usan el muro y la hoja de pagos. */
async function irAPagar(boton, cajaError) {
  const txt = boton.textContent;
  boton.disabled = true; boton.textContent = "Abriendo Mercado Pago…";
  if (cajaError) cajaError.textContent = "";
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
    if (cajaError) cajaError.textContent = "No pudimos abrir el pago en este momento. Probá de nuevo en un rato.";
    boton.disabled = false; boton.textContent = txt;
  }
}
