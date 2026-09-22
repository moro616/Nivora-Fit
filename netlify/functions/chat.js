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
  if (!usuario) { console.log("chat: sesión no válida"); return json(401, { error: "sesion" }); }

  let mensaje = "";
  try { mensaje = String(JSON.parse(event.body || "{}").mensaje || "").trim(); } catch (e) {}
  if (!mensaje) { console.log("chat: mensaje vacío"); return json(400, { error: "vacio" }); }
  if (mensaje.length > 1500) mensaje = mensaje.slice(0, 1500);

  // --- ¿tiene acceso? ---
  const { data: perfil, error: errPerfil } = await admin
    .from("perfiles").select("*")
    .eq("id", usuario.id).maybeSingle();
  if (errPerfil) console.error("chat: no se pudo leer el perfil:", errPerfil.message);
  if (!perfil) { console.log("chat: sin perfil para", usuario.email); return json(403, { error: "perfil" }); }

  const ahora = new Date();
  const conAcceso = perfil.es_admin || perfil.suscripcion_estado === "activa" ||
    (perfil.trial_fin && new Date(perfil.trial_fin) > ahora) ||
    (perfil.suscripcion_estado === "cancelada" && perfil.proximo_cobro && new Date(perfil.proximo_cobro) > ahora);
  if (!conAcceso) { console.log("chat: sin acceso", usuario.email, perfil.suscripcion_estado); return json(402, { error: "acceso" }); }

  // --- tope diario, para que un usuario no se coma el presupuesto ---
  const desde = new Date(); desde.setHours(0, 0, 0, 0);
  const { count } = await admin.from("chat_mensajes")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", usuario.id).eq("rol", "usuario").gte("creado", desde.toISOString());
  if ((count || 0) >= LIMITE_POR_DIA) {
    console.log("chat: límite diario alcanzado", usuario.email);
    return json(200, {
      respuesta: "Por hoy llegamos al límite de consultas. Mañana seguimos — mientras tanto, " +
                 "tenés toda la rutina y las fichas de cada ejercicio disponibles."
    });
  }

  // --- contexto: quién es y cómo viene ---
  const contexto = await armarContexto(usuario.id, perfil);

  if (!process.env.N8N_WEBHOOK_URL) { console.error("chat: falta N8N_WEBHOOK_URL"); return json(502, { error: "n8n" }); }
  console.log("chat: llamando a n8n para", usuario.email);
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
    return json(502, { error: "n8n", detalle: e.message });
  }
};

/* Resumen del usuario en texto plano: es lo que el agente lee antes de
   responder. Corto a propósito — cuanto más ruido, peores las respuestas. */
/* Las claves tienen que coincidir con las de la app (cuerpo.js y ejercicios.js). */
const OBJETIVOS = {
  bajar:      { nombre: "bajar de peso", ajuste: -0.20, reps: "12 a 15" },
  recomponer: { nombre: "bajar grasa y tonificar", ajuste: -0.10, reps: "10 a 12" },
  musculo:    { nombre: "ganar músculo", ajuste: 0.10, reps: "8 a 12" },
  salud:      { nombre: "salud y estado físico general", ajuste: 0, reps: "10 a 12" },
  fuerza:     { nombre: "ganar fuerza", ajuste: 0.05, reps: "4 a 6" }
};
const NIVELES = { principiante: "principiante", intermedio: "intermedio", avanzado: "avanzado" };
const EQUIPOS = { gimnasio: "gimnasio completo", mancuernas: "mancuernas en casa", casa: "solo peso corporal, en casa" };
const ACTIVIDAD = { sedentario: 1.2, ligero: 1.375, moderado: 1.55, alto: 1.725 };
const ACTIVIDAD_TXT = { sedentario: "trabajo sentado", ligero: "algo de movimiento en el día", moderado: "trabajo de pie o bastante caminata", alto: "trabajo físico pesado" };
const LIMITACIONES = { rodilla: "rodillas", hombro: "hombros", espalda: "espalda baja", muneca: "muñecas" };

