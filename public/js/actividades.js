"use strict";
/* ============================================================
   actividades.js — más formas de entrenar, además del gimnasio
   · Calistenia: con el peso del cuerpo. Cada movimiento es una escalera
     de variantes; cuando dominás una, la próxima vez pasás a la siguiente.
   · Funcional / HIIT: circuitos por tiempo, con un temporizador guiado.
   · Movilidad y estiramiento: sesiones cortas, también guiadas.
   · Bici, cinta o elíptico: cardio adentro, por tiempo e intensidad.
   ============================================================ */

GRUPOS.movilidad = "Movilidad";

/* ---------- los ejercicios nuevos ----------
   equipo "cali", "funcional" y "movilidad" no entran en las rutinas de
   gimnasio: se usan solo acá. Los que ya existían (flexiones, dominadas,
   plancha…) se reutilizan tal cual. */
const EJ_NUEVOS = [
  /* calistenia · empuje */
  { id: "flexion-pared", nombre: "Flexiones en la pared", grupo: "pecho", patron: "flexion", equipo: "cali", nivel: 1, tipo: "compuesto", met: 3.5, salto: 0,
    como: "De pie, a un paso largo de la pared, con las manos apoyadas a la altura del pecho. Llevá el pecho hacia la pared doblando los codos y empujá.",
    cuidado: "Cuerpo recto de pies a cabeza: que no se adelante la cadera.", video: "flexiones en la pared principiantes" },
  { id: "flexion-inclinada", nombre: "Flexiones con manos elevadas", grupo: "pecho", patron: "flexion", equipo: "cali", nivel: 1, tipo: "compuesto", met: 4.5, salto: 0,
    como: "Manos sobre un banco, una mesa firme o un escalón. Bajá el pecho hasta el borde y empujá. Cuanto más baja la superficie, más difícil.",
    cuidado: "Asegurate de que lo que usás no se mueva ni se deslice.", video: "flexiones inclinadas tecnica" },
  { id: "flexion-rodillas", nombre: "Flexiones con rodillas apoyadas", grupo: "pecho", patron: "flexion", equipo: "cali", nivel: 1, tipo: "compuesto", met: 5, salto: 0,
    como: "Como una flexión común, pero con las rodillas en el piso. Línea recta de rodillas a cabeza y pecho casi al piso.",
    cuidado: "No saques la cola para arriba: la cadera va alineada.", video: "flexiones de rodillas tecnica" },
  { id: "flexion-diamante", nombre: "Flexiones diamante", grupo: "triceps", patron: "flexion", equipo: "cali", nivel: 2, tipo: "compuesto", met: 6, salto: 0,
    como: "Manos juntas debajo del pecho, formando un rombo con pulgares e índices. Bajá con los codos pegados al cuerpo.",
    cuidado: "Si te molestan las muñecas, separá un poco las manos.", video: "flexiones diamante tecnica" },
  { id: "flexion-pies-elevados", nombre: "Flexiones con pies elevados", grupo: "pecho", patron: "flexion", equipo: "cali", nivel: 3, tipo: "compuesto", met: 7, salto: 0,
    como: "Pies sobre un banco o una silla, manos en el piso. Bajá hasta casi tocar con el pecho y empujá.",
    cuidado: "Apretá abdomen y glúteos para que la cintura no se hunda.", video: "flexiones pies elevados" },
  { id: "flexion-arquero", nombre: "Flexiones arquero", grupo: "pecho", patron: "flexion", equipo: "cali", nivel: 3, tipo: "compuesto", met: 7, salto: 0,
    como: "Manos muy abiertas. Bajá hacia un lado doblando ese brazo mientras el otro queda estirado. Alterná los lados.",
    cuidado: "Contá cada lado como una repetición. Paso previo a la flexión a un brazo.", video: "flexiones arquero tecnica" },

  /* calistenia · tirón */
  { id: "remo-toalla", nombre: "Remo con toalla en la puerta", grupo: "espalda", patron: "remoHorizontal", equipo: "cali", nivel: 1, tipo: "compuesto", met: 4, salto: 0,
    como: "Pasá una toalla alrededor del picaporte de una puerta cerrada y bien trabada. Agarrá las puntas, inclinate hacia atrás con los brazos estirados y tirá hasta acercar el pecho.",
    cuidado: "Probá primero que la puerta aguante. Cuanto más atrás los pies, más difícil.", video: "remo con toalla en la puerta" },
  { id: "remo-australiano-alto", nombre: "Remo australiano inclinado", grupo: "espalda", patron: "remoHorizontal", equipo: "cali", nivel: 1, tipo: "compuesto", met: 5, salto: 0,
    como: "Debajo de una barra a la altura de la cintura (o el borde de una mesa firme), colgado con el cuerpo inclinado y los talones en el piso. Tirá hasta llevar el pecho a la barra.",
    cuidado: "El cuerpo sube entero, como una tabla. Juntá los omóplatos arriba.", video: "remo australiano principiante" },
  { id: "remo-australiano", nombre: "Remo australiano", grupo: "espalda", patron: "remoHorizontal", equipo: "cali", nivel: 2, tipo: "compuesto", met: 6, salto: 0,
    como: "Igual que el inclinado, pero con la barra más baja y el cuerpo casi horizontal. Pecho a la barra en cada repetición.",
    cuidado: "No subas con el cuello: el que llega a la barra es el pecho.", video: "remo australiano tecnica" },
  { id: "dominada-negativa", nombre: "Dominadas negativas", grupo: "espalda", patron: "dominada", equipo: "cali", nivel: 2, tipo: "compuesto", met: 7, salto: 0, barra: true,
    como: "Subí saltando o con una silla hasta tener el mentón sobre la barra y bajá lo más lento que puedas, en 3 a 5 segundos.",
    cuidado: "Bajá controlado hasta estirar del todo los brazos. Cada bajada es una repetición.", video: "dominadas negativas" },
  { id: "dominada-pausa", nombre: "Dominadas con pausa arriba", grupo: "espalda", patron: "dominada", equipo: "cali", nivel: 3, tipo: "compuesto", met: 8, salto: 0, barra: true,
    como: "Una dominada común, pero aguantá dos segundos con el mentón sobre la barra antes de bajar.",
    cuidado: "Nada de balanceo ni patadas para subir.", video: "dominadas con pausa" },

  /* calistenia · piernas */
  { id: "sentadilla-pausa", nombre: "Sentadilla con pausa abajo", grupo: "cuadriceps", patron: "sentadilla", equipo: "cali", nivel: 1, tipo: "compuesto", met: 5, salto: 0,
    como: "Bajá como en una sentadilla común, quedate tres segundos abajo sin rebotar y subí.",
    cuidado: "Rodillas en la misma dirección que las puntas de los pies.", video: "sentadilla con pausa" },
  { id: "sentadilla-bulgara", nombre: "Sentadilla búlgara", grupo: "cuadriceps", patron: "zancada", equipo: "cali", nivel: 2, tipo: "compuesto", met: 6, salto: 0,
    como: "Un pie adelante y el empeine del otro apoyado atrás en una silla. Bajá hasta que la rodilla de atrás casi toque el piso. Hacé todas las repeticiones de un lado y después del otro.",
    cuidado: "El peso va en la pierna de adelante. Anotá las repeticiones de un solo lado.", video: "sentadilla bulgara tecnica" },
  { id: "pistol-asistida", nombre: "Sentadilla a una pierna asistida", grupo: "cuadriceps", patron: "sentadilla", equipo: "cali", nivel: 3, tipo: "compuesto", met: 6, salto: 0,
    como: "Agarrado de un marco de puerta o una columna, bajá en una sola pierna con la otra estirada adelante. Usá los brazos lo menos posible.",
    cuidado: "Anotá las repeticiones de un lado. Si no llegás abajo del todo, bajá hasta un banco.", video: "pistol squat asistida" },
  { id: "pistol", nombre: "Sentadilla a una pierna (pistol)", grupo: "cuadriceps", patron: "sentadilla", equipo: "cali", nivel: 3, tipo: "compuesto", met: 7, salto: 0,
    como: "En una pierna, con la otra estirada adelante y los brazos al frente para equilibrar. Bajá hasta abajo y subí sin ayuda.",
    cuidado: "Talón apoyado todo el tiempo. Anotá las repeticiones de un lado.", video: "pistol squat tutorial" },

  /* calistenia · glúteos e isquios */
  { id: "puente-una-pierna", nombre: "Puente de glúteos a una pierna", grupo: "gluteo", patron: "hipThrust", equipo: "cali", nivel: 1, tipo: "aislado", met: 4, salto: 0,
    como: "Boca arriba, un pie apoyado y la otra pierna estirada. Subí la cadera empujando con el talón hasta quedar en línea.",
    cuidado: "Anotá las repeticiones de un lado. La cadera sube pareja, sin torcerse.", video: "puente de gluteos una pierna" },
  { id: "peso-muerto-una-pierna", nombre: "Peso muerto a una pierna", grupo: "femoral", patron: "bisagra", equipo: "cali", nivel: 2, tipo: "compuesto", met: 4.5, salto: 0,
    como: "Parado en una pierna, llevá el torso hacia adelante mientras la otra pierna va para atrás, hasta quedar casi paralelo al piso. Volvé apretando el glúteo.",
    cuidado: "Espalda recta todo el tiempo. Anotá las repeticiones de un lado.", video: "peso muerto a una pierna sin peso" },
  { id: "nordico-asistido", nombre: "Curl nórdico asistido", grupo: "femoral", patron: "curlFemoral", equipo: "cali", nivel: 3, tipo: "aislado", met: 5, salto: 0,
    como: "De rodillas sobre algo blando, con los talones trabados (debajo de un sillón o que alguien te los sostenga). Dejate caer hacia adelante lo más lento posible y frená con las manos.",
    cuidado: "Es muy exigente: pocas repeticiones y bien lentas.", video: "curl nordico principiantes" },

  /* calistenia · hombros y fondos */
  { id: "pike", nombre: "Flexiones pike", grupo: "hombro", patron: "pike", equipo: "cali", nivel: 2, tipo: "compuesto", met: 6, salto: 0,
    como: "En V invertida: manos y pies en el piso y la cadera bien arriba. Bajá la cabeza hacia el piso entre las manos y empujá.",
    cuidado: "La cabeza va un poco por delante de las manos, formando un triángulo.", video: "pike push up tecnica" },
  { id: "fondos-paralelas", nombre: "Fondos en paralelas", grupo: "triceps", patron: "fondos", equipo: "cali", nivel: 2, tipo: "compuesto", met: 7, salto: 0, barra: true,
    como: "Sostenido con los brazos estirados en dos barras paralelas (o dos sillas firmes). Bajá hasta que el codo quede a 90° y empujá.",
    cuidado: "Hombros lejos de las orejas. Si molesta el hombro, no bajes tanto.", video: "fondos en paralelas tecnica" },
  { id: "pike-elevado", nombre: "Pike con pies elevados", grupo: "hombro", patron: "pike", equipo: "cali", nivel: 3, tipo: "compuesto", met: 7, salto: 0,
    como: "Como la flexión pike, pero con los pies sobre un banco o una silla. Cuanto más vertical el torso, más difícil.",
    cuidado: "Bajá controlado: la cabeza apenas roza el piso.", video: "elevated pike push up" },
  { id: "vertical-pared", nombre: "Vertical contra la pared", grupo: "hombro", patron: "vertical", equipo: "cali", nivel: 3, tipo: "compuesto", met: 6, salto: 0, porTiempo: true,
    como: "Manos en el piso a un palmo de la pared y subí caminando con los pies por la pared hasta quedar vertical, con la panza mirando a la pared. Aguantá.",
    cuidado: "Bajá caminando de la misma forma. No lo intentes si tenés presión alta o molestias de cuello.", video: "vertical contra la pared pecho a la pared" },

  /* calistenia · abdomen */
  { id: "hollow", nombre: "Hollow (bote)", grupo: "core", patron: "hollow", equipo: "cali", nivel: 2, tipo: "aislado", met: 4, salto: 0, porTiempo: true,
    como: "Boca arriba, despegá hombros y piernas del piso con los brazos estirados atrás de la cabeza, formando una banana. La zona lumbar pegada al piso. Aguantá.",
    cuidado: "Si se despega la lumbar, doblá las rodillas o subí más las piernas.", video: "hollow body hold tecnica" },
  { id: "elevacion-colgado", nombre: "Elevación de rodillas colgado", grupo: "core", patron: "colgado", equipo: "cali", nivel: 2, tipo: "aislado", met: 5, salto: 0, barra: true,
    como: "Colgado de una barra, subí las rodillas al pecho sin balancearte y bajá despacio.",
    cuidado: "El movimiento sale del abdomen: enrollá la pelvis arriba.", video: "elevacion de rodillas colgado" },
  { id: "l-sit", nombre: "L-sit", grupo: "core", patron: "lsit", equipo: "cali", nivel: 3, tipo: "aislado", met: 5, salto: 0, porTiempo: true,
    como: "Sentado con las piernas estiradas, manos en el piso (o en dos sillas) al lado de la cadera. Empujá y despegá la cola y las piernas del piso. Aguantá.",
    cuidado: "Si no despegan las piernas, empezá con una rodilla doblada.", video: "l sit progresion" },

  /* funcional / HIIT */
  { id: "jumping-jacks", nombre: "Saltos de tijera", grupo: "cardio", patron: "tijera", equipo: "funcional", nivel: 1, tipo: "cardio", met: 8, salto: 0, porTiempo: true,
    como: "Saltá abriendo piernas y brazos a la vez, y volvé a cerrar. Ritmo constante.", cuidado: "Aterrizá suave, en la parte de adelante del pie.", video: "jumping jacks" },
  { id: "sentadilla-salto", nombre: "Sentadilla con salto", grupo: "cuadriceps", patron: "sentadilla", equipo: "funcional", nivel: 2, tipo: "compuesto", met: 9, salto: 0, porTiempo: true,
    como: "Bajá a una sentadilla y subí saltando. Caé suave y encadená la siguiente.", cuidado: "Rodillas alineadas con los pies al caer. Si molesta, hacé sentadillas sin salto.", video: "sentadilla con salto" },
  { id: "escaladores", nombre: "Escaladores", grupo: "core", patron: "escalador", equipo: "funcional", nivel: 1, tipo: "cardio", met: 8, salto: 0, porTiempo: true,
    como: "En posición de flexión, llevá las rodillas al pecho alternando, como si corrieras en el lugar.", cuidado: "Hombros arriba de las manos y cadera baja.", video: "mountain climbers tecnica" },
  { id: "skipping", nombre: "Skipping", grupo: "cardio", patron: "cardio", equipo: "funcional", nivel: 1, tipo: "cardio", met: 8, salto: 0, porTiempo: true,
    como: "Corré en el lugar subiendo las rodillas a la altura de la cadera, con los brazos acompañando.", cuidado: "Si es mucho, hacelo caminando rápido en el lugar.", video: "skipping rodillas arriba" },
  { id: "burpee", nombre: "Burpees", grupo: "cardio", patron: "burpee", equipo: "funcional", nivel: 2, tipo: "cardio", met: 10, salto: 0, porTiempo: true,
    como: "Bajá a cuclillas, manos al piso, tirá los pies atrás a posición de flexión, volvé a juntar los pies y subí saltando.", cuidado: "Ritmo que puedas sostener. Mejor lento y prolijo que rápido y desarmado.", video: "burpees tecnica correcta" },
  { id: "burpee-simple", nombre: "Burpees sin salto", grupo: "cardio", patron: "burpee", equipo: "funcional", nivel: 1, tipo: "cardio", met: 7, salto: 0, porTiempo: true,
    como: "Manos al piso, llevá los pies atrás de a uno, volvé de a uno y parate. Sin flexión ni salto.", cuidado: "Espalda firme cuando estás en tabla.", video: "burpee sin salto principiantes" },
  { id: "estocadas-alternadas", nombre: "Estocadas alternadas", grupo: "gluteo", patron: "zancada", equipo: "funcional", nivel: 1, tipo: "compuesto", met: 6, salto: 0, porTiempo: true,
    como: "Paso largo adelante, bajá la rodilla de atrás casi al piso y volvé. Alterná las piernas sin parar.", cuidado: "Torso derecho y rodilla de adelante sobre el tobillo.", video: "estocadas alternadas" },

  /* movilidad y estiramiento (todos por tiempo) */
  { id: "gato-vaca", nombre: "Gato y vaca", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.5, salto: 0, porTiempo: true,
    como: "En cuatro patas, alterná entre redondear la espalda mirando al ombligo y arquearla mirando al frente, despacio y con la respiración.", cuidado: "Movimiento suave, sin forzar el cuello.", video: "gato vaca movilidad" },
  { id: "rotacion-toracica", nombre: "Rotación de la espalda en cuatro patas", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.5, salto: 0, porTiempo: true,
    como: "En cuatro patas, una mano detrás de la cabeza. Llevá ese codo hacia la otra mano y después abrilo hacia el techo, siguiéndolo con la mirada.", cuidado: "La cadera no se mueve: gira la parte alta de la espalda.", video: "rotacion toracica cuadrupedia" },
  { id: "flexores-cadera", nombre: "Estiramiento de la parte de adelante de la cadera", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.3, salto: 0, porTiempo: true,
    como: "Rodilla de atrás apoyada en el piso y la otra pierna adelante a 90°. Apretá el glúteo de atrás y llevá la cadera apenas hacia adelante.", cuidado: "Sin arquear la cintura. Se siente adelante del muslo de atrás.", video: "estiramiento flexores de cadera" },
  { id: "isquios-estiramiento", nombre: "Estiramiento de la parte de atrás del muslo", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.3, salto: 0, porTiempo: true,
    como: "Talón apoyado en un escalón o en el piso con la pierna estirada. Inclinate hacia adelante con la espalda recta hasta sentir la tensión.", cuidado: "Tensión cómoda, nunca dolor. No rebotes.", video: "estiramiento isquiotibiales" },
  { id: "cuadriceps-estiramiento", nombre: "Estiramiento de cuádriceps de pie", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.3, salto: 0, porTiempo: true,
    como: "De pie, agarrá el empeine y llevá el talón hacia el glúteo, rodillas juntas. Apoyate en la pared si hace falta.", cuidado: "No tires la rodilla hacia afuera.", video: "estiramiento cuadriceps de pie" },
  { id: "gluteo-figura4", nombre: "Estiramiento de glúteo (figura 4)", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.3, salto: 0, porTiempo: true,
    como: "Boca arriba, cruzá un tobillo sobre la rodilla contraria y acercá esa pierna al pecho con las manos.", cuidado: "Si molesta la rodilla, alejá un poco el pie.", video: "estiramiento gluteo figura 4" },
  { id: "pecho-pared", nombre: "Apertura de pecho en la pared", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.3, salto: 0, porTiempo: true,
    como: "Antebrazo apoyado en la pared o el marco de una puerta, codo a la altura del hombro. Girá el cuerpo hacia el otro lado hasta sentir el pecho.", cuidado: "Suave: el hombro no tiene que doler.", video: "estiramiento pecho en la pared" },
  { id: "postura-nino", nombre: "Postura del niño", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2, salto: 0, porTiempo: true,
    como: "De rodillas, sentate sobre los talones y estirá los brazos adelante en el piso. Respirá hondo y soltá la espalda.", cuidado: "Si molestan las rodillas, poné un almohadón.", video: "postura del niño estiramiento" },
  { id: "gemelos-pared", nombre: "Estiramiento de gemelos en la pared", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.3, salto: 0, porTiempo: true,
    como: "Manos en la pared, una pierna atrás estirada con el talón apoyado. Llevá la cadera hacia la pared.", cuidado: "El talón de atrás no se despega.", video: "estiramiento gemelos pared" },
  { id: "sentadilla-profunda", nombre: "Sentadilla profunda sostenida", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.5, salto: 0, porTiempo: true,
    como: "Bajá a cuclillas lo más abajo que puedas con los talones apoyados, codos empujando las rodillas hacia afuera. Quedate respirando.", cuidado: "Si se levantan los talones, poné algo finito debajo.", video: "sentadilla profunda movilidad" },
  { id: "circulos-hombros", nombre: "Círculos de brazos y hombros", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.5, salto: 0, porTiempo: true,
    como: "Brazos estirados al costado, hacé círculos que empiezan chicos y se van agrandando. A mitad de tiempo, cambiá de sentido.", cuidado: "Sin dolor en el hombro; si molesta, círculos más chicos.", video: "circulos de hombros movilidad" },
  { id: "cadera-9090", nombre: "Cadera 90/90", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 2.5, salto: 0, porTiempo: true,
    como: "Sentado en el piso con una pierna adelante y otra al costado, las dos rodillas a 90°. Inclinate sobre la pierna de adelante con la espalda recta.", cuidado: "Apoyá las manos atrás si hace falta. Nada de forzar la rodilla.", video: "movilidad cadera 90 90" },
  { id: "estocada-rotacion", nombre: "Estocada con rotación", grupo: "movilidad", patron: "movilidad", equipo: "movilidad", nivel: 1, tipo: "movilidad", met: 3, salto: 0, porTiempo: true,
    como: "En estocada baja, apoyá la mano del lado de la pierna de atrás en el piso y girá el torso abriendo el otro brazo hacia el techo.", cuidado: "Movimiento lento, acompañando con la respiración.", video: "worlds greatest stretch" }
];
EJ_NUEVOS.forEach(e => { if (!porId(e.id)) EJERCICIOS.push(e); });

