/* ============================================================
   cancelar-suscripcion.js
   Dar de baja tiene que ser tan fácil como suscribirse. Además de ser
   lo correcto, una baja difícil termina en contracargos y en malas reseñas.
   ============================================================ */
const { admin, usuarioDelToken, json, mp } = require("../lib/comun");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "método no permitido" });

  const usuario = await usuarioDelToken(event);
  if (!usuario) return json(401, { error: "sesión no válida" });

  const { data: perfil } = await admin
    .from("perfiles").select("mp_preapproval_id").eq("id", usuario.id).maybeSingle();

  if (!perfil || !perfil.mp_preapproval_id) return json(200, { ok: true, nota: "no había suscripción activa" });

  try {
    await mp("/preapproval/" + perfil.mp_preapproval_id, {
      method: "PUT",
      body: JSON.stringify({ status: "cancelled" })
    });
    await admin.from("perfiles").update({
      suscripcion_estado: "cancelada",
      proximo_cobro: null,
      actualizado: new Date().toISOString()
    }).eq("id", usuario.id);
    return json(200, { ok: true });
  } catch (e) {
    console.error("cancelar:", e.message);
    return json(502, { error: "no pudimos cancelar en este momento" });
  }
};
