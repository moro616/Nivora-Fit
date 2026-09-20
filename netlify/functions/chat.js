/* ============================================================
   chat.js — el puente entre la app y el entrenador de IA en n8n.

   Por qué pasa por acá y no directo del navegador a n8n:
   1. La URL del webhook de n8n queda privada (si no, cualquiera la usa
      y te consume el crédito del modelo).
   2. El contexto del usuario lo arma el servidor leyendo la base, no el
      navegador: nadie puede mentir sobre sus propios datos.
   3. Podemos cortar el acceso a quien no está suscripto.
   ============================================================ */
const { admin, usuarioDelToken, json } = require("../lib/comun");

const LIMITE_POR_DIA = Number(process.env.CHAT_LIMITE_DIARIO || 40);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "método no permitido" });

  const usuario = await usuarioDelToken(event);
  if (!usuario) return json(401, { error: "sesión no válida" });

  let mensaje = "";
  try { mensaje = String(JSON.parse(event.body || "{}").mensaje || "").trim(); } catch (e) {}
  if (!mensaje) return json(400, { error: "mensaje vacío" });
  if (mensaje.length > 1500) mensaje = mensaje.slice(0, 1500);

  // --- ¿tiene acceso? ---
  const { data: perfil } = await admin
    .from("perfiles").select("datos, trial_fin, suscripcion_estado")
    .eq("id", usuario.id).maybeSingle();
  if (!perfil) return json(403, { error: "sin perfil" });

  const conAcceso = perfil.suscripcion_estado === "activa" ||
    (perfil.trial_fin && new Date(perfil.trial_fin) > new Date());
  if (!conAcceso) return json(402, { error: "suscripción requerida" });

  // --- tope diario, para que un usuario no se coma el presupuesto ---
  const desde = new Date(); desde.setHours(0, 0, 0, 0);
  const { count } = await admin.from("chat_mensajes")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuario.id).eq("rol", "usuario").gte("creado", desde.toISOString());
  if ((count || 0) >= LIMITE_POR_DIA) {
    return json(200, {
      respuesta: "Por hoy llegamos al límite de consultas. Mañana seguimos — mientras tanto, " +
                 "tenés toda la rutina y las fichas de cada ejercicio disponibles."
    });
  }

  // --- contexto: quién es y cómo viene ---
  const contexto = await armarContexto(usuario.id, perfil);

  try {
    const r = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (process.env.N8N_WEBHOOK_TOKEN || "")
      },
      body: JSON.stringify({ usuario_id: usuario.id, mensaje, contexto }),
      signal: AbortSignal.timeout(45000)
    });
    if (!r.ok) throw new Error("n8n respondió " + r.status);

    const j = await r.json();
    const respuesta = (j.respuesta || j.output || j.text || "").toString().trim();
    if (!respuesta) throw new Error("respuesta vacía");

    await admin.from("chat_mensajes").insert([
      { usuario_id: usuario.id, rol: "usuario", texto: mensaje },
      { usuario_id: usuario.id, rol: "entrenador", texto: respuesta }
    ]);

    return json(200, { respuesta });
  } catch (e) {
    console.error("chat:", e.message);
    return json(502, { error: "el entrenador no está disponible ahora" });
  }
};

/* Resumen del usuario en texto plano: es lo que el agente lee antes de
   responder. Corto a propósito — cuanto más ruido, peores las respuestas. */
async function armarContexto(usuarioId, perfil) {
  const d = perfil.datos || {};
  const p = d.perfil || {};
  const medidas = (d.medidas || []).slice(-3);
  const ultima = medidas[medidas.length - 1] || {};
  const primera = (d.medidas || [])[0] || {};

  const { data: sesiones } = await admin.from("sesiones")
    .select("fecha, bloque, series, minutos, kcal")
    .eq("usuario_id", usuarioId).order("fecha", { ascending: false }).limit(8);

  const cargas = Object.entries(d.cargas || {})
    .slice(0, 12).map(([k, v]) => `${k}: ${v.kg} kg`).join(", ");

  const objetivos = { bajar: "bajar grasa", musculo: "ganar músculo",
    tonificar: "tonificar", gluteos: "glúteos y piernas", salud: "salud general" };
  const niveles = { 1: "principiante", 2: "intermedio", 3: "con experiencia" };
  const equipos = { gym: "gimnasio completo", libre: "pesas libres", casa: "en casa" };

  return {
    nombre: p.nombre || "",
    sexo: p.sexo === "F" ? "femenino" : "masculino",
    edad: p.edad, altura_cm: p.altura,
    peso_kg: ultima.peso || p.peso,
    peso_inicial_kg: primera.peso || null,
    cambio_peso_kg: (ultima.peso && primera.peso) ? Number((ultima.peso - primera.peso).toFixed(1)) : null,
    cintura_cm: ultima.cintura || null,
    objetivo: objetivos[p.objetivo] || p.objetivo,
    nivel: niveles[p.nivel] || p.nivel,
    entrena_en: equipos[p.equipo] || p.equipo,
    dias_por_semana: p.dias,
    agenda: d.agenda || null,
    sesiones_totales: (d.sesiones || []).length,
    ultimas_sesiones: sesiones || [],
    cargas_actuales: cargas,
    suscripcion: perfil.suscripcion_estado
  };
}