const EQUIPOS_EXTRA = ["cali", "funcional", "movilidad"];

/* ============================================================
   CALISTENIA
   ============================================================ */
/* Cada escalera va de lo más fácil a lo más difícil. reps: rango propio
   cuando el general (6–12) no aplica. */
const CADENAS = {
  empuje: { nombre: "Empuje", pasos: [
    { id: "flexion-pared", reps: [8, 15] }, { id: "flexion-inclinada" }, { id: "flexion-rodillas" },
    { id: "flexiones" }, { id: "flexion-diamante" }, { id: "flexion-pies-elevados" }, { id: "flexion-arquero", reps: [4, 10] }] },
  tiron: { nombre: "Tirón", pasos: [
    { id: "remo-toalla" }, { id: "remo-australiano-alto" }, { id: "remo-australiano" },
    { id: "dominada-negativa", reps: [3, 6] }, { id: "dominadas", reps: [4, 10] }, { id: "dominada-pausa", reps: [4, 8] }] },
  piernas: { nombre: "Piernas", pasos: [
    { id: "sentadilla-libre", reps: [10, 20] }, { id: "sentadilla-pausa", reps: [8, 15] }, { id: "sentadilla-bulgara" },
    { id: "pistol-asistida", reps: [4, 10] }, { id: "pistol", reps: [3, 8] }] },
  gluteos: { nombre: "Glúteos e isquios", pasos: [
    { id: "puente-gluteo", reps: [10, 20] }, { id: "puente-una-pierna" }, { id: "peso-muerto-una-pierna" },
    { id: "nordico-asistido", reps: [3, 8] }] },
  hombros: { nombre: "Hombros y tríceps", pasos: [
    { id: "fondos-banco" }, { id: "pike" }, { id: "fondos-paralelas" }, { id: "pike-elevado", reps: [4, 10] },
    { id: "vertical-pared", reps: [15, 40] }] },
  core: { nombre: "Abdomen", pasos: [
    { id: "plancha", reps: [20, 45] }, { id: "hollow", reps: [15, 40] }, { id: "elevacion-piernas" },
    { id: "elevacion-colgado" }, { id: "l-sit", reps: [8, 25] }] }
};

