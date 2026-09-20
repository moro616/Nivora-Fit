"use strict";
/* ============================================================
   motor.js — el que arma la rutina
   No hay días fijos: la app mira qué entrenaste las últimas veces
   y te dice qué toca hoy. Si faltaste una semana, retoma donde quedó.
   ============================================================ */

/* Cada bloque es una lista de puestos a llenar.
   El motor busca, para cada puesto, el mejor ejercicio que la persona
   pueda hacer con el equipo que tiene y sin tocar lo que le duele. */
const BLOQUES = {
  fullA: { nombre: "Cuerpo completo A", corto: "Full A", musculos: "Piernas · Pecho · Espalda",
    puestos: [
      { grupo: "cuadriceps", patrones: ["sentadilla"], rol: "principal" },
      { grupo: "pecho",      patrones: ["pressHorizontal"], rol: "principal" },
      { grupo: "espalda",    patrones: ["remoHorizontal", "jalonVertical"], rol: "principal" },
      { grupo: "hombro",     patrones: ["pressVertical", "elevacionLateral"], rol: "accesorio" },
      { grupo: "core",       patrones: ["core", "abdominales"], rol: "accesorio" }
    ] },

  fullB: { nombre: "Cuerpo completo B", corto: "Full B", musculos: "Isquios · Espalda · Hombros",
    puestos: [
      { grupo: "femoral",  patrones: ["bisagra", "curlFemoral"], rol: "principal" },
      { grupo: "espalda",  patrones: ["jalonVertical", "remoHorizontal"], rol: "principal" },
      { grupo: "pecho",    patrones: ["apertura", "pressHorizontal"], rol: "accesorio" },
      { grupo: "gluteo",   patrones: ["zancada", "hipThrust"], rol: "accesorio" },
      { grupo: "core",     patrones: ["elevacionPiernas", "abdominales"], rol: "accesorio" }
    ] },

  fullC: { nombre: "Cuerpo completo C", corto: "Full C", musculos: "Glúteos · Empuje · Brazos",
    puestos: [
      { grupo: "gluteo",  patrones: ["hipThrust", "zancada"], rol: "principal" },
      { grupo: "hombro",  patrones: ["pressVertical"], rol: "principal" },
      { grupo: "espalda", patrones: ["remoHorizontal"], rol: "principal" },
      { grupo: "biceps",  patrones: ["curlBiceps"], rol: "accesorio" },
      { grupo: "triceps", patrones: ["extensionTriceps"], rol: "accesorio" },
      { grupo: "core",    patrones: ["core", "abdominales"], rol: "accesorio" }
    ] },

  empuje: { nombre: "Empuje", corto: "Empuje", musculos: "Pecho · Hombros · Tríceps",
    puestos: [
      { grupo: "pecho",   patrones: ["pressHorizontal"], rol: "principal" },
      { grupo: "hombro",  patrones: ["pressVertical"], rol: "principal" },
      { grupo: "pecho",   patrones: ["apertura"], rol: "accesorio" },
      { grupo: "hombro",  patrones: ["elevacionLateral", "elevacionFrontal"], rol: "accesorio" },
      { grupo: "triceps", patrones: ["extensionTriceps"], rol: "accesorio" },
      { grupo: "core",    patrones: ["core", "abdominales"], rol: "accesorio" }
    ] },

  tiron: { nombre: "Tirón", corto: "Tirón", musculos: "Espalda · Bíceps",
    puestos: [
      { grupo: "espalda",  patrones: ["jalonVertical"], rol: "principal" },
      { grupo: "espalda",  patrones: ["remoHorizontal"], rol: "principal" },
      { grupo: "trapecio", patrones: ["encogimiento"], rol: "accesorio" },
      { grupo: "biceps",   patrones: ["curlBiceps"], rol: "accesorio" },
      { grupo: "core",     patrones: ["elevacionPiernas", "abdominales"], rol: "accesorio" }
    ] },

  pierna: { nombre: "Piernas", corto: "Piernas", musculos: "Cuádriceps · Isquios · Glúteos",
    puestos: [
      { grupo: "cuadriceps", patrones: ["sentadilla"], rol: "principal" },
      { grupo: "femoral",    patrones: ["bisagra", "curlFemoral"], rol: "principal" },
      { grupo: "gluteo",     patrones: ["hipThrust", "zancada", "abduccion"], rol: "accesorio" },
      { grupo: "cuadriceps", patrones: ["extensionRodilla", "zancada"], rol: "accesorio" },
      { grupo: "gemelo",     patrones: ["gemelos"], rol: "accesorio" },
      { grupo: "core",       patrones: ["core", "abdominales"], rol: "accesorio" }
    ] },

  torso: { nombre: "Torso", corto: "Torso", musculos: "Pecho · Espalda · Hombros · Brazos",
    puestos: [
      { grupo: "pecho",   patrones: ["pressHorizontal"], rol: "principal" },
      { grupo: "espalda", patrones: ["remoHorizontal", "jalonVertical"], rol: "principal" },
      { grupo: "hombro",  patrones: ["pressVertical", "elevacionLateral"], rol: "accesorio" },
      { grupo: "biceps",  patrones: ["curlBiceps"], rol: "accesorio" },
      { grupo: "triceps", patrones: ["extensionTriceps"], rol: "accesorio" }
    ] }
};

