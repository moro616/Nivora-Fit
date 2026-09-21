"use strict";
/* ============================================================
   admin.js — panel de administrador (solo cuentas con es_admin)
   Los números los calcula el servidor; acá solo se muestran.
   ============================================================ */

const Admin = { datos: null, filtro: "todos", busqueda: "" };

const ESTADO_ADMIN = {
  prueba: ["En prueba", "aviso"], activa: ["Paga", "bien"], vencida: ["Prueba vencida", "bad"],
  cancelada: ["Dada de baja", ""], "cancelada-vigente": ["Baja · aún activa", "aviso"],
  pausada: ["Pausada", "aviso"], admin: ["Admin", ""]
};

const pesos = n => "$" + Math.round(n || 0).toLocaleString("es-AR");

async function llamarAdmin(metodo, cuerpo) {
  const { data: { session } } = await SB.auth.getSession();
  const r = await fetch("/.netlify/functions/admin", {
    method: metodo,
    headers: { "Authorization": "Bearer " + session.access_token, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "http-" + r.status);
  return j;
}

async function abrirPanelAdmin() {
  abrirSheet(`
    <div class="sheet-head"><button class="xbtn" id="volver" aria-label="Volver">‹</button>
      <h3>Panel de administrador</h3><button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div id="adm-cuerpo"><p class="vacio chico">Cargando los números…</p></div>`);
  document.getElementById("volver").onclick = abrirAjustes;
  try {
    Admin.datos = await llamarAdmin("GET");
    pintarAdmin();
  } catch (e) {
    const c = document.getElementById("adm-cuerpo");
    if (c) c.innerHTML = `<p class="vacio chico">No se pudieron traer los datos (${esc(e.message)}).</p>`;
  }
}

function pintarAdmin() {
  const c = document.getElementById("adm-cuerpo");
  if (!c || !Admin.datos) return;
  const { numeros: n, meses, usuarios, generado } = Admin.datos;
  const max = Math.max(1, ...meses.map(m => m.monto));

  c.innerHTML = `
    <div class="adm-kpis">
      <div class="adm-kpi grande"><span>Ingreso mensual recurrente</span><b>${pesos(n.mrr)}</b>
        <small>${n.activas} ${n.activas === 1 ? "suscripción activa" : "suscripciones activas"}</small></div>
      <div class="adm-kpi"><span>Usuarios</span><b>${n.usuarios}</b><small>+${n.nuevos7} esta semana</small></div>
      <div class="adm-kpi"><span>En prueba</span><b>${n.prueba}</b><small>${n.vencidas} vencidas sin pagar</small></div>
      <div class="adm-kpi"><span>Conversión</span><b>${n.conversion == null ? "—" : n.conversion + "%"}</b><small>de prueba a pago</small></div>
      <div class="adm-kpi"><span>Cobrado este mes</span><b>${pesos(n.ingresosMes)}</b><small>${n.bajasMes} ${n.bajasMes === 1 ? "baja" : "bajas"} este mes</small></div>
      <div class="adm-kpi"><span>Activos</span><b>${n.activos7}</b><small>entrenaron en 7 días</small></div>
      <div class="adm-kpi"><span>Bajas</span><b>${n.canceladas + n.canceladasVigentes}</b><small>${n.canceladasVigentes} todavía con acceso</small></div>
    </div>

    <section class="card pad panel-bloque">
      <div class="graf-head"><h3 class="graf-tit">Cobrado por mes</h3><span class="delta">últimos 6 meses</span></div>
      <svg class="barras" viewBox="0 0 340 140" role="img" aria-label="Ingresos de los últimos seis meses">
        ${meses.map((m, i) => {
          const paso = 340 / meses.length, ancho = paso * 0.56, h = (m.monto / max) * 96;
          const x = i * paso + (paso - ancho) / 2;
          return `${m.monto ? `<rect class="b-gym${i === meses.length - 1 ? "" : " tenue"}" x="${x}" y="${118 - h}" width="${ancho}" height="${h}" rx="5"/>
            <text class="b-val" x="${x + ancho / 2}" y="${113 - h}">${m.monto >= 1000 ? Math.round(m.monto / 1000) + "k" : m.monto}</text>`
            : `<rect class="b-vacia" x="${x}" y="115" width="${ancho}" height="3" rx="1.5"/>`}
            <text class="b-eje" x="${x + ancho / 2}" y="134">${esc(m.nombre)}</text>`;
        }).join("")}
      </svg>
    </section>

    <label class="lbl" style="margin-top:18px">Usuarios</label>
    <div class="field" style="margin-bottom:8px"><input id="adm-buscar" type="search" placeholder="Buscar por nombre o correo" value="${esc(Admin.busqueda)}"></div>
    <div class="chips" id="adm-filtros">${[["todos", "Todos"], ["prueba", "En prueba"], ["activa", "Pagan"], ["vencida", "Vencidas"], ["baja", "Bajas"]].map(([id, t]) =>
      `<button class="chipx${Admin.filtro === id ? " activo" : ""}" data-f="${id}">${t}</button>`).join("")}</div>
    <div class="exlist" id="adm-lista"></div>
    <p class="sm muted" style="margin:12px 0 0">Actualizado ${new Date(generado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}.
      Los cobros salen de lo que avisa Mercado Pago.</p>`;

  document.getElementById("adm-buscar").oninput = e => { Admin.busqueda = e.target.value; pintarListaAdmin(); };
  document.querySelectorAll("#adm-filtros [data-f]").forEach(b => b.onclick = () => {
    Admin.filtro = b.dataset.f;
    document.querySelectorAll("#adm-filtros [data-f]").forEach(o => o.classList.toggle("activo", o === b));
    pintarListaAdmin();
  });
  pintarListaAdmin();
}

function pintarListaAdmin() {
  const lista = document.getElementById("adm-lista");
  if (!lista) return;
  const q = Admin.busqueda.trim().toLowerCase();
  const us = Admin.datos.usuarios.filter(u =>
    (Admin.filtro === "todos" || u.estado === Admin.filtro || (Admin.filtro === "baja" && u.estado.startsWith("cancelada"))) &&
    (!q || (u.email || "").toLowerCase().includes(q) || (u.nombre || "").toLowerCase().includes(q)));
  if (!us.length) { lista.innerHTML = `<p class="vacio chico">No hay usuarios con ese filtro.</p>`; return; }
  lista.innerHTML = us.slice(0, 200).map(u => {
    const [txt, tono] = ESTADO_ADMIN[u.estado] || [u.estado, ""];
    return `<button class="exrow" data-u="${u.id}">
      <span class="extxt"><b>${esc(u.nombre || u.email)}</b>
        <small>${u.nombre ? esc(u.email) + " · " : ""}${u.entrenos} entrenos${u.ultimo ? " · último " + esc(diaRelativo(u.ultimo)) : ""}</small></span>
      <span class="adm-estado t-${tono}">${esc(txt)}</span></button>`;
  }).join("");
  lista.querySelectorAll("[data-u]").forEach(b => b.onclick = () => fichaUsuarioAdmin(b.dataset.u));
}

function fichaUsuarioAdmin(id) {
  const u = Admin.datos.usuarios.find(x => x.id === id);
  if (!u) return;
  const [txt, tono] = ESTADO_ADMIN[u.estado] || [u.estado, ""];
  const f = x => x ? new Date(x).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "—";
  abrirSheet(`
    <div class="sheet-head"><button class="xbtn" id="volver" aria-label="Volver">‹</button>
      <h3>${esc(u.nombre || "Usuario")}</h3><button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="recibo" style="text-align:left">
      <dl>
        <div><dt>Correo</dt><dd>${esc(u.email)}</dd></div>
        <div><dt>Estado</dt><dd class="t-${tono}">${esc(txt)}</dd></div>
        <div><dt>Alta</dt><dd>${f(u.creado)}</dd></div>
        <div><dt>Fin de la prueba</dt><dd>${f(u.trial_fin)}</dd></div>
        ${u.proximo_cobro ? `<div><dt>Próximo cobro</dt><dd>${f(u.proximo_cobro)}</dd></div>` : ""}
        <div><dt>Entrenamientos</dt><dd>${u.entrenos}</dd></div>
        <div><dt>Último</dt><dd>${u.ultimo ? esc(diaRelativo(u.ultimo)) : "nunca"}</dd></div>
      </dl>
    </div>
    ${["prueba", "vencida", "cancelada"].includes(u.estado) ? `
      <button class="btn block" id="adm-extender" style="margin-top:14px">Regalarle 7 días más de prueba</button>
      <p class="sm muted" style="margin:8px 0 0">Útil para recuperar a alguien que no llegó a probarla o para una promoción.</p>` : ""}
    <a class="btn ghost block" href="mailto:${esc(u.email)}?subject=${encodeURIComponent("Nivora Fit")}" style="margin-top:8px;text-align:center">Escribirle un mail</a>`);
  document.getElementById("volver").onclick = () => { abrirPanelAdmin(); };
  const ext = document.getElementById("adm-extender");
  if (ext) ext.onclick = async () => {
    ext.disabled = true; ext.textContent = "Extendiendo…";
    try {
      const r = await llamarAdmin("POST", { accion: "extender", usuario_id: u.id, dias: 7 });
      u.trial_fin = r.trial_fin; u.estado = "prueba";
      toast("Listo: tiene prueba hasta el " + f(r.trial_fin) + ".");
      fichaUsuarioAdmin(u.id);
    } catch (e) {
      toast("No se pudo extender (" + e.message + ").");
      ext.disabled = false; ext.textContent = "Regalarle 7 días más de prueba";
    }
  };
}