const RUTINAS_CALI = {
  caliA: { nombre: "Calistenia A", musculos: "Empuje · Tirón · Piernas · Abdomen", cadenas: ["empuje", "tiron", "piernas", "core"] },
  caliB: { nombre: "Calistenia B", musculos: "Hombros · Tirón · Glúteos · Abdomen", cadenas: ["hombros", "tiron", "gluteos", "core"] }
};

const NIVEL_INICIAL = {
  principiante: { empuje: 1, tiron: 0, piernas: 0, gluteos: 0, hombros: 0, core: 0 },
  intermedio:   { empuje: 3, tiron: 2, piernas: 1, gluteos: 1, hombros: 1, core: 1 },
  avanzado:     { empuje: 4, tiron: 4, piernas: 2, gluteos: 2, hombros: 2, core: 2 }
};

function caliEstado() {
  if (!S.perfil.cali) S.perfil.cali = { niveles: {}, barra: false };
  return S.perfil.cali;
}
/* Las variantes que se pueden hacer con lo que hay: sin barra, se saltean las que la piden. */
function pasosPosibles(cadena) {
  const conBarra = caliEstado().barra;
  return CADENAS[cadena].pasos.filter(p => { const e = porId(p.id); return e && (conBarra || !e.barra); });
}
/* Deja anotado, en palabras, la variante actual de cada escalera: el
   entrenador de IA la lee sin tener que conocer la lógica de la app. */
