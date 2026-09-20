"use strict";
/* ============================================================
   cuerpo.js — la evaluación corporal
   Con la altura, el peso y tres medidas con cinta métrica ya se puede
   estimar grasa corporal, gasto calórico y cuántas calorías comer.
   Todo lo que devuelve es una estimación, no un estudio médico.
   ============================================================ */

const ACTIVIDAD = {
  sedentario: { nombre: "Trabajo sentado, poco movimiento", factor: 1.2 },
  ligero:     { nombre: "Algo de movimiento en el día",     factor: 1.375 },
  moderado:   { nombre: "Trabajo de pie o bastante caminata", factor: 1.55 },
  alto:       { nombre: "Trabajo físico pesado",            factor: 1.725 }
};

const OBJETIVOS = {
  bajar:    { nombre: "Bajar de peso",        ajuste: -0.20, proteina: 2.0, reps: [12, 15], descanso: 50 },
  recomponer:{ nombre: "Bajar grasa y tonificar", ajuste: -0.10, proteina: 2.0, reps: [10, 12], descanso: 70 },
  musculo:  { nombre: "Ganar músculo",        ajuste:  0.10, proteina: 1.8, reps: [8, 12],  descanso: 90 },
  salud:    { nombre: "Salud y estado físico", ajuste: 0,     proteina: 1.6, reps: [10, 12], descanso: 70 }
};

const NIVELES = {
  principiante: { nombre: "Principiante", series: [2, 3], desc: "Menos de 6 meses entrenando, o volviendo después de un parate" },
  intermedio:   { nombre: "Intermedio",   series: [3, 4], desc: "Entrenás hace un tiempo y conocés los ejercicios básicos" },
  avanzado:     { nombre: "Avanzado",     series: [4, 4], desc: "Años de entrenamiento y buena técnica en los movimientos grandes" }
};

/* ---------- utilidades ---------- */
function edadDe(perfil) {
  if (!perfil) return 30;
  if (perfil.edad) return perfil.edad;
  if (!perfil.nacimiento) return 30;
  const n = new Date(perfil.nacimiento), h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
  return e > 10 && e < 100 ? e : 30;
}

const ultimaMedida = () => (S.medidas && S.medidas.length) ? S.medidas[S.medidas.length - 1] : null;

function pesoActual() {
  const m = ultimaMedida();
  if (m && m.peso) return m.peso;
  return S.perfil && S.perfil.peso ? S.perfil.peso : 75;
}

/* ---------- índices ---------- */
function imcDe(peso, altura) {
  if (!peso || !altura) return null;
  return peso / Math.pow(altura / 100, 2);
}

function etiquetaIMC(v) {
  if (v == null) return { texto: "—", tono: "neutro" };
  if (v < 18.5) return { texto: "Por debajo del peso saludable", tono: "aviso" };
  if (v < 25)   return { texto: "Peso saludable", tono: "bien" };
  if (v < 30)   return { texto: "Sobrepeso", tono: "aviso" };
  if (v < 35)   return { texto: "Obesidad grado 1", tono: "mal" };
  return { texto: "Obesidad grado 2 o más", tono: "mal" };
}

/* Método de la Marina de EE.UU.: la estimación más fiable que se puede hacer
   con una cinta métrica y sin aparatos. */
function grasaNavy(sexo, altura, cuello, cintura, cadera) {
  if (!altura || !cuello || !cintura) return null;
  const log = Math.log10;
  let v;
  if (sexo === "mujer") {
    if (!cadera) return null;
    if (cintura + cadera - cuello <= 0) return null;
    v = 495 / (1.29579 - 0.35004 * log(cintura + cadera - cuello) + 0.22100 * log(altura)) - 450;
  } else {
    if (cintura - cuello <= 0) return null;
    v = 495 / (1.0324 - 0.19077 * log(cintura - cuello) + 0.15456 * log(altura)) - 450;
  }
  return (v > 2 && v < 70) ? v : null;
}

function etiquetaGrasa(v, sexo) {
  if (v == null) return { texto: "Falta medirte con la cinta", tono: "neutro" };
  const t = sexo === "mujer"
    ? [[13, "Muy baja"], [21, "Atlética"], [25, "Buena"], [32, "Aceptable"], [100, "Alta"]]
    : [[6,  "Muy baja"], [14, "Atlética"], [18, "Buena"], [25, "Aceptable"], [100, "Alta"]];
  for (const [lim, txt] of t) {
    if (v < lim) return { texto: txt, tono: txt === "Alta" ? "mal" : txt === "Aceptable" ? "aviso" : "bien" };
  }
  return { texto: "Alta", tono: "mal" };
}

/* Mifflin-St Jeor: lo que gasta el cuerpo en reposo. */
function metabolismoBasal(sexo, peso, altura, edad) {
  if (!peso || !altura) return null;
  const base = 10 * peso + 6.25 * altura - 5 * edad;
  return sexo === "mujer" ? base - 161 : base + 5;
}

