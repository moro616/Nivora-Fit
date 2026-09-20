/* ============================================================
   crear-suscripcion.js
   Crea la suscripción con débito automático en Mercado Pago y devuelve
   el link al que hay que mandar al usuario para que la autorice.
   ============================================================ */
const { admin, usuarioDelToken, json, mp } = require("./_comun");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "método no permitido" });

  const usuario = await usuarioDelToken(event);
  if (!usuario) return json(401, { error: "sesión no válida" });

  try {
    // ¿Ya tiene una suscripción viva? No creamos una segunda.
    const { data: perfil } = await admin
      .from("perfiles").select("mp_preapproval_id, suscripcion_estado")
      .eq("id", usuario.id).maybeSingle();

    if (perfil && perfil.mp_preapproval_id) {
      try {
        const actual = await mp("/preapproval/" + perfil.mp_preapproval_id);
        if (actual.status === "authorized") return json(200, { ya_activa: true, init_point: actual.init_point });
        if (actual.status === "pending" && actual.init_point) return json(200, { init_point: actual.init_point });
      } catch (e) { /* si no existe más, seguimos y creamos una nueva */ }
    }

    const precio = Number(process.env.PRECIO_MENSUAL || 10000);
    const suscripcion = await mp("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: (process.env.APP_NOMBRE || "Nivora") + " — plan mensual",
        external_reference: usuario.id,          // así el webhook sabe de quién es
        payer_email: usuario.email,
        back_url: process.env.URL_APP + "/?suscripcion=ok",
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: precio,
          currency_id: process.env.MONEDA || "ARS"
        }
      })
    });

    await admin.from("perfiles").update({
      mp_preapproval_id: suscripcion.id,
      actualizado: new Date().toISOString()
    }).eq("id", usuario.id);

    return json(200, { init_point: suscripcion.init_point, id: suscripcion.id });
  } catch (e) {
    console.error("crear-suscripcion:", e.message);
    return json(502, { error: "no pudimos crear la suscripción" });
  }
};