function anotarVariantesCali() {
  const est = caliEstado();
  est.actual = {};
  Object.keys(CADENAS).forEach(c => { est.actual[CADENAS[c].nombre] = pasoCali(c).ej.nombre; });
}
function nivelCali(cadena) {
  const est = caliEstado();
  const pos = pasosPosibles(cadena);
  let n = est.niveles[cadena];
  if (n == null) n = (NIVEL_INICIAL[S.perfil.nivel] || NIVEL_INICIAL.principiante)[cadena] || 0;
  return Math.max(0, Math.min(pos.length - 1, n));
}
function pasoCali(cadena, nivel) {
  const pos = pasosPosibles(cadena);
  const p = pos[Math.max(0, Math.min(pos.length - 1, nivel == null ? nivelCali(cadena) : nivel))];
  const e = porId(p.id);
  return { ...p, ej: e, reps: p.reps || (e.porTiempo ? [20, 45] : [6, 12]) };
}

function siguienteCali() {
  const ult = (S.sesiones || []).slice().reverse().find(s => s.tipo === "calistenia");
  return ult && ult.bloque === "caliA" ? "caliB" : "caliA";
}

function armarCalistenia(clave) {
  const r = RUTINAS_CALI[clave] || RUTINAS_CALI.caliA;
  const niv = NIVELES[S.perfil.nivel] || NIVELES.principiante;
  const plan = r.cadenas.map((c, i) => {
    const p = pasoCali(c);
    return {
      id: p.ej.id, nombre: p.ej.nombre, grupo: p.ej.grupo, rol: i < 2 ? "principal" : "accesorio",
      series: niv.series[1] || 3, reps: p.reps, porTiempo: !!p.ej.porTiempo,
      descanso: i < 2 ? 90 : 60, kg: 0, met: p.ej.met, cadena: c, nivel: nivelCali(c)
    };
  });
  return { bloque: clave, nombre: r.nombre, musculos: r.musculos, plan, tipo: "calistenia" };
}

