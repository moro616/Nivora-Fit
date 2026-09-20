/* ============================================================
   webhook-mercadopago.js
   Mercado Pago avisa acá cada vez que pasa algo: se autoriza una
   suscripción, entra un pago, alguien cancela. Esta función es la ÚNICA
   que decide si un usuario tiene acceso o no.

   Importante: siempre respondemos 200 rápido. Si devolvemos error,
   Mercado Pago reintenta y se acumulan notificaciones repetidas.
   ============================================================ */
const crypto = require("crypto");
const { admin, json, mp } = require("./_comun");

/* Verifica la firma del webhook (x-signature). Evita que cualquiera
   nos mande una notificación falsa diciendo que pagó. */
function firmaValida(event, dataId) {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return true;                      // sin secreto configurado, no validamos
  const firma = event.headers["x-signature"] || event.headers["X-Signature"];
  const requestId = event.headers["x-request-id"] || event.headers["X-Request-Id"];
  if (!firma) return false;

  const partes = Object.fromEntries(
    firma.split(",").map(p => p.split("=").map(s => s.trim())).filter(p => p.length === 2)
  );
  if (!partes.ts || !partes.v1) return false;

  const plantilla = `id:${dataId};request-id:${requestId};ts:${partes.ts};`;
  const esperado = crypto.createHmac("sha256", secreto).update(plantilla).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(partes.v1));
  } catch (e) { return false; }
}

const ESTADOS = {
  authorized: "activa",
  paused:     "pausada",
  cancelled:  "cancelada",
  pending:    "trial"
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "método no permitido" });

  let cuerpo = {};
  try { cuerpo = JSON.parse(event.body || "{}"); } catch (e) { return json(200, { ok: true }); }

  const tipo = cuerpo.type || cuerpo.topic;
  const id = (cuerpo.data && cuerpo.data.id) || cuerpo.id;
  if (!id) return json(200, { ok: true });

  if (!firmaValida(event, id)) {
    console.warn("webhook con firma inválida, lo ignoramos");
    return json(200, { ok: true });
  }

  try {
    if (tipo === "subscription_preapproval" || tipo === "preapproval") {
      const s = await mp("/preapproval/" + id);
      const usuarioId = s.external_reference;
      if (!usuarioId) return json(200, { ok: true });

      const estado = ESTADOS[s.status] || "vencida";
      await admin.from("perfiles").update({
        suscripcion_estado: estado,
        mp_preapproval_id: s.id,
        mp_payer_id: s.payer_id ? String(s.payer_id) : null,
        proximo_cobro: s.next_payment_date || null,
        actualizado: new Date().toISOString()
      }).eq("id", usuarioId);

      await admin.from("pagos").insert({
        usuario_id: usuarioId, mp_id: "preapproval-" + s.id + "-" + s.status,
        tipo: "suscripcion", estado: s.status,
        monto: s.auto_recurring ? s.auto_recurring.transaction_amount : null,
        moneda: s.auto_recurring ? s.auto_recurring.currency_id : "ARS",
        payload: s
      });
      return json(200, { ok: true, estado });
    }

    if (tipo === "subscription_authorized_payment" || tipo === "payment") {
      const ruta = tipo === "payment" ? "/v1/payments/" + id : "/authorized_payments/" + id;
      const p = await mp(ruta);
      const preapprovalId = p.preapproval_id || (p.metadata && p.metadata.preapproval_id);

      let usuarioId = p.external_reference || null;
      if (!usuarioId && preapprovalId) {
        const { data } = await admin.from("perfiles").select("id")
          .eq("mp_preapproval_id", preapprovalId).maybeSingle();
        usuarioId = data ? data.id : null;
      }
      if (!usuarioId) return json(200, { ok: true });

      await admin.from("pagos").insert({
        usuario_id: usuarioId, mp_id: String(p.id), tipo: "cobro",
        estado: p.status, monto: p.transaction_amount, moneda: p.currency_id || "ARS", payload: p
      });

      // Un cobro aprobado renueva el acceso; uno rechazado no lo corta de inmediato:
      // Mercado Pago reintenta, y cortarle el acceso a alguien que sí quiere pagar
      // es la forma más rápida de perderlo.
      if (p.status === "approved") {
        await admin.from("perfiles").update({
          suscripcion_estado: "activa",
          actualizado: new Date().toISOString()
        }).eq("id", usuarioId);
      }
      return json(200, { ok: true });
    }

    return json(200, { ok: true, ignorado: tipo });
  } catch (e) {
    console.error("webhook:", e.message);
    return json(200, { ok: true });   // 200 igual, para que MP no reintente en loop
  }
};
