/* ============================================================
   admin.js — el panel de administrador
   Solo responde a cuentas con es_admin = true (se valida acá, en el
   servidor, con la clave de servicio: la app no puede saltearlo).
   GET  → números del negocio y lista de usuarios.
   POST → acciones puntuales: { accion: "extender", usuario_id, dias }.
   ============================================================ */
const { admin, usuarioDelToken, json } = require("../lib/comun");

const PRECIO = Number(process.env.PRECIO_MENSUAL || 10000);
const COBRADO = ["approved", "processed", "accredited"];

exports.handler = async (event) => {
  const usuario = await usuarioDelToken(event);
  if (!usuario) return json(401, { error: "sesion" });
  const { data: yo } = await admin.from("perfiles").select("es_admin").eq("id", usuario.id).maybeSingle();
  if (!yo || !yo.es_admin) { console.warn("admin: intento sin permiso de", usuario.email); return json(403, { error: "permiso" }); }

  if (event.httpMethod === "POST") return accion(event, usuario);
  if (event.httpMethod !== "GET") return json(405, { error: "método no permitido" });

  const ahora = new Date();
  const [perfiles, sesiones, pagos] = await Promise.all([
    admin.from("perfiles").select("id, email, creado, trial_fin, suscripcion_estado, proximo_cobro, es_admin, nombre:datos->perfil->>nombre").order("creado", { ascending: false }).limit(5000),
    admin.from("sesiones").select("usuario_id, fecha").order("fecha", { ascending: false }).limit(20000),
    admin.from("pagos").select("usuario_id, tipo, estado, monto, creado").order("creado", { ascending: false }).limit(5000)
  ]);
  if (perfiles.error) return json(500, { error: perfiles.error.message });

  const ultimo = {}, cuenta = {};
  (sesiones.data || []).forEach(s => {
    if (!ultimo[s.usuario_id]) ultimo[s.usuario_id] = s.fecha;
    cuenta[s.usuario_id] = (cuenta[s.usuario_id] || 0) + 1;
  });

  const estadoDe = p => {
    if (p.es_admin) return "admin";
    if (p.suscripcion_estado === "activa") return "activa";
    if (p.suscripcion_estado === "cancelada") return p.proximo_cobro && new Date(p.proximo_cobro) > ahora ? "cancelada-vigente" : "cancelada";
    if (p.suscripcion_estado === "pausada") return "pausada";
    return p.trial_fin && new Date(p.trial_fin) > ahora ? "prueba" : "vencida";
  };

  const usuarios = (perfiles.data || []).map(p => ({
    id: p.id, email: p.email, nombre: p.nombre || "", creado: p.creado, trial_fin: p.trial_fin,
    proximo_cobro: p.proximo_cobro, estado: estadoDe(p),
    ultimo: ultimo[p.id] || null, entrenos: cuenta[p.id] || 0
  }));
  const clientes = usuarios.filter(u => u.estado !== "admin");
  const cuantos = e => clientes.filter(u => u.estado === e).length;
  const hace = d => new Date(ahora - d * 86400000).toISOString();

  const pagaron = clientes.filter(u => ["activa", "cancelada", "cancelada-vigente", "pausada"].includes(u.estado)).length;
  const pruebaTerminada = clientes.filter(u => u.estado !== "prueba").length;

  /* Ingresos por mes: los últimos 6. */
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    meses.push({ clave: d.toISOString().slice(0, 7), nombre: d.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""), monto: 0, cobros: 0 });
  }
  const cobros = (pagos.data || []).filter(p => p.tipo === "cobro" && COBRADO.includes(p.estado));
  cobros.forEach(p => {
    const m = meses.find(x => x.clave === p.creado.slice(0, 7));
    if (m) { m.monto += Number(p.monto || 0); m.cobros++; }
  });
  const mesActual = ahora.toISOString().slice(0, 7);
  const bajasMes = (pagos.data || []).filter(p => p.tipo === "suscripcion" && p.estado === "cancelled" && p.creado.slice(0, 7) === mesActual).length;

  return json(200, {
    generado: ahora.toISOString(),
    precio: PRECIO,
    numeros: {
      usuarios: clientes.length,
      nuevos7: clientes.filter(u => u.creado >= hace(7)).length,
      nuevos30: clientes.filter(u => u.creado >= hace(30)).length,
      prueba: cuantos("prueba"),
      activas: cuantos("activa"),
      canceladasVigentes: cuantos("cancelada-vigente"),
      canceladas: cuantos("cancelada"),
      vencidas: cuantos("vencida"),
      mrr: cuantos("activa") * PRECIO,
      conversion: pruebaTerminada ? Math.round((pagaron / pruebaTerminada) * 100) : null,
      activos7: clientes.filter(u => u.ultimo && u.ultimo >= hace(7).slice(0, 10)).length,
      bajasMes,
      ingresosMes: (meses.find(m => m.clave === mesActual) || {}).monto || 0
    },
    meses,
    usuarios
  });
};

async function accion(event, yo) {
  let cuerpo = {};
  try { cuerpo = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "json" }); }
  if (cuerpo.accion === "extender") {
    const dias = Math.max(1, Math.min(90, Number(cuerpo.dias) || 7));
    const { data: p } = await admin.from("perfiles").select("trial_fin, email").eq("id", cuerpo.usuario_id).maybeSingle();
    if (!p) return json(404, { error: "usuario" });
    const base = Math.max(Date.now(), new Date(p.trial_fin || 0).getTime());
    const nuevo = new Date(base + dias * 86400000).toISOString();
    const { error } = await admin.from("perfiles").update({ trial_fin: nuevo }).eq("id", cuerpo.usuario_id);
    if (error) return json(500, { error: error.message });
    console.log(`admin: ${yo.email} extendió ${dias} días la prueba de ${p.email}`);
    return json(200, { ok: true, trial_fin: nuevo });
  }
  return json(400, { error: "accion" });
}