function empezarCalistenia(clave) {
  if (S.activa || S.cardio || S.guiada) return toast("Terminá primero lo que tenés en curso.");
  const r = armarCalistenia(clave || siguienteCali());
  cerrarDetalleRutina();
  S.activa = { ...r, fecha: hoyISO(), inicio: Date.now(), hechos: {} };
  guardar("Entrenando");
  pintar();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

/* Al terminar: si hiciste todas las series en el tope del rango, subís una
   variante; si quedaste muy lejos del mínimo, bajás una. */
function progresarCalistenia(a) {
  const est = caliEstado(), suben = [], bajan = [];
  a.plan.forEach(it => {
    if (!it.cadena) return;
    const arr = (a.hechos[it.id] || []).filter(Boolean);
    if (!arr.length) return;
    const minR = Math.min(...arr.map(s => s.reps));
    const pos = pasosPosibles(it.cadena);
    const n = nivelCali(it.cadena);
    if (arr.length >= it.series && minR >= it.reps[1] && n < pos.length - 1) {
      est.niveles[it.cadena] = n + 1;
      suben.push(`${it.nombre} → ${porId(pos[n + 1].id).nombre}`);
    } else if (minR < Math.max(1, it.reps[0] - 2) && n > 0) {
      est.niveles[it.cadena] = n - 1;
      bajan.push(`${it.nombre} → ${porId(pos[n - 1].id).nombre}`);
    }
  });
  anotarVariantesCali();
  return { suben, bajan };
}

/* En la sesión: en vez de "Cambiar", más fácil o más difícil dentro de la escalera. */
function herramientasCali(it, i, hechas) {
  if (hechas) return "";
  const pos = pasosPosibles(it.cadena);
  const n = pos.findIndex(p => p.id === it.id);
  return [
    n > 0 ? `<button class="herr" data-facil="${i}">Más fácil</button>` : "",
    n < pos.length - 1 ? `<button class="herr" data-dificil="${i}">Más difícil</button>` : ""
  ].join("");
}
function conectarHerramientasCali(it, i) {
  const mover = d => {
    const pos = pasosPosibles(it.cadena);
    const n = pos.findIndex(p => p.id === it.id) + d;
    if (n < 0 || n >= pos.length) return;
    const p = pasoCali(it.cadena, n);
    const previo = it.nombre;
    delete S.activa.hechos[it.id];
    Object.assign(it, { id: p.ej.id, nombre: p.ej.nombre, grupo: p.ej.grupo, reps: p.reps, porTiempo: !!p.ej.porTiempo, met: p.ej.met, nivel: n });
    caliEstado().niveles[it.cadena] = n;
    anotarVariantesCali();
    guardar(); pintar();
    toast(`${previo} → ${p.ej.nombre}`);
  };
  const f = document.querySelector(`[data-facil="${i}"]`);
  if (f) f.onclick = () => mover(-1);
  const d = document.querySelector(`[data-dificil="${i}"]`);
  if (d) d.onclick = () => mover(1);
}

/* ---------- pantalla de calistenia ---------- */
function detalleCalistenia(v) {
  const clave = Entrenar.cali || siguienteCali();
  const r = armarCalistenia(clave);
  const otra = clave === "caliA" ? "caliB" : "caliA";
  const est = caliEstado();
  v.innerHTML = `
    <div class="hero">
      <p class="eyebrow">Con tu peso corporal</p>
      <h2>${esc(r.nombre)}</h2>
      <p class="sm muted" style="margin:6px 0 0">${esc(r.musculos)}</p>
      ${datosRutina(r)}
      <button class="btn block" id="cali-empezar" style="margin-top:16px">Empezar calistenia</button>
      <div class="linea-acciones">
        <button class="linkbtn" id="cali-otra">Hacer la ${esc(RUTINAS_CALI[otra].nombre.split(" ")[1])}</button>
      </div>
    </div>

    <div class="card pad" style="margin-top:14px">
      <p class="lbl" style="margin:0 0 8px">¿Tenés una barra para colgarte? <small>Una barra de dominadas, la de una plaza o unas paralelas.</small></p>
      <div class="segmento" id="cali-barra">
        <button type="button" class="${est.barra ? "activo" : ""}" data-b="1">Sí, tengo</button>
        <button type="button" class="${est.barra ? "" : "activo"}" data-b="0">No</button>
      </div>
    </div>

    <p class="eyebrow" style="margin:20px 2px 10px">Tus variantes</p>
    <div class="exlist">${r.plan.map((it, i) => {
      const total = pasosPosibles(it.cadena).length;
      return `<button class="exrow" data-ej="${it.id}">
        <span class="exnum">${i + 1}</span>
        <span class="extxt"><b>${esc(it.nombre)}</b><small>${esc(CADENAS[it.cadena].nombre)} · nivel ${it.nivel + 1} de ${total} · ${it.series} × ${it.reps[0]}–${it.reps[1]}${it.porTiempo ? " seg" : ""}</small></span>
        <span class="exver">ver</span></button>`;
    }).join("")}</div>

    <div class="ojo" style="margin-top:14px"><b>Cómo se sube de nivel</b>
      <p>Cuando hacés todas las series en el tope del rango, la próxima vez te toca una variante más difícil.
      Si no llegás al mínimo, volvés a la anterior. En cada ejercicio también podés tocar "Más fácil" o "Más difícil".</p></div>`;

  document.getElementById("cali-empezar").onclick = () => empezarCalistenia(clave);
  document.getElementById("cali-otra").onclick = () => { Entrenar.cali = otra; pintar(); };
  document.querySelectorAll("#cali-barra [data-b]").forEach(b => b.onclick = () => {
    est.barra = b.dataset.b === "1"; anotarVariantesCali(); guardar(); pintar();
  });
  conectarFilas(v);
}

/* ============================================================
   SESIONES GUIADAS POR TIEMPO
   Movilidad, HIIT e intervalos: una lista de pasos con su duración.
   Bici, cinta y elíptico: reloj libre que cuenta para arriba.
   El tiempo sale de marcas de reloj, así que sobrevive a recargar la app.
   ============================================================ */
const LADO = 5, CAMBIO = 8;

function pasoG(nombre, seg, fase, id, extra) { return { nombre, seg, fase, id: id || null, ...(extra || {}) }; }

/* Arma los pasos de movilidad: cada movimiento, y si va de a un lado, los dos lados. */
function pasosMovilidad(lista) {
  const out = [];
  lista.forEach(([id, seg, porLado], k) => {
    const e = porId(id);
    if (k > 0) out.push(pasoG("Cambiá de posición", CAMBIO, "cambio", null, { prox: e.nombre }));
    if (porLado) {
      out.push(pasoG(e.nombre, seg, "trabajo", id, { lado: "Lado izquierdo" }));
      out.push(pasoG("Cambiá de lado", LADO, "cambio"));
      out.push(pasoG(e.nombre, seg, "trabajo", id, { lado: "Lado derecho" }));
    } else out.push(pasoG(e.nombre, seg, "trabajo", id));
  });
  return out;
}

const MOVILIDAD = {
  despues: { nombre: "Estiramiento después de entrenar", desc: "Para cerrar el gimnasio o una salida", met: 2.3, lista: [
    ["cuadriceps-estiramiento", 30, true], ["isquios-estiramiento", 30, true], ["flexores-cadera", 30, true],
    ["gluteo-figura4", 30, true], ["pecho-pared", 30, true], ["gemelos-pared", 30, true], ["postura-nino", 45]] },
  descanso: { nombre: "Movilidad para el día de descanso", desc: "Todo el cuerpo, sin apuro", met: 2.5, lista: [
    ["gato-vaca", 60], ["circulos-hombros", 45], ["rotacion-toracica", 40, true], ["estocada-rotacion", 40, true],
    ["cadera-9090", 45, true], ["sentadilla-profunda", 60], ["isquios-estiramiento", 40, true], ["postura-nino", 60]] },
  sentado: { nombre: "Espalda y cadera", desc: "Si pasás muchas horas sentado", met: 2.4, lista: [
    ["gato-vaca", 60], ["flexores-cadera", 45, true], ["rotacion-toracica", 40, true],
    ["gluteo-figura4", 45, true], ["pecho-pared", 30, true], ["postura-nino", 60]] }
};

/* HIIT: el trabajo y el descanso se ajustan al nivel. */
const HIIT_NIVEL = {
  principiante: { trabajo: 30, pausa: 30, vueltas: 2, suave: true },
  intermedio:   { trabajo: 40, pausa: 20, vueltas: 3, suave: false },
  avanzado:     { trabajo: 45, pausa: 15, vueltas: 3, suave: false }
};

const HIIT = {
  circuito: { nombre: "Circuito sin equipo", desc: "Ocho ejercicios en ronda, todo el cuerpo", met: 8,
    armar(n) {
      const lista = ["jumping-jacks", n.suave ? "sentadilla-libre" : "sentadilla-salto", "escaladores",
        n.suave ? "flexion-rodillas" : "flexiones", "estocadas-alternadas", "skipping", "plancha",
        n.suave ? "burpee-simple" : "burpee"];
      const out = [pasoG("Entrada en calor: movete suave en el lugar", 120, "calor", "skipping")];
      for (let v = 0; v < n.vueltas; v++) {
        lista.forEach((id, k) => {
          out.push(pasoG(porId(id).nombre, n.trabajo, "trabajo", id, { vuelta: `Vuelta ${v + 1} de ${n.vueltas}` }));
          if (k < lista.length - 1) out.push(pasoG("Descanso", n.pausa, "descanso"));
        });
        if (v < n.vueltas - 1) out.push(pasoG("Descanso entre vueltas", 60, "descanso"));
      }
      out.push(pasoG("Vuelta a la calma: caminá y respirá hondo", 90, "calma"));
      return out;
    } },
  tabata: { nombre: "Tabata", desc: "20 segundos a fondo, 10 de pausa. Corto y exigente", met: 9,
    armar(n) {
      const bloques = n.suave ? [["sentadilla-libre", "jumping-jacks"], ["escaladores", "skipping"]]
        : [["sentadilla-salto", "escaladores"], ["burpee", "jumping-jacks"]];
      const out = [pasoG("Entrada en calor: movete suave en el lugar", 120, "calor", "skipping")];
      bloques.forEach((par, b) => {
        for (let r = 0; r < 8; r++) {
          const id = par[r % 2];
          out.push(pasoG(porId(id).nombre, 20, "trabajo", id, { vuelta: `Bloque ${b + 1} · ronda ${r + 1} de 8` }));
          out.push(pasoG("Pausa", n.suave ? 20 : 10, "descanso"));
        }
        out.pop();
        if (b < bloques.length - 1) out.push(pasoG("Descanso entre bloques", 60, "descanso"));
      });
      out.push(pasoG("Vuelta a la calma: caminá y respirá hondo", 90, "calma"));
      return out;
    } },
  bici: { nombre: "Intervalos en bici fija", desc: "Picos fuertes y recuperaciones suaves", met: 8,
    armar(n) {
      const reps = n.suave ? 6 : 8;
      const out = [pasoG("Pedaleá suave para entrar en calor", 300, "calor", "cardio-bici")];
      for (let r = 0; r < reps; r++) {
        out.push(pasoG("Fuerte: subí la resistencia y dale", 30, "trabajo", "cardio-bici", { vuelta: `Pico ${r + 1} de ${reps}` }));
        out.push(pasoG("Suave: bajá la resistencia y recuperá", 90, "descanso", "cardio-bici"));
      }
      out.push(pasoG("Pedaleá suave para bajar", 180, "calma", "cardio-bici"));
      return out;
    } },
  cinta: { nombre: "Intervalos en cinta", desc: "Trote y caminata alternados", met: 7,
    armar(n) {
      const reps = n.suave ? 6 : 8;
      const out = [pasoG("Caminá a ritmo cómodo para entrar en calor", 300, "calor", "cardio-caminata")];
      for (let r = 0; r < reps; r++) {
        out.push(pasoG(n.suave ? "Caminá rápido o en subida" : "Trotá", 60, "trabajo", "cardio-caminata", { vuelta: `Intervalo ${r + 1} de ${reps}` }));
        out.push(pasoG("Caminá y recuperá", 60, "descanso", "cardio-caminata"));
      }
      out.push(pasoG("Caminá suave para bajar", 180, "calma", "cardio-caminata"));
      return out;
    } }
};

/* Cardio adentro, a reloj libre. */
const APARATOS = {
  bici:     { nombre: "Bicicleta fija", id: "cardio-bici",     met: { suave: 5, moderada: 7, fuerte: 9 } },
  cinta:    { nombre: "Cinta",          id: "cardio-caminata", met: { suave: 4, moderada: 6, fuerte: 8.5 } },
  eliptico: { nombre: "Elíptico",       id: "cardio-eliptico", met: { suave: 5, moderada: 6, fuerte: 8 } }
};
const INTENSIDADES = {
  suave:    { nombre: "Suave",    desc: "Podés charlar tranquilo" },
  moderada: { nombre: "Moderada", desc: "Hablás de a frases cortas" },
  fuerte:   { nombre: "Fuerte",   desc: "Casi no podés hablar" }
};

const duracionPasos = pasos => Math.round(pasos.reduce((a, p) => a + p.seg, 0) / 60);

function empezarGuiada(g) {
  if (S.activa || S.cardio || S.guiada) return toast("Terminá primero lo que tenés en curso.");
  cerrarSheet();
  cerrarDetalleRutina();
  S.guiada = { fecha: hoyISO(), i: 0, acum: 0, desde: Date.now(), corriendo: true, previo: 0, ...g };
  guardar("Entrenando");
  pintar();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

/* Cuánto va del paso actual, en milisegundos. */
const msPaso = g => g.acum + (g.corriendo ? Date.now() - g.desde : 0);
/* Todo lo hecho: pasos completos + lo que va del actual. */
const msTotal = g => g.libre ? msPaso(g) : (g.previo || 0) + Math.min(msPaso(g), (g.pasos[g.i] ? g.pasos[g.i].seg : 0) * 1000);

let tGuiada = null, ultimoSeg = null;
function avanzarGuiada(g) {
  /* Si la app estuvo cerrada, puede haber que saltar varios pasos de una. */
  let cambio = false;
  while (!g.libre && g.pasos[g.i] && msPaso(g) >= g.pasos[g.i].seg * 1000) {
    const sobra = msPaso(g) - g.pasos[g.i].seg * 1000;
    g.previo = (g.previo || 0) + g.pasos[g.i].seg * 1000;
    g.i++;
    g.acum = sobra; g.desde = Date.now();
    cambio = true;
  }
  if (cambio) {
    aviso(g.pasos[g.i] ? g.pasos[g.i].fase : "fin");
    lsSet();
    if (!g.pasos[g.i]) { terminarGuiada(true); return; }
    pintar();
  }
}

/* Vibración y un pitido corto en cada cambio. */
let audioCtx = null;
function pitido(frec, ms) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), gn = audioCtx.createGain();
    o.frequency.value = frec; gn.gain.value = 0.08;
    o.connect(gn); gn.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + ms / 1000);
  } catch (e) { /* sin audio */ }
}
function aviso(fase) {
  if (navigator.vibrate) navigator.vibrate(fase === "trabajo" ? [120, 60, 120] : 200);
  pitido(fase === "trabajo" ? 880 : 660, 180);
}

