/* ============================================================
   _comun.js — lo que comparten todas las funciones del servidor.
   Acá vive el service_role de Supabase: esta clave NUNCA sale del servidor.
   ============================================================ */
const { createClient } = require("@supabase/supabase-js");

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/* Valida el token que manda el navegador y devuelve el usuario real.
   Nunca confiamos en un id de usuario que venga en el body de la petición. */
async function usuarioDelToken(event) {
  const auth = event.headers.authorization || event.headers.Authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(body)
});

/* Llamadas a la API de Mercado Pago, siempre con el token privado. */
async function mp(ruta, opciones = {}) {
  const r = await fetch("https://api.mercadopago.com" + ruta, {
    ...opciones,
    headers: {
      "Authorization": "Bearer " + process.env.MP_ACCESS_TOKEN,
      "Content-Type": "application/json",
      ...(opciones.headers || {})
    }
  });
  const texto = await r.text();
  let cuerpo;
  try { cuerpo = texto ? JSON.parse(texto) : {}; } catch (e) { cuerpo = { raw: texto }; }
  if (!r.ok) {
    const err = new Error("Mercado Pago respondió " + r.status + ": " + texto.slice(0, 400));
    err.status = r.status; err.cuerpo = cuerpo;
    throw err;
  }
  return cuerpo;
}

module.exports = { admin, usuarioDelToken, json, mp };