/* Qué rotación le toca a cada persona según cuántos días por semana puede ir.
   Con 2 o 3 días conviene cuerpo completo: si faltás un día no te quedás
   sin entrenar medio cuerpo. */
const SPLITS = {
  2: ["fullA", "fullB"],
  3: ["fullA", "fullB", "fullC"],
  4: ["torso", "pierna", "empuje", "tiron"],
  5: ["empuje", "tiron", "pierna", "torso", "pierna"],
  6: ["empuje", "tiron", "pierna", "empuje", "tiron", "pierna"]
};

const splitDe = perfil => SPLITS[Math.min(6, Math.max(2, (perfil && perfil.dias) || 3))];

/* ---------- qué toca hoy ---------- */
function siguienteBloque(perfil) {
  const split = splitDe(perfil);
  const hechas = (S.sesiones || []).slice(-12).map(s => s.bloque);
  if (!hechas.length) return split[0];

  /* Buscamos el bloque del split que hace más tiempo no se hace. */
  let mejor = split[0], masViejo = -1;
  split.forEach(b => {
    let distancia = hechas.length;
    for (let i = hechas.length - 1; i >= 0; i--) {
      if (hechas[i] === b) { distancia = hechas.length - 1 - i; break; }
    }
    if (distancia > masViejo) { masViejo = distancia; mejor = b; }
  });
  return mejor;
}

const diasDesdeUltima = () => {
  const s = (S.sesiones || [])[S.sesiones.length - 1];
  if (!s) return null;
  return Math.floor((hoyISO_date() - new Date(s.fecha + "T00:00:00")) / 86400000);
};

/* ---------- elegir el ejercicio de cada puesto ---------- */
function elegirEjercicio(puesto, pool, usados, semilla) {
  const candidatos = pool.filter(e =>
    !usados.has(e.id) &&
    puesto.patrones.includes(e.patron) &&
    (e.grupo === puesto.grupo || puesto.patrones.includes(e.patron)));

  if (!candidatos.length) return null;

  /* Para el puesto principal preferimos compuestos; para el accesorio da igual. */
  const orden = candidatos.slice().sort((a, b) => {
    if (puesto.rol === "principal" && (a.tipo === "compuesto") !== (b.tipo === "compuesto"))
      return a.tipo === "compuesto" ? -1 : 1;
    return puesto.patrones.indexOf(a.patron) - puesto.patrones.indexOf(b.patron);
  });

  /* La semilla hace que la rutina varíe de semana a semana sin volverse un caos. */
  const top = orden.slice(0, Math.min(3, orden.length));
  return top[semilla % top.length];
}

/* ---------- carga sugerida ---------- */
function sugerirCarga(ej, perfil) {
  const previo = S.cargas && S.cargas[ej.id];
  if (previo && previo.kg != null) return previo.kg;
  if (ej.equipo === "libre" || ej.tipo === "cardio") return 0;

  /* Primer arranque: un punto de partida conservador según peso corporal.
     Siempre va a estar del lado liviano; para eso está la progresión. */
  const p = pesoActual();
  const f = { compuesto: 0.35, aislado: 0.12 }[ej.tipo] || 0.2;
  const porNivel = { principiante: 0.7, intermedio: 1, avanzado: 1.3 }[(perfil && perfil.nivel) || "principiante"];
  const porSexo = (perfil && perfil.sexo === "mujer") ? 0.7 : 1;
  const bruto = p * f * porNivel * porSexo;
  const paso = ej.salto || 2.5;
  return Math.max(paso, Math.round(bruto / paso) * paso);
}