function pintarGuiada(v) {
  const g = S.guiada;
  const p = g.libre ? null : g.pasos[g.i];
  const sig = g.libre ? null : g.pasos.slice(g.i + 1).find(x => x.fase !== "cambio") || null;
  const total = g.libre ? 0 : g.pasos.reduce((a, x) => a + x.seg, 0);
  const faseTxt = p ? ({ trabajo: "Ahora", descanso: "Descanso", calor: "Entrada en calor", calma: "Vuelta a la calma", cambio: "Preparate" }[p.fase] || "") : "";
  const intens = g.intensidad ? INTENSIDADES[g.intensidad] : null;

  v.innerHTML = `
    <div class="guiada fase-${p ? p.fase : "libre"}${g.corriendo ? "" : " pausada"}">
      <p class="eyebrow">${esc(g.nombre)} · ${g.corriendo ? (g.libre ? "en curso" : faseTxt) : "en pausa"}</p>
      ${p ? `<h2 class="guiada-tit">${esc(p.nombre)}</h2>
        <p class="guiada-sub">${esc([p.lado, p.vuelta, p.prox ? "Sigue: " + p.prox : ""].filter(Boolean).join(" · "))}</p>`
        : `<h2 class="guiada-tit">${esc(APARATOS[g.aparato] ? APARATOS[g.aparato].nombre : g.nombre)}</h2>`}
      <div class="guiada-reloj" id="g-reloj">0:00</div>
      ${p ? `<div class="barra"><i id="g-barra"></i></div>` : ""}
      <div class="datos">
        <div><b id="g-total">0′</b><span>${g.libre ? "llevás" : "de " + Math.round(total / 60) + "′"}</span></div>
        <div><b id="g-kcal">0</b><span>kcal aprox.</span></div>
        <div><b>${g.libre ? esc(intens ? intens.nombre : "") : (g.i + 1) + "/" + g.pasos.length}</b><span>${g.libre ? "intensidad" : "pasos"}</span></div>
      </div>
      ${p && p.id && p.fase !== "cambio" ? `<button class="linkbtn" data-ficha="${p.id}" style="margin-top:12px">Cómo se hace</button>` : ""}
    </div>
    ${sig ? `<p class="guiada-sig"><span>Después</span> ${esc(sig.nombre)}${sig.lado ? " · " + esc(sig.lado) : ""} · ${sig.seg}″</p>` : ""}
    ${g.libre ? `<p class="lbl" style="margin:16px 2px 8px">Intensidad</p>
      <div class="segmento" id="g-int">${Object.entries(INTENSIDADES).map(([k, x]) =>
        `<button type="button" class="${k === g.intensidad ? "activo" : ""}" data-int="${k}">${esc(x.nombre)}</button>`).join("")}</div>
      <p class="sm muted" style="margin:6px 2px 0">${esc(intens ? intens.desc : "")}</p>` : ""}
    ${tarjetaMusica(g.tipo === "movilidad" ? "estirar" : "cardio")}
    <div class="linea-botones" style="margin-top:14px">
      <button class="btn" id="g-pausa">${g.corriendo ? "Pausar" : "Seguir"}</button>
      ${g.libre ? `<button class="btn ghost" id="g-fin">Terminar</button>` : `<button class="btn ghost" id="g-saltar">Saltar</button>`}
    </div>
    ${g.libre ? "" : `<button class="btn ghost block" id="g-fin" style="margin-top:8px">Terminar y guardar</button>`}
    <button class="btn ghost block peligro" id="g-cancelar" style="margin-top:8px">Descartar</button>
    <p class="sm muted" style="margin:14px 2px 0">Dejá la app abierta: la pantalla queda prendida y el teléfono vibra en cada cambio.</p>`;

  document.getElementById("g-pausa").onclick = () => {
    if (g.corriendo) { g.acum = msPaso(g); g.corriendo = false; }
    else { g.desde = Date.now(); g.corriendo = true; }
    guardar(); pintar();
  };
  const s = document.getElementById("g-saltar");
  if (s) s.onclick = () => {
    g.previo = (g.previo || 0) + Math.min(msPaso(g), g.pasos[g.i].seg * 1000);
    g.i++; g.acum = 0; g.desde = Date.now();
    if (!g.pasos[g.i]) return terminarGuiada(true);
    guardar(); pintar();
  };
  document.getElementById("g-fin").onclick = () => terminarGuiada(false);
  document.getElementById("g-cancelar").onclick = () => {
    if (!confirm("¿Descartás esta sesión? No se va a guardar.")) return;
    clearInterval(tGuiada); S.guiada = null; guardar(); soltarPantalla(); pintar();
  };
  document.querySelectorAll("#g-int [data-int]").forEach(b => b.onclick = () => {
    g.intensidad = b.dataset.int; g.met = APARATOS[g.aparato].met[g.intensidad]; guardar(); pintar();
  });
  v.querySelectorAll("[data-ficha]").forEach(b => b.onclick = () => fichaEjercicio(b.dataset.ficha));

  pantallaEncendida();
  clearInterval(tGuiada);
  tGuiada = setInterval(relojGuiada, 250);
  relojGuiada();
}

