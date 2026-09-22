"use strict";
/* ============================================================
   ejercicios.js — la biblioteca de movimientos
   Cada ejercicio sabe qué músculo trabaja, qué necesita para hacerse,
   con qué dibujo se explica y qué es lo que la gente hace mal.
   El motor arma la rutina eligiendo de acá.
   ============================================================ */

/* Qué hay disponible según dónde entrena la persona.
   El motor nunca le va a proponer una máquina si entrena en casa. */
const EQUIPO = {
  gimnasio: { nombre: "Gimnasio completo",  tiene: ["maquina", "polea", "barra", "mancuernas", "banco", "cardio", "libre"] },
  mancuernas: { nombre: "Mancuernas en casa", tiene: ["mancuernas", "banco", "libre"] },
  casa:      { nombre: "Solo mi cuerpo",     tiene: ["libre"] }
};

const GRUPOS = {
  pecho:    "Pecho",
  espalda:  "Espalda",
  hombro:   "Hombros",
  biceps:   "Bíceps",
  triceps:  "Tríceps",
  cuadriceps: "Cuádriceps",
  femoral:  "Isquios",
  gluteo:   "Glúteos",
  gemelo:   "Gemelos",
  core:     "Abdomen",
  trapecio: "Trapecios",
  cardio:   "Cardio"
};

/* nivel: 1 arranca cualquiera · 2 pide algo de experiencia · 3 avanzado
   met:   cuánto gasta, para estimar las calorías
   tipo:  compuesto (varios músculos) o aislado (uno solo) */
