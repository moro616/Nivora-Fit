/* ============================================================
   borrar-chat.js
   Borra la conversación con el entrenador: el hilo que se ve en la app
   y la memoria que usa n8n. Solo lo propio: el id sale de la sesión,
   nunca de lo que manda el teléfono.
   ============================================================ */
const { admin, usuarioDelToken, json } = require("../lib/comun");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "método no permitido" });

  const usuario = await usuarioDelToken(event);
  if (!usuario) return json(401, { error: "sesion" });

  const a = await admin.from("chat_mensajes").delete().eq("usuario_id", usuario.id);
  if (a.error) { console.error("borrar-chat: hilo:", a.error.message); return json(500, { error: "no se pudo borrar" }); }

  const b = await admin.from("n8n_chat_histories").delete().eq("session_id", usuario.id);
  if (b.error) console.error("borrar-chat: memoria:", b.error.message);

  console.log("borrar-chat: listo para", usuario.email);
  return json(200, { ok: true });
};