/* Mismo cálculo de bloques que la app (programa.js). */
const BLOQUES = {
  principiante: [["Adaptación", 2], ["Progresión", 3], ["Descarga", 1]],
  intermedio:   [["Acumulación", 2], ["Intensificación", 2], ["Descarga", 1]],
  avanzado:     [["Acumulación", 2], ["Intensificación", 2], ["Realización", 1], ["Descarga", 1]]
};
function faseDe(p) {
  const semanas = [];
  (BLOQUES[p.nivel] || BLOQUES.principiante).forEach(([f, n]) => { for (let i = 0; i < n; i++) semanas.push(f); });
  if (!p.programa || !p.programa.inicio) return null;
  const idx = Math.floor(Math.max(0, (Date.now() - new Date(p.programa.inicio + "T00:00:00-03:00")) / 86400000) / 7);
  return `semana ${idx % semanas.length + 1} de ${semanas.length}, fase de ${semanas[idx % semanas.length]}`;
}

const legible = id => String(id || "").replace(/-/g, " ");

/* Los tipos de sesión que guarda la app. Las viejas no tienen tipo: son de gimnasio. */
const TIPOS = { gimnasio: "gimnasio", calistenia: "calistenia", hiit: "funcional/HIIT", movilidad: "movilidad y estiramiento",
  bici: "bicicleta fija", cinta: "cinta", eliptico: "elíptico", correr: "correr", caminar: "caminar" };
const tipoDe = s => s.tipo || (s.km != null ? "correr" : "gimnasio");

function edadDe(p) {
  if (p.edad) return p.edad;
  if (!p.nacimiento) return null;
  const n = new Date(p.nacimiento), h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h < new Date(h.getFullYear(), n.getMonth(), n.getDate())) e--;
  return e;
}