const EJERCICIOS = [

  /* ---------------- PECHO ---------------- */
  { id: "press-banca", nombre: "Press de banca", grupo: "pecho", patron: "pressHorizontal",
    equipo: "barra", nivel: 2, tipo: "compuesto", met: 6, salto: 2.5,
    como: "Acostado en el banco, pies firmes en el piso. Bajá la barra hasta rozar el pecho y empujá hacia arriba sin trabar el codo.",
    cuidado: "No rebotes la barra en el pecho ni despegues la cintura del banco.",
    video: "press de banca tecnica correcta" },

  { id: "press-mancuernas", nombre: "Press plano con mancuernas", grupo: "pecho", patron: "pressHorizontal",
    equipo: "mancuernas", nivel: 1, tipo: "compuesto", met: 6, salto: 2,
    como: "Una mancuerna en cada mano a la altura del pecho. Empujá hacia arriba juntándolas apenas, y bajá despacio.",
    cuidado: "Bajá controlado: la parte de bajar es la que más músculo construye.",
    video: "press plano con mancuernas" },

  { id: "press-maquina", nombre: "Press de pecho en máquina", grupo: "pecho", patron: "pressHorizontal",
    equipo: "maquina", nivel: 1, tipo: "compuesto", met: 5, salto: 5,
    como: "Sentate con la espalda apoyada y los manubrios a la altura del pecho. Empujá al frente y volvé despacio.",
    cuidado: "Si los manubrios te quedan arriba de los hombros, bajá el asiento.",
    video: "press de pecho en maquina" },

  { id: "press-inclinado", nombre: "Press inclinado con mancuernas", grupo: "pecho", patron: "pressHorizontal",
    equipo: "mancuernas", nivel: 2, tipo: "compuesto", met: 6, salto: 2,
    como: "Banco a 30°. Mismo movimiento que el press plano, pero apunta al pecho de arriba.",
    cuidado: "Más de 45° de inclinación y el trabajo se va todo al hombro.",
    video: "press inclinado con mancuernas" },

  { id: "aperturas", nombre: "Aperturas con mancuernas", grupo: "pecho", patron: "apertura",
    equipo: "mancuernas", nivel: 1, tipo: "aislado", met: 4, salto: 1,
    como: "Acostado, brazos abiertos con el codo apenas doblado. Juntá las manos arriba del pecho como si abrazaras un barril.",
    cuidado: "Peso liviano. Acá se busca el estiramiento, no la carga.",
    video: "aperturas con mancuernas pecho" },

  { id: "peck-deck", nombre: "Peck deck (contractor)", grupo: "pecho", patron: "apertura",
    equipo: "maquina", nivel: 1, tipo: "aislado", met: 4, salto: 5,
    como: "Sentado y con la espalda apoyada, juntá los brazos al frente y apretá el pecho un segundo.",
    cuidado: "Volvé despacio, sin dejar que el peso te tire el brazo hacia atrás de golpe.",
    video: "peck deck maquina pecho" },

  { id: "flexiones", nombre: "Flexiones de brazos", grupo: "pecho", patron: "flexion",
    equipo: "libre", nivel: 1, tipo: "compuesto", met: 6, salto: 0,
    como: "Manos un poco más abiertas que los hombros, cuerpo en línea recta. Bajá hasta casi tocar el piso y empujá.",
    cuidado: "Si no salen completas, apoyá las rodillas o hacelas contra una pared. Cuentan igual.",
    video: "flexiones de brazos tecnica" },

  /* ---------------- ESPALDA ---------------- */
  { id: "jalon-pecho", nombre: "Jalón al pecho", grupo: "espalda", patron: "jalonVertical",
    equipo: "polea", nivel: 1, tipo: "compuesto", met: 5, salto: 5,
    como: "Agarre más ancho que los hombros. Llevá la barra al pecho tirando con los codos hacia abajo.",
    cuidado: "No tires la barra atrás de la nuca ni te balancees hacia atrás.",
    video: "jalon al pecho tecnica" },

  { id: "dominadas", nombre: "Dominadas", grupo: "espalda", patron: "dominada",
    equipo: "libre", nivel: 3, tipo: "compuesto", met: 8, salto: 0,
    como: "Colgado de la barra, subí hasta pasar el mentón llevando los codos al cuerpo.",
    cuidado: "Si todavía no salen, hacelas con banda elástica o saltando y bajando despacio.",
    video: "dominadas progresion principiantes" },

  { id: "remo-polea", nombre: "Remo en polea baja", grupo: "espalda", patron: "remoHorizontal",
    equipo: "polea", nivel: 1, tipo: "compuesto", met: 5, salto: 5,
    como: "Sentado con la espalda recta, tirá del agarre hacia el ombligo juntando los omóplatos.",
    cuidado: "El tirón sale de la espalda, no de mecerte para atrás.",
    video: "remo en polea baja tecnica" },

  { id: "remo-mancuerna", nombre: "Remo con mancuerna a una mano", grupo: "espalda", patron: "remoHorizontal",
    equipo: "mancuernas", nivel: 1, tipo: "compuesto", met: 5, salto: 2,
    como: "Una rodilla y una mano en el banco, espalda plana. Subí la mancuerna al costado de la cadera.",
    cuidado: "No gires el torso para levantar más peso.",
    video: "remo con mancuerna a una mano" },

  { id: "remo-maquina", nombre: "Remo en máquina", grupo: "espalda", patron: "remoHorizontal",
    equipo: "maquina", nivel: 1, tipo: "compuesto", met: 5, salto: 5,
    como: "Pecho apoyado en la almohadilla, tirá hacia atrás llevando los codos pegados al cuerpo.",
    cuidado: "Que el pecho no se despegue del apoyo.",
    video: "remo en maquina espalda" },

  { id: "remo-barra", nombre: "Remo con barra", grupo: "espalda", patron: "remoHorizontal",
    equipo: "barra", nivel: 3, tipo: "compuesto", met: 6, salto: 2.5,
    como: "Torso inclinado a 45°, espalda recta. Llevá la barra al ombligo y bajá controlado.",
    cuidado: "Si la espalda se te redondea, bajá el peso. Este es de los que más lastiman mal hechos.",
    video: "remo con barra tecnica" },

  /* ---------------- HOMBROS ---------------- */
  { id: "press-militar-manc", nombre: "Press de hombros con mancuernas", grupo: "hombro", patron: "pressVertical",
    equipo: "mancuernas", nivel: 1, tipo: "compuesto", met: 5, salto: 2,
    como: "Sentado con respaldo. Mancuernas a la altura de las orejas, empujá hacia arriba.",
    cuidado: "No arquees la cintura para ayudarte: apretá el abdomen.",
    video: "press de hombros con mancuernas" },

  { id: "press-hombro-maquina", nombre: "Press de hombros en máquina", grupo: "hombro", patron: "pressVertical",
    equipo: "maquina", nivel: 1, tipo: "compuesto", met: 5, salto: 5,
    como: "Espalda apoyada, manubrios a la altura del hombro. Empujá hacia arriba sin trabar el codo.",
    cuidado: "Movimiento parejo: si un brazo llega antes, bajá el peso.",
    video: "press de hombros en maquina" },

  { id: "press-militar", nombre: "Press militar con barra", grupo: "hombro", patron: "pressVertical",
    equipo: "barra", nivel: 3, tipo: "compuesto", met: 6, salto: 2.5,
    como: "De pie, barra a la altura de la clavícula. Empujá arriba de la cabeza y volvé al pecho.",
    cuidado: "Glúteos y abdomen apretados para no tirar la cintura hacia adelante.",
    video: "press militar con barra tecnica" },

  { id: "elevaciones-laterales", nombre: "Elevaciones laterales", grupo: "hombro", patron: "elevacionLateral",
    equipo: "mancuernas", nivel: 1, tipo: "aislado", met: 4, salto: 1,
    como: "Brazos al costado, codo apenas doblado. Subí hasta la altura del hombro y bajá despacio.",
    cuidado: "Peso chico. Si tenés que impulsarte, es demasiado.",
    video: "elevaciones laterales tecnica" },

  { id: "elevaciones-frontales", nombre: "Elevaciones frontales", grupo: "hombro", patron: "elevacionFrontal",
    equipo: "mancuernas", nivel: 1, tipo: "aislado", met: 4, salto: 1,
    como: "Mancuernas apoyadas en los muslos, subí al frente hasta la altura del hombro.",
    cuidado: "Un brazo por vez si te cuesta mantener la postura.",
    video: "elevaciones frontales hombro" },

  { id: "encogimientos", nombre: "Encogimiento de hombros", grupo: "trapecio", patron: "encogimiento",
    equipo: "mancuernas", nivel: 1, tipo: "aislado", met: 4, salto: 2,
    como: "Mancuernas al costado, subí los hombros hacia las orejas y sostené un segundo.",
    cuidado: "No gires los hombros: es para arriba y para abajo.",
    video: "encogimiento de hombros trapecio" },

  /* ---------------- BRAZOS ---------------- */
  { id: "curl-mancuernas", nombre: "Curl de bíceps con mancuernas", grupo: "biceps", patron: "curlBiceps",
    equipo: "mancuernas", nivel: 1, tipo: "aislado", met: 4, salto: 1,
    como: "Codos pegados al cuerpo y quietos. Subí la mancuerna girando la muñeca hacia arriba.",
    cuidado: "Si el codo se va para adelante, estás usando el hombro.",
    video: "curl de biceps con mancuernas" },

  { id: "curl-barra", nombre: "Curl de bíceps con barra", grupo: "biceps", patron: "curlBiceps",
    equipo: "barra", nivel: 2, tipo: "aislado", met: 4, salto: 2.5,
    como: "De pie, agarre al ancho de los hombros. Subí la barra sin mover los codos.",
    cuidado: "Nada de balancear la cintura para levantarla.",
    video: "curl de biceps con barra" },

  { id: "curl-martillo", nombre: "Curl martillo", grupo: "biceps", patron: "curlBiceps",
    equipo: "mancuernas", nivel: 1, tipo: "aislado", met: 4, salto: 1,
    como: "Igual que el curl pero con las palmas enfrentadas, como si agarraras un martillo.",
    cuidado: "Subí y bajá con el mismo control.",
    video: "curl martillo biceps" },

  { id: "triceps-polea", nombre: "Extensión de tríceps en polea", grupo: "triceps", patron: "extensionTriceps",
    equipo: "polea", nivel: 1, tipo: "aislado", met: 4, salto: 2.5,
    como: "Codos pegados al costado. Estirá los brazos hacia abajo y volvé despacio.",
    cuidado: "Los codos no se mueven de su lugar en todo el movimiento.",
    video: "extension de triceps en polea" },

  { id: "triceps-mancuerna", nombre: "Extensión de tríceps con mancuerna", grupo: "triceps", patron: "extensionTriceps",
    equipo: "mancuernas", nivel: 1, tipo: "aislado", met: 4, salto: 1,
    como: "Mancuerna detrás de la nuca con las dos manos. Estirá los brazos hacia arriba.",
    cuidado: "Codos apuntando al techo, cerca de la cabeza.",
    video: "extension de triceps con mancuerna" },

  { id: "fondos-banco", nombre: "Fondos en banco", grupo: "triceps", patron: "fondos",
    equipo: "libre", nivel: 1, tipo: "compuesto", met: 5, salto: 0,
    como: "Manos apoyadas en el borde de un banco, bajá el cuerpo doblando los codos y subí.",
    cuidado: "Si te molesta el hombro, bajá menos.",
    video: "fondos en banco triceps" },

  /* ---------------- PIERNAS ---------------- */
  { id: "sentadilla-barra", nombre: "Sentadilla con barra", grupo: "cuadriceps", patron: "sentadilla",
    equipo: "barra", nivel: 3, tipo: "compuesto", met: 7, salto: 2.5,
    como: "Barra apoyada en los trapecios. Cadera atrás y abajo, pecho alto, hasta que el muslo quede paralelo al piso.",
    cuidado: "Rodillas siguiendo la línea de los pies, talones siempre apoyados.",
    video: "sentadilla con barra tecnica" },

  { id: "sentadilla-goblet", nombre: "Sentadilla goblet", grupo: "cuadriceps", patron: "sentadilla",
    equipo: "mancuernas", nivel: 1, tipo: "compuesto", met: 6, salto: 2,
    como: "Una mancuerna sostenida contra el pecho. Bajá entre las rodillas manteniendo la espalda recta.",
    cuidado: "Es la mejor forma de aprender a sentarse bien antes de pasar a la barra.",
    video: "sentadilla goblet tecnica" },

  { id: "sentadilla-libre", nombre: "Sentadilla sin peso", grupo: "cuadriceps", patron: "sentadilla",
    equipo: "libre", nivel: 1, tipo: "compuesto", met: 5, salto: 0,
    como: "Pies al ancho de los hombros, brazos al frente para equilibrar. Cadera atrás y abajo.",
    cuidado: "Si te vas para adelante, probá apoyando la espalda en la pared.",
    video: "sentadilla sin peso tecnica" },

  { id: "prensa", nombre: "Prensa de piernas", grupo: "cuadriceps", patron: "sentadilla",
    equipo: "maquina", nivel: 1, tipo: "compuesto", met: 6, salto: 10,
    como: "Pies en la plataforma al ancho de la cadera. Bajá hasta 90° y empujá sin trabar la rodilla.",
    cuidado: "No bajes tanto que la cadera se despegue del respaldo.",
    video: "prensa de piernas tecnica" },

  { id: "extension-cuadriceps", nombre: "Extensión de cuádriceps", grupo: "cuadriceps", patron: "extensionRodilla",
    equipo: "maquina", nivel: 1, tipo: "aislado", met: 4, salto: 5,
    como: "Sentado, estirá las piernas al frente y apretá arriba un segundo.",
    cuidado: "Bajá controlado, no dejes caer el peso.",
    video: "extension de cuadriceps maquina" },

  { id: "peso-muerto-rumano", nombre: "Peso muerto rumano", grupo: "femoral", patron: "bisagra",
    equipo: "mancuernas", nivel: 2, tipo: "compuesto", met: 6, salto: 2,
    como: "Peso pegado a los muslos. Llevá la cadera hacia atrás bajando el peso por la pierna, espalda recta.",
    cuidado: "Vas a sentir el estirón atrás del muslo: ahí frená y subí.",
    video: "peso muerto rumano tecnica" },

  { id: "curl-femoral", nombre: "Curl femoral", grupo: "femoral", patron: "curlFemoral",
    equipo: "maquina", nivel: 1, tipo: "aislado", met: 4, salto: 5,
    como: "Boca abajo, llevá los talones hacia el glúteo y volvé despacio.",
    cuidado: "Que la cadera no se despegue del apoyo.",
    video: "curl femoral acostado maquina" },

  { id: "estocadas", nombre: "Estocadas", grupo: "gluteo", patron: "zancada",
    equipo: "mancuernas", nivel: 2, tipo: "compuesto", met: 6, salto: 2,
    como: "Un paso largo al frente, bajá hasta que la rodilla de atrás casi toque el piso y volvé.",
    cuidado: "El torso derecho y la rodilla de adelante detrás de la punta del pie.",
    video: "estocadas tecnica correcta" },

  { id: "estocadas-libre", nombre: "Estocadas sin peso", grupo: "gluteo", patron: "zancada",
    equipo: "libre", nivel: 1, tipo: "compuesto", met: 5, salto: 0,
    como: "Mismo movimiento que la estocada, con las manos en la cintura.",
    cuidado: "Si perdés el equilibrio, apoyate con una mano en la pared.",
    video: "estocadas sin peso" },

  { id: "hip-thrust", nombre: "Hip thrust", grupo: "gluteo", patron: "hipThrust",
    equipo: "barra", nivel: 2, tipo: "compuesto", met: 6, salto: 2.5,
    como: "Espalda apoyada en un banco, peso sobre la cadera. Empujá hasta formar una línea recta y apretá el glúteo.",
    cuidado: "El mentón mirando al pecho, no al techo.",
    video: "hip thrust tecnica" },

  { id: "puente-gluteo", nombre: "Puente de glúteos", grupo: "gluteo", patron: "hipThrust",
    equipo: "libre", nivel: 1, tipo: "aislado", met: 4, salto: 0,
    como: "Acostado boca arriba con las rodillas dobladas, subí la cadera apretando los glúteos.",
    cuidado: "Empujá con los talones, no con la punta del pie.",
    video: "puente de gluteos ejercicio" },

  { id: "abductores", nombre: "Abductores en máquina", grupo: "gluteo", patron: "abduccion",
    equipo: "maquina", nivel: 1, tipo: "aislado", met: 4, salto: 5,
    como: "Sentado, abrí las rodillas contra la resistencia y volvé despacio.",
    cuidado: "Torso quieto: no te tires para atrás para abrir más.",
    video: "abductores en maquina" },

  { id: "gemelos", nombre: "Elevación de gemelos", grupo: "gemelo", patron: "gemelos",
    equipo: "libre", nivel: 1, tipo: "aislado", met: 4, salto: 2,
    como: "Puntas de pie en un escalón, bajá el talón hasta sentir el estiramiento y subí lo más alto que puedas.",
    cuidado: "Movimiento completo y pausa arriba: si no, no sirve de nada.",
    video: "elevacion de gemelos tecnica" },

  /* ---------------- ABDOMEN ---------------- */
  { id: "plancha", nombre: "Plancha", grupo: "core", patron: "core",
    equipo: "libre", nivel: 1, tipo: "aislado", met: 4, salto: 0, porTiempo: true,
    como: "Antebrazos y puntas de pie en el piso, cuerpo en línea recta. Sostené apretando el abdomen y el glúteo.",
    cuidado: "Si la cintura se hunde, cortá la serie: aguantar mal no suma.",
    video: "plancha abdominal tecnica" },

  { id: "abdominales", nombre: "Abdominales", grupo: "core", patron: "abdominales",
    equipo: "libre", nivel: 1, tipo: "aislado", met: 4, salto: 0,
    como: "Rodillas dobladas, subí los hombros del piso llevando las costillas a la cadera.",
    cuidado: "No te tires del cuello con las manos.",
    video: "abdominales crunch tecnica" },

  { id: "elevacion-piernas", nombre: "Elevación de piernas", grupo: "core", patron: "elevacionPiernas",
    equipo: "libre", nivel: 2, tipo: "aislado", met: 4, salto: 0,
    como: "Acostado, piernas estiradas. Subilas hasta 90° y bajá sin tocar el piso.",
    cuidado: "La cintura pegada al piso todo el tiempo. Si se arquea, doblá las rodillas.",
    video: "elevacion de piernas abdomen" },

  /* ---------------- CARDIO ---------------- */
  { id: "cardio-caminata", nombre: "Caminata en cinta", grupo: "cardio", patron: "cardio",
    equipo: "cardio", nivel: 1, tipo: "cardio", met: 5, salto: 0, porTiempo: true,
    como: "Ritmo al que podés hablar de a frases cortas, con algo de inclinación.",
    cuidado: "Sin agarrarte de los pasamanos: te saca la mitad del trabajo.",
    video: "caminata en cinta inclinacion quemar grasa" },

  { id: "cardio-bici", nombre: "Bicicleta fija", grupo: "cardio", patron: "cardio",
    equipo: "cardio", nivel: 1, tipo: "cardio", met: 6, salto: 0, porTiempo: true,
    como: "Asiento a la altura de la cadera. Ritmo sostenido y cómodo.",
    cuidado: "La rodilla nunca del todo estirada abajo.",
    video: "bicicleta fija altura del asiento" },

  { id: "cardio-eliptico", nombre: "Elíptico", grupo: "cardio", patron: "cardio",
    equipo: "cardio", nivel: 1, tipo: "cardio", met: 6, salto: 0, porTiempo: true,
    como: "Usá los brazos además de las piernas, con la espalda derecha.",
    cuidado: "Resistencia suficiente para que no se te escapen los pies.",
    video: "eliptico tecnica correcta" },

  { id: "cardio-libre", nombre: "Caminata rápida", grupo: "cardio", patron: "cardio",
    equipo: "libre", nivel: 1, tipo: "cardio", met: 5, salto: 0, porTiempo: true,
    como: "Al aire libre o en el lugar, a ritmo firme.",
    cuidado: "Buscá terreno con alguna subida si podés.",
    video: "caminata rapida beneficios" }
];