/* Después de una sesión: si completó todo arriba del rango, sube el peso. */
function actualizarProgresion(item, seriesHechas, repsLogradas) {
  if (!S.cargas) S.cargas = {};
  const ej = porId(item.id);
  if (!ej) return null;
  const previo = S.cargas[ej.id] || {};
  const completo = seriesHechas >= item.series && repsLogradas >= item.reps[1];
  let kg = item.kg;
  let subio = false;
  if (completo && ej.salto > 0) { kg = item.kg + ej.salto; subio = true; }
  S.cargas[ej.id] = { kg, reps: repsLogradas, fecha: hoyISO(), racha: completo ? (previo.racha || 0) + 1 : 0 };
  return subio ? kg : null;
}

/* ---------- armar la rutina del día ---------- */
function armarRutina(bloqueKey, perfil) {
  const bloque = BLOQUES[bloqueKey] || BLOQUES.fullA;
  const evitar = evitarPorLimitaciones(perfil && perfil.limitaciones);
  const pool = disponibles({ ...perfil, evitar: [...(perfil.evitar || []), ...evitar] });
  const obj = OBJETIVOS[(perfil && perfil.objetivo) || "salud"];
  const niv = NIVELES[(perfil && perfil.nivel) || "principiante"];
  const semilla = Math.floor(((S.sesiones || []).length) / splitDe(perfil).length);

  const usados = new Set();
  const plan = [];

  bloque.puestos.forEach((puesto, i) => {
    const ej = elegirEjercicio(puesto, pool, usados, semilla + i);
    if (!ej) return;
    usados.add(ej.id);
    const series = puesto.rol === "principal" ? niv.series[1] : niv.series[0];
    plan.push({
      id: ej.id,
      nombre: ej.nombre,
      grupo: ej.grupo,
      rol: puesto.rol,
      series,
      reps: ej.porTiempo ? [30, 60] : obj.reps,
      porTiempo: !!ej.porTiempo,
      descanso: puesto.rol === "principal" ? obj.descanso + 20 : obj.descanso,
      kg: sugerirCarga(ej, perfil),
      met: ej.met
    });
  });

  /* Si el objetivo es bajar de peso, cerramos con cardio suave. */
  if (obj.ajuste < 0) {
    const cardio = pool.find(e => e.tipo === "cardio");
    if (cardio) plan.push({
      id: cardio.id, nombre: cardio.nombre, grupo: "cardio", rol: "cierre",
      series: 1, reps: [(perfil && perfil.objetivo) === "bajar" ? 15 : 10, 20],
      porTiempo: true, minutos: true, descanso: 0, kg: 0, met: cardio.met
    });
  }

  return { bloque: bloqueKey, nombre: bloque.nombre, musculos: bloque.musculos, plan };
}

/* Cuánto va a durar, más o menos. Sirve para el que tiene media hora y nada más. */
function duracionEstimada(rutina) {
  let seg = 300; /* entrada en calor */
  rutina.plan.forEach(it => {
    if (it.minutos) { seg += it.reps[0] * 60; return; }
    const porSerie = it.porTiempo ? it.reps[1] : it.reps[1] * 3.5;
    seg += it.series * (porSerie + it.descanso);
  });
  return Math.round(seg / 60);
}

/* Versión corta, para cuando llegás con el tiempo justo. */
function recortarRutina(rutina, minutos) {
  const copia = { ...rutina, plan: rutina.plan.slice() };
  while (duracionEstimada(copia) > minutos && copia.plan.length > 2) {
    let i = copia.plan.map(p => p.rol).lastIndexOf("accesorio");
    if (i < 0) i = copia.plan.length - 1;
    copia.plan.splice(i, 1);
  }
  copia.recortada = true;
  return copia;
}

const CALENTAMIENTO = [
  "5 minutos de caminata o bici suave para entrar en calor.",
  "Movés hombros, cadera y rodillas en círculos, sin peso.",
  "La primera serie de cada ejercicio grande, con la mitad del peso."
];
