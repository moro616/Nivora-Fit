/* ============================================================
   recordatorios.js — corre cada hora (ver netlify.toml)
   A cada suscripción cuya hora elegida coincide con la hora local de
   su zona, le decide qué decir, o si mejor no decir nada:
   - si ya entrenó hoy, o ya cumplió la meta de la semana: nada;
   - si hace 4 días o más que no entrena: aviso para volver;
   - si le faltan entrenamientos esta semana: "hoy te toca".
   Como mucho un aviso por día y por persona.
   ============================================================ */
const webpush = require("web-push");
const { admin } = require("../lib/comun");

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:soporte@nivorafit.com",
  process.env.VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

const partes = (fecha, zona) => {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false, weekday: "short" })
    .formatToParts(fecha).reduce((o, p) => (o[p.type] = p.value, o), {});
  const dia = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[f.weekday];
  return { hoy: `${f.year}-${f.month}-${f.day}`, hora: Number(f.hour) % 24, dia };
};
const sumarDias = (iso, n) => { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

function mensaje(perfil, sub, local) {
  const d = perfil.datos || {};
  const p = d.perfil || {};
  const nombre = (p.nombre || "").split(" ")[0];
  const ses = (d.sesiones || []).map(s => s.fecha).sort();
  const ultima = ses[ses.length - 1];
  if (ultima === local.hoy) return null;                                  // ya entrenó hoy

  const lunes = sumarDias(local.hoy, -local.dia);
  const estaSemana = ses.filter(f => f >= lunes && f <= local.hoy).length;
  const meta = p.dias || 3;
  const diasSin = ultima ? Math.round((new Date(local.hoy) - new Date(ultima)) / 86400000) : null;

  if (sub.faltas && diasSin != null && diasSin >= 4) {
    return { titulo: `Hace ${diasSin} días que no entrenás`, cuerpo: `${nombre ? nombre + ", h" : "H"}oy es un buen día para volver. Arrancá suave: la rutina ya está armada.`, tag: "faltas" };
  }
  if (!sub.toca_hoy || estaSemana >= meta) return null;                   // meta cumplida
  const faltan = meta - estaSemana;
  const quedan = 7 - local.dia;                                           // días que quedan, contando hoy
  if (diasSin === 1 && faltan < quedan) return null;                      // entrenó ayer y hay margen: día de descanso
  return {
    titulo: "Hoy te toca entrenar",
    cuerpo: `${nombre ? nombre + ", t" : "T"}e ${faltan === 1 ? "falta 1" : "faltan " + faltan} para cumplir la semana. Tu rutina de hoy te espera.`,
    tag: "toca"
  };
}

exports.handler = async () => {
  if (!process.env.VAPID_PRIVATE_KEY) { console.error("recordatorios: falta VAPID_PRIVATE_KEY"); return { statusCode: 200 }; }
  const ahora = new Date();
  const { data: subs, error } = await admin.from("push_suscripciones").select("*").eq("activo", true).limit(5000);
  if (error) { console.error("recordatorios:", error.message); return { statusCode: 200 }; }

  const toca = (subs || []).filter(s => {
    const l = partes(ahora, s.zona);
    return l.hora === s.hora && (!s.ultimo_envio || partes(new Date(s.ultimo_envio), s.zona).hoy !== l.hoy);
  });
  if (!toca.length) return { statusCode: 200 };

  const ids = [...new Set(toca.map(s => s.usuario_id))];
  const { data: perfiles } = await admin.from("perfiles").select("id, datos, trial_fin, suscripcion_estado, proximo_cobro, es_admin").in("id", ids);
  const porId = Object.fromEntries((perfiles || []).map(p => [p.id, p]));

  let enviados = 0;
  for (const s of toca) {
    const p = porId[s.usuario_id];
    if (!p) continue;
    const acceso = p.es_admin || p.suscripcion_estado === "activa" || (p.trial_fin && new Date(p.trial_fin) > ahora) ||
      (p.suscripcion_estado === "cancelada" && p.proximo_cobro && new Date(p.proximo_cobro) > ahora);
    if (!acceso) continue;
    const m = mensaje(p, s, partes(ahora, s.zona));
    if (!m) continue;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ ...m, url: "/app/" }), { TTL: 6 * 3600 });
      await admin.from("push_suscripciones").update({ ultimo_envio: ahora.toISOString() }).eq("id", s.id);
      enviados++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await admin.from("push_suscripciones").delete().eq("id", s.id);
      else console.error("recordatorios: envío:", e.statusCode || e.message);
    }
  }
  console.log(`recordatorios: ${enviados} enviados de ${toca.length} a esta hora`);
  return { statusCode: 200 };
};