async function armarContexto(usuarioId, perfil) {
  const d = perfil.datos || {};
  const p = d.perfil || {};
  const med = d.medidas || [];
  const ultima = med[med.length - 1] || {};
  const primera = med[0] || {};
  const ses = (d.sesiones || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hoy = new Date().toISOString().slice(0, 10);

  const edad = edadDe(p);
  const peso = ultima.peso || p.peso;
  const altura = p.altura;
  const obj = OBJETIVOS[p.objetivo] || OBJETIVOS.salud;
  const imc = peso && altura ? peso / Math.pow(altura / 100, 2) : null;

  /* Calorías: la misma cuenta que la app (Mifflin-St Jeor + actividad + entrenamiento + objetivo). */
  let kcal = null, proteina = null;
  if (peso && altura && edad) {
    const tmb = 10 * peso + 6.25 * altura - 5 * edad + (p.sexo === "mujer" ? -161 : 5);
    const gasto = tmb * (ACTIVIDAD[p.actividad] || 1.375) + (p.dias || 3) * 300 / 7;
    kcal = Math.round(gasto * (1 + obj.ajuste) / 10) * 10;
    proteina = Math.round(peso * (p.objetivo === "musculo" || p.objetivo === "fuerza" ? 1.8 : p.objetivo === "salud" ? 1.6 : 2));
  }

  const dias = f => Math.round((new Date(hoy) - new Date(f)) / 86400000);
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const hace7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const ult30 = ses.filter(s => s.fecha >= hace30);
  const gym30 = ult30.filter(s => s.km == null && tipoDe(s) === "gimnasio");
  const cardio30 = ult30.filter(s => s.km != null);
  const otras30 = {};
  ult30.filter(s => s.km == null && tipoDe(s) !== "gimnasio").forEach(s => {
    const t = TIPOS[tipoDe(s)] || tipoDe(s);
    otras30[t] = otras30[t] || { n: 0, min: 0 };
    otras30[t].n++; otras30[t].min += s.min || 0;
  });
  const caliActual = p.cali && p.cali.actual ? Object.entries(p.cali.actual).map(([k, v]) => `${k.toLowerCase()}: ${v}`).join("; ") : "";
  const grupos = {};
  ult30.filter(s => s.km == null).forEach(s => Object.entries(s.grupos || {}).forEach(([g, n]) => { grupos[g] = (grupos[g] || 0) + n; }));
  const ultimaSesion = ses[ses.length - 1];

  const cargas = Object.entries(d.cargas || {})
    .filter(([, v]) => v && v.kg > 0)
    .sort((a, b) => b[1].kg - a[1].kg).slice(0, 10)
    .map(([k, v]) => `${legible(k)} ${v.kg} kg`).join(", ");

  const ficha = [
    `Nombre: ${p.nombre || "sin nombre"}`,
    `${p.sexo === "mujer" ? "Mujer" : "Hombre"}${edad ? `, ${edad} años` : ""}${altura ? `, ${altura} cm` : ""}`,
    peso ? `Peso actual: ${peso} kg` + (primera.peso && primera.fecha !== ultima.fecha
      ? ` (empezó en ${primera.peso} kg el ${primera.fecha}; cambio ${(peso - primera.peso >= 0 ? "+" : "") + (peso - primera.peso).toFixed(1)} kg)` : "") : null,
    imc ? `IMC: ${imc.toFixed(1)}` : null,
    ultima.cintura ? `Cintura: ${ultima.cintura} cm` + (primera.cintura && primera.cintura !== ultima.cintura ? ` (empezó en ${primera.cintura} cm)` : "") : null,
    `Objetivo: ${obj.nombre}. Rango de repeticiones de su plan: ${obj.reps}.`,
    `Nivel: ${NIVELES[p.nivel] || p.nivel || "sin dato"}. Entrena en: ${EQUIPOS[p.equipo] || p.equipo || "sin dato"}. Meta: ${p.dias || 3} días por semana.`,
    `Fuera del gimnasio: ${ACTIVIDAD_TXT[p.actividad] || "sin dato"}.`,
    faseDe(p) ? `Bloque de entrenamiento actual: ${faseDe(p)}. En Descarga baja series y peso a propósito; en Intensificación y Realización hace menos repeticiones con más peso.` : null,
    (p.limitaciones || []).length ? `Molestias declaradas: ${p.limitaciones.map(l => LIMITACIONES[l] || l).join(", ")}. Evitar cargar esas zonas.` : "Sin molestias declaradas.",
    kcal ? `Calorías diarias sugeridas por la app: ~${kcal} kcal, proteína ~${proteina} g (estimaciones).` : null,
    `Entrenamientos registrados en total: ${ses.length}. En los últimos 7 días: ${ses.filter(s => s.fecha >= hace7).length}.`,
    ultimaSesion ? `Último entrenamiento: ${ultimaSesion.nombre || legible(ultimaSesion.bloque)}, hace ${dias(ultimaSesion.fecha)} días.` : "Todavía no registró entrenamientos.",
    Object.keys(grupos).length ? `Series por músculo en 30 días: ${Object.entries(grupos).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(", ")}.` : null,
    Object.keys(otras30).length ? `Otras actividades en 30 días: ${Object.entries(otras30).map(([t, x]) => `${t} ${x.n} ${x.n === 1 ? "vez" : "veces"} (${x.min} min)`).join(", ")}.` : null,
    caliActual ? `Calistenia, variante actual de cada movimiento: ${caliActual}.${p.cali.barra ? " Tiene barra para colgarse." : " No tiene barra para colgarse."}` : null,
    cardio30.length ? `Salidas a correr o caminar en 30 días: ${cardio30.length}, ${cardio30.reduce((a, s) => a + (s.km || 0), 0).toFixed(1)} km en total.` : null,
    cargas ? `Cargas actuales: ${cargas}.` : null
  ].filter(Boolean).join("\n");

  const sesiones_texto = ses.slice(-8).reverse().map(s => {
    const t = tipoDe(s), nombre = s.nombre || legible(s.bloque);
    if (s.km != null) return `${s.fecha}: ${nombre}, ${s.km} km en ${s.min} min, ${s.kcal} kcal`;
    if (t === "gimnasio") return `${s.fecha}: gimnasio, ${nombre}, ${s.series} series, ${s.min} min, ${Math.round(s.volumen || 0)} kg movidos`;
    if (t === "calistenia") return `${s.fecha}: calistenia, ${nombre}, ${s.series} series, ${s.min} min`;
    return `${s.fecha}: ${TIPOS[t] || t}, ${nombre}, ${s.min} min, ${s.kcal} kcal`;
  }).join("\n") || "Todavía no registró ninguna sesión.";

  return {
    ficha_texto: ficha,
    sesiones_texto,
    fecha_hoy: hoy,
    /* por compatibilidad con la versión anterior del flujo */
    nombre: p.nombre || "", sexo: p.sexo, edad, altura_cm: altura, peso_kg: peso,
    objetivo: obj.nombre, nivel: NIVELES[p.nivel] || p.nivel, entrena_en: EQUIPOS[p.equipo] || p.equipo,
    dias_por_semana: p.dias, sesiones_totales: ses.length, ultimas_sesiones: [], cargas_actuales: cargas,
    suscripcion: perfil.suscripcion_estado
  };
}