function relojGuiada() {
  const g = S.guiada;
  if (!g) { clearInterval(tGuiada); return; }
  avanzarGuiada(g);
  if (!S.guiada) return;
  const r = document.getElementById("g-reloj");
  if (!r) return;
  const p = g.pasos && g.pasos[g.i];
  const seg = g.libre ? Math.floor(msPaso(g) / 1000) : Math.max(0, Math.ceil(p.seg - msPaso(g) / 1000));
  r.textContent = fmtSeg(seg);
  if (!g.libre && g.corriendo && seg <= 3 && seg > 0 && ultimoSeg !== seg) pitido(520, 90);
  ultimoSeg = seg;
  const b = document.getElementById("g-barra");
  if (b && p) b.style.width = Math.min(100, msPaso(g) / (p.seg * 10)) + "%";
  const min = msTotal(g) / 60000;
  document.getElementById("g-total").textContent = Math.floor(min) + "′";
  document.getElementById("g-kcal").textContent = kcalSesion(min, pesoActual(), g.met);
}

function terminarGuiada(completa) {
  const g = S.guiada;
  clearInterval(tGuiada);
  const min = Math.max(1, Math.round(msTotal(g) / 60000));
  if (!completa && min < 1) return toast("Todavía no hay nada para guardar.");
  const kcal = kcalSesion(min, pesoActual(), g.met);
  const nombre = g.libre ? `${APARATOS[g.aparato].nombre} · ${INTENSIDADES[g.intensidad].nombre.toLowerCase()}` : g.nombre;
  S.sesiones.push({ id: nuevoId(), fecha: g.fecha, bloque: g.clave || g.tipo, nombre, tipo: g.tipo, series: 0, min, kcal, volumen: 0 });
  S.guiada = null;
  soltarPantalla();
  guardar(nombre + " guardado");
  pintar();
  abrirSheet(`
    <div class="sheet-head"><h3>${completa ? "Completaste la sesión" : "Sesión guardada"}</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="datos grande">
      <div><b>${min}′</b><span>de actividad</span></div>
      <div><b>${kcal}</b><span>kcal aprox.</span></div>
    </div>
    <p class="cuerpo">${esc(nombre)} quedó en tu historial y suma a tu semana.</p>
    <button class="btn block" id="cerrar-resumen">Listo</button>`);
  document.getElementById("cerrar-resumen").onclick = () => cerrarSheet();
}

