/* ============================================================
   crear-suscripcion.js
   Crea la suscripción con débito automático en Mercado Pago y devuelve
   el link al que hay que mandar al usuario para que la autorice.
   ============================================================ */
const { admin, usuarioDelToken, json, mp } = require("../lib/comun");

/* La raíz del sitio sale de URL_APP si la cargaste; si no, de la variable URL
   que Netlify pone sola (y que cambia sola cuando conectás el dominio propio).
   La app vive en /app/: ahí tiene que volver la persona después de pagar. */
const urlDeLaApp = () =>
  (process.env.URL_APP || process.env.URL || "").replace(/\/+$/, "") + "/app/";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "método no permitido" });

  const usuario = await usuarioDelToken(event);
  if (!usuario) return json(401, { error: "sesión no válida" });

  /* Mercado Pago pide que el mail del pagador sea el de la cuenta de
     Mercado Pago con la que va a pagar, que puede no ser el de la app. */
  let emailMp = usuario.email;
  try {
    const c = JSON.parse(event.body || "{}");
    if (c.email_mp && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email_mp) && c.email_mp.length < 120) emailMp = c.email_mp.trim().toLowerCase();
  } catch (e) { /* sin cuerpo: usamos el mail de la cuenta */ }

  try {
    // ¿Ya tiene una suscripción viva? No creamos una segunda.
    const { data: perfil } = await admin
      .from("perfiles").select("mp_preapproval_id, suscripcion_estado, trial_fin")
      .eq("id", usuario.id).maybeSingle();

    if (perfil && perfil.mp_preapproval_id) {
      try {
        const actual = await mp("/preapproval/" + perfil.mp_preapproval_id);
        if (actual.status === "authorized") return json(200, { ya_activa: true, init_point: actual.init_point });
        if (actual.status === "pending" && actual.init_point && (actual.payer_email || "").toLowerCase() === emailMp)
          return json(200, { init_point: actual.init_point });
      } catch (e) { /* si no existe más, seguimos y creamos una nueva */ }
    }

    const precio = Number(process.env.PRECIO_MENSUAL || 10000);
    /* Si se suscribe durante la prueba, el primer débito espera a que la prueba termine. */
    const finPrueba = perfil && perfil.trial_fin ? new Date(perfil.trial_fin) : null;
    const arranque = finPrueba && finPrueba.getTime() > Date.now() + 3600000 ? finPrueba.toISOString() : null;
    const suscripcion = await mp("/preapproval", {
      method: "POST",
      body: JSON.stringify({
        reason: (process.env.APP_NOMBRE || "Nivora Fit") + " — plan mensual",
        external_reference: usuario.id,          // así el webhook sabe de quién es
        payer_email: emailMp,
        back_url: urlDeLaApp() + "?suscripcion=ok",
        status: "pending",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: precio,
          currency_id: process.env.MONEDA || "ARS",
          ...(arranque ? { start_date: arranque } : {})
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