/* ---------- búsquedas ---------- */
const porId = id => EJERCICIOS.find(e => e.id === id);

function disponibles(perfil) {
  const tiene = (EQUIPO[perfil && perfil.equipo] || EQUIPO.gimnasio).tiene;
  const nivelMax = perfil && perfil.nivel === "avanzado" ? 3 : perfil && perfil.nivel === "intermedio" ? 2 : 1;
  return EJERCICIOS.filter(e => tiene.includes(e.equipo) && e.nivel <= nivelMax + (nivelMax < 3 ? 1 : 0) &&
    !(perfil && (perfil.evitar || []).includes(e.id)));
}

/* Ejercicios que conviene esquivar según lo que le duele a la persona. */
const LIMITACIONES = {
  rodilla:  { nombre: "Rodillas", evitar: ["sentadilla-barra", "estocadas", "estocadas-libre", "extension-cuadriceps"] },
  hombro:   { nombre: "Hombros",  evitar: ["press-militar", "press-banca", "elevaciones-frontales", "fondos-banco"] },
  espalda:  { nombre: "Espalda baja", evitar: ["remo-barra", "peso-muerto-rumano", "sentadilla-barra"] },
  muneca:   { nombre: "Muñecas",  evitar: ["flexiones", "curl-barra", "fondos-banco"] }
};

function evitarPorLimitaciones(lims) {
  const fuera = [];
  (lims || []).forEach(l => { if (LIMITACIONES[l]) fuera.push(...LIMITACIONES[l].evitar); });
  return [...new Set(fuera)];
}

const urlVideo = e => "https://www.youtube.com/results?search_query=" + encodeURIComponent(e.video);
