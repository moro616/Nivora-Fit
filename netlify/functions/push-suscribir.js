/* ============================================================
   push-suscribir.js — guarda o borra la suscripción a recordatorios
   de este teléfono. El usuario sale de la sesión, nunca del pedido.
   ============================================================ */
const { admin, usuarioDelToken, json } = require("../lib/comun");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "método no permitido" });
  const usuario = await usuarioDelToken(event);
  if (!usuario) return json(401, { error: "sesion" });

  let c = {};
  try { c = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "json" }); }

  if (c.accion === "borrar") {
    if (!c.endpoint) return json(400, { error: "endpoint" });
    await admin.from("push_suscripciones").delete().eq("usuario_id", usuario.id).eq("endpoint", c.endpoint);
    return json(200, { ok: true });
  }

  const s = c.suscripcion || {};
  if (!s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth || !/^https:\/\//.test(s.endpoint)) return json(400, { error: "suscripcion" });
  const hora = Math.max(0, Math.min(23, Math.round(Number(c.hora) || 18)));
  let zona = String(c.zona || "America/Argentina/Buenos_Aires").slice(0, 60);
  try { new Intl.DateTimeFormat("es-AR", { timeZone: zona }); } catch (e) { zona = "America/Argentina/Buenos_Aires"; }

  const { error } = await admin.from("push_suscripciones").upsert({
    usuario_id: usuario.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth,
    hora, zona, activo: true, toca_hoy: c.tocaHoy !== false, faltas: c.faltas !== false
  }, { onConflict: "endpoint" });
  if (error) { console.error("push-suscribir:", error.message); return json(500, { error: "guardar" }); }
  return json(200, { ok: true });
};