/* Relación cintura-altura: el aviso más simple sobre grasa abdominal. */
function riesgoCintura(cintura, altura) {
  if (!cintura || !altura) return null;
  const r = cintura / altura;
  if (r < 0.43) return { valor: r, texto: "Cintura muy chica para tu altura", tono: "aviso" };
  if (r < 0.50) return { valor: r, texto: "Cintura en rango saludable", tono: "bien" };
  if (r < 0.58) return { valor: r, texto: "Grasa abdominal aumentada", tono: "aviso" };
  return { valor: r, texto: "Grasa abdominal en zona de riesgo", tono: "mal" };
}

/* ---------- la evaluación completa ---------- */
function evaluar(perfil, medida) {
  if (!perfil) return null;
  const m = medida || ultimaMedida() || {};
  const peso = m.peso || perfil.peso;
  const altura = perfil.altura;
  const edad = edadDe(perfil);
  const sexo = perfil.sexo || "hombre";
  if (!peso || !altura) return null;

  const imc = imcDe(peso, altura);
  const grasa = grasaNavy(sexo, altura, m.cuello, m.cintura, m.cadera);
  const magra = grasa != null ? peso * (1 - grasa / 100) : null;
  const tmb = metabolismoBasal(sexo, peso, altura, edad);
  const factor = (ACTIVIDAD[perfil.actividad] || ACTIVIDAD.ligero).factor;
  const obj = OBJETIVOS[perfil.objetivo] || OBJETIVOS.salud;

  /* El entrenamiento suma aparte: lo estimamos sobre los días que entrena. */
  const extraEntreno = (perfil.dias || 3) * 300 / 7;
  const gasto = tmb ? tmb * factor + extraEntreno : null;
  const kcal = gasto ? gasto * (1 + obj.ajuste) : null;

  const proteina = Math.round((magra ? magra * 2.2 : peso * obj.proteina));
  const grasaG = kcal ? Math.round(kcal * 0.27 / 9) : null;
  const carbos = kcal ? Math.round((kcal - proteina * 4 - grasaG * 9) / 4) : null;

  const pesoMin = 18.5 * Math.pow(altura / 100, 2);
  const pesoMax = 24.9 * Math.pow(altura / 100, 2);

  return {
    peso, altura, edad, sexo,
    imc, imcEtq: etiquetaIMC(imc),
    grasa, grasaEtq: etiquetaGrasa(grasa, sexo),
    magra, tmb, gasto, kcal,
    proteina, grasaG, carbos,
    cintura: riesgoCintura(m.cintura, altura),
    pesoIdeal: [pesoMin, pesoMax],
    objetivo: obj,
    ritmoSemanal: obj.ajuste < 0 ? (gasto ? (gasto * -obj.ajuste * 7) / 7700 : null) : null
  };
}

/* Cuánto cambió respecto de la primera medición. */
function progresoCorporal() {
  if (!S.medidas || S.medidas.length < 2) return null;
  const a = S.medidas[0], b = S.medidas[S.medidas.length - 1];
  const ea = evaluar(S.perfil, a), eb = evaluar(S.perfil, b);
  if (!ea || !eb) return null;
  return {
    dias: Math.max(1, Math.round((new Date(b.fecha) - new Date(a.fecha)) / 86400000)),
    peso: (b.peso || 0) - (a.peso || 0),
    grasa: (ea.grasa != null && eb.grasa != null) ? eb.grasa - ea.grasa : null,
    magra: (ea.magra != null && eb.magra != null) ? eb.magra - ea.magra : null,
    cintura: (a.cintura && b.cintura) ? b.cintura - a.cintura : null
  };
}

/* Las calorías que se queman en una sesión, a partir del MET de cada ejercicio. */
function kcalSesion(minutos, peso, metPromedio) {
  if (!minutos || !peso) return 0;
  return Math.round((metPromedio || 5) * peso * (minutos / 60));
}

const MEDIDAS_CINTA = [
  { id: "cuello",      nombre: "Cuello",      donde: "Justo abajo de la nuez, con la cinta apenas apoyada." },
  { id: "cintura",     nombre: "Cintura",     donde: "A la altura del ombligo, relajado, sin meter la panza." },
  { id: "cadera",      nombre: "Cadera",      donde: "En la parte más ancha del glúteo.", soloMujer: false },
  { id: "pecho",       nombre: "Pecho",       donde: "A la altura de los pezones, respirando normal." },
  { id: "brazo",       nombre: "Brazo",       donde: "En el medio del bíceps, con el brazo relajado." },
  { id: "muslo",       nombre: "Muslo",       donde: "En la parte más gruesa, a mitad de camino entre cadera y rodilla." },
  { id: "pantorrilla", nombre: "Pantorrilla", donde: "En la parte más ancha del gemelo." }
];