/* ---------- las hojas para elegir ---------- */
function hojaPresets(titulo, bajada, presets, tipo) {
  const n = HIIT_NIVEL[S.perfil.nivel] || HIIT_NIVEL.principiante;
  const armar = (k, x) => tipo === "movilidad" ? pasosMovilidad(x.lista) : x.armar(n);
  abrirSheet(`<div class="sheet-head"><h3>${esc(titulo)}</h3>
    <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <p class="sm muted" style="margin:0 0 12px">${esc(bajada)}</p>
    <div class="ops">${Object.entries(presets).map(([k, x]) =>
      `<button type="button" class="op" data-preset="${k}"><b>${esc(x.nombre)} · ${duracionPasos(armar(k, x))} min</b><small>${esc(x.desc)}</small></button>`).join("")}</div>
    <p class="sm muted" style="margin:12px 0 0">La app te va marcando cada ejercicio y cada descanso, con vibración y sonido.</p>`);
  document.querySelectorAll("[data-preset]").forEach(b => b.onclick = () => {
    const k = b.dataset.preset, x = presets[k];
    empezarGuiada({ tipo, clave: tipo + "-" + k, nombre: x.nombre, met: x.met, pasos: armar(k, x) });
  });
}

function hojaMovilidad() {
  hojaPresets("Movilidad y estiramiento", "Sesiones cortas para soltar el cuerpo. Van bien después de entrenar o en los días de descanso.", MOVILIDAD, "movilidad");
}
function hojaHIIT() {
  const n = HIIT_NIVEL[S.perfil.nivel] || HIIT_NIVEL.principiante;
  hojaPresets("Funcional / HIIT", `Circuitos por tiempo. Con tu nivel: ${n.trabajo} segundos de trabajo y ${n.pausa} de descanso.`, HIIT, "hiit");
}

function hojaCardioAdentro() {
  let aparato = "bici", intensidad = "moderada";
  abrirSheet(`<div class="sheet-head"><h3>Bici, cinta o elíptico</h3>
    <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="ops fila" id="ca-aparato">${Object.entries(APARATOS).map(([k, a]) =>
      `<button type="button" class="op${k === aparato ? " activo" : ""}" data-a="${k}"><b>${esc(a.nombre)}</b></button>`).join("")}</div>
    <p class="lbl" style="margin:14px 0 8px">¿A qué intensidad?</p>
    <div class="ops" id="ca-int">${Object.entries(INTENSIDADES).map(([k, x]) =>
      `<button type="button" class="op${k === intensidad ? " activo" : ""}" data-i="${k}"><b>${esc(x.nombre)}</b><small>${esc(x.desc)}</small></button>`).join("")}</div>
    <button class="btn block" id="ca-empezar" style="margin-top:14px">Empezar</button>
    <div class="dos" style="margin-top:16px">
      <div class="field"><label for="ca-min">¿Ya lo hiciste? Minutos</label>
        <input id="ca-min" type="number" inputmode="numeric" placeholder="30"></div>
      <div class="field"><label for="ca-fecha">Fecha</label>
        <input id="ca-fecha" type="date" value="${hoyISO()}" max="${hoyISO()}"></div>
    </div>
    <button class="btn ghost block" id="ca-guardar">Cargarlo a mano</button>
    <p class="sm muted" style="margin:12px 0 0">¿Querés intervalos? Están en Funcional / HIIT.</p>`);
  const marcar = (sel, attr, val) => document.querySelectorAll(sel).forEach(o => o.classList.toggle("activo", o.dataset[attr] === val));
  document.querySelectorAll("#ca-aparato [data-a]").forEach(b => b.onclick = () => { aparato = b.dataset.a; marcar("#ca-aparato [data-a]", "a", aparato); });
  document.querySelectorAll("#ca-int [data-i]").forEach(b => b.onclick = () => { intensidad = b.dataset.i; marcar("#ca-int [data-i]", "i", intensidad); });
  document.getElementById("ca-empezar").onclick = () => empezarGuiada({
    tipo: aparato, clave: aparato, nombre: APARATOS[aparato].nombre, libre: true, aparato, intensidad,
    met: APARATOS[aparato].met[intensidad], pasos: []
  });
  document.getElementById("ca-guardar").onclick = () => {
    const min = Math.round(num(document.getElementById("ca-min").value, 0));
    if (!min || min > 600) return toast("Poné cuántos minutos duró.");
    const fecha = document.getElementById("ca-fecha").value || hoyISO();
    const kcal = kcalSesion(min, pesoActual(), APARATOS[aparato].met[intensidad]);
    const nombre = `${APARATOS[aparato].nombre} · ${INTENSIDADES[intensidad].nombre.toLowerCase()}`;
    S.sesiones.push({ id: nuevoId(), fecha, bloque: aparato, nombre, tipo: aparato, series: 0, min, kcal, volumen: 0 });
    S.sesiones.sort((a, b) => a.fecha.localeCompare(b.fecha));
    guardar("Guardado"); cerrarSheet(); pintar();
    toast(`${nombre} cargada · ${kcal} kcal.`);
  };
}

/* ---------- la sección del menú de Entrenar ---------- */
const ICO_ACT = {
  cali: `<svg viewBox="0 0 24 24"><path d="M4 5h16"/><path d="M8 5v3M16 5v3"/><circle cx="12" cy="11" r="2"/><path d="M8 8l4 5 4-5M12 13v4l-2.5 4M12 17l2.5 4"/></svg>`,
  hiit: `<svg viewBox="0 0 24 24"><path d="M13 2 5 13h6l-1 9 8-11h-6l1-9z"/></svg>`,
  movilidad: `<svg viewBox="0 0 24 24"><circle cx="12" cy="4.5" r="2"/><path d="M4 9.5c3 .8 5.5 1 8 1s5-.2 8-1M12 10.5V15l-4 6M12 15l4 6"/></svg>`,
  adentro: `<svg viewBox="0 0 24 24"><circle cx="6" cy="17" r="3.5"/><circle cx="18" cy="17" r="3.5"/><path d="M6 17l4-8h5l3 8M10 9 8.5 6H7M15 9l1-3h2"/></svg>`
};

function seccionActividades() {
  const cali = RUTINAS_CALI[siguienteCali()];
  return `<p class="eyebrow" style="margin:22px 2px 10px">Más formas de entrenar</p>
    <div class="menu">
      ${filaMenu("act-cali", "Calistenia", `Con tu peso corporal · te toca ${cali.nombre.split(" ")[1]}`, ICO_ACT.cali)}
      ${filaMenu("act-hiit", "Funcional / HIIT", "Circuitos por tiempo, sin equipo", ICO_ACT.hiit)}
      ${filaMenu("act-movilidad", "Movilidad y estiramiento", "Sesiones cortas para soltar el cuerpo", ICO_ACT.movilidad)}
      ${filaMenu("act-adentro", "Bici, cinta o elíptico", "Cardio por tiempo, en el gimnasio o en casa", ICO_ACT.adentro)}
    </div>`;
}
function conectarActividades() {
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  on("act-cali", () => { Entrenar.cali = null; abrirSub("cali"); });
  on("act-hiit", hojaHIIT);
  on("act-movilidad", hojaMovilidad);
  on("act-adentro", hojaCardioAdentro);
}
