"use strict";
/* ============ dibujos de los movimientos ============
   Cada movimiento se muestra en dos poses: cómo se empieza y cómo se
   termina. Las figuras se arman con FIG() (ver figura.js) a partir de las
   articulaciones; acá solo van las poses y el equipamiento. */

const DB = (x, y) => `<path class="gear" d="M${x - 8} ${y} H${x + 8}"/><circle class="gearfill" cx="${x - 9}" cy="${y}" r="4.2"/><circle class="gearfill" cx="${x + 9}" cy="${y}" r="4.2"/>`;
const BAR = (x1, x2, y) => `<path class="gear" d="M${x1} ${y} H${x2}"/><circle class="gearfill" cx="${x1 + 5}" cy="${y}" r="6"/><circle class="gearfill" cx="${x2 - 5}" cy="${y}" r="6"/>`;
const FLOOR = `<path class="floor" d="M8 130 H142"/>`;
const BENCH = d => `<path class="bench" d="${d}"/>`;
const THIN = d => `<path class="thin" d="${d}"/>`;
const RODILLO = (x, y) => `<circle class="gearfill" cx="${x}" cy="${y}" r="6"/>`;
const POLEA = (x) => THIN(`M${x + 20} 14 V124 M${x + 20} 18 H${x}`) + `<circle class="thin" cx="${x}" cy="22" r="4" fill="none"/>`;

const PATTERNS = {
  pressHorizontal: { capA: "Abajo, a la altura del pecho", capB: "Arriba, brazos largos",
    a: FLOOR + BENCH("M22 100 H128") + THIN("M34 103 V128 M116 103 V128") +
       FIG({ cab: [30, 88], hom: [48, 92], cad: [96, 93], br: [[44, 80], [60, 73]], br2: [[46, 84], [62, 77]],
             pi: [[112, 106], [122, 128], [131, 129]], pi2: [[110, 110], [118, 128], [127, 129]] }) + BAR(42, 100, 71),
    b: FLOOR + BENCH("M22 100 H128") + THIN("M34 103 V128 M116 103 V128") +
       FIG({ cab: [30, 88], hom: [48, 92], cad: [96, 93], br: [[56, 76], [60, 56]], br2: [[58, 80], [62, 60]],
             pi: [[112, 106], [122, 128], [131, 129]], pi2: [[110, 110], [118, 128], [127, 129]] }) + BAR(40, 98, 54) },

  pressVertical: { capA: "Manos a la altura del hombro", capB: "Arriba, sin trabar el codo",
    a: FLOOR + BENCH("M46 104 H110 M46 104 L41 56") + THIN("M58 107 V128 M100 107 V128") +
       FIG({ cab: [56, 44], hom: [58, 58], cad: [66, 96], br: [[54, 78], [72, 66]],
             pi: [[96, 100], [100, 128], [110, 129]] }) + DB(74, 64),
    b: FLOOR + BENCH("M46 104 H110 M46 104 L41 56") + THIN("M58 107 V128 M100 107 V128") +
       FIG({ cab: [56, 44], hom: [58, 58], cad: [66, 96], br: [[66, 42], [74, 26]],
             pi: [[96, 100], [100, 128], [110, 129]] }) + DB(74, 24) },

  jalonVertical: { capA: "Brazos estirados arriba", capB: "Codos abajo, pecho alto",
    a: FLOOR + POLEA(84) + BENCH("M56 102 H108") +
       FIG({ cab: [62, 50], hom: [64, 62], cad: [70, 98], br: [[74, 44], [80, 26]],
             pi: [[98, 104], [104, 128], [113, 129]] }) + BAR(60, 104, 24),
    b: FLOOR + POLEA(84) + BENCH("M56 102 H108") +
       FIG({ cab: [62, 50], hom: [64, 62], cad: [70, 98], br: [[52, 76], [64, 60]],
             pi: [[98, 104], [104, 128], [113, 129]] }) + BAR(44, 88, 59) },

  remoHorizontal: { capA: "Brazos estirados adelante", capB: "Codos atrás, omóplatos juntos",
    a: FLOOR + BENCH("M28 104 H86") + THIN("M124 40 V124 M122 62 H104") +
       FIG({ cab: [36, 54], hom: [40, 66], cad: [46, 100], br: [[68, 70], [94, 70]],
             pi: [[76, 106], [82, 128], [91, 129]] }) + RODILLO(99, 70),
    b: FLOOR + BENCH("M28 104 H86") + THIN("M124 40 V124 M122 62 H104") +
       FIG({ cab: [36, 54], hom: [40, 66], cad: [46, 100], br: [[32, 82], [58, 76]],
             pi: [[76, 106], [82, 128], [91, 129]] }) + RODILLO(63, 76) },

  sentadilla: { capA: "De pie, pecho alto", capB: "Cadera atrás, muslo paralelo",
    a: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[62, 50], [56, 44]], br2: [[90, 50], [96, 44]],
             pi: [[66, 104], [66, 128], [76, 130]], pi2: [[86, 104], [86, 128], [96, 130]] }) + BAR(48, 104, 43),
    b: FLOOR + FIG({ cab: [83, 42], hom: [80, 58], cad: [70, 88], br: [[66, 66], [60, 60]], br2: [[94, 66], [100, 60]],
             pi: [[90, 102], [88, 128], [98, 130]], pi2: [[54, 100], [58, 128], [68, 130]] }) + BAR(52, 108, 59) },

  bisagra: { capA: "De pie, peso en los muslos", capB: "Cadera atrás, espalda recta",
    a: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[70, 60], [68, 84]],
             pi: [[68, 104], [68, 128], [78, 130]], pi2: [[86, 104], [86, 128], [96, 130]] }) + DB(68, 86),
    b: FLOOR + FIG({ cab: [44, 50], hom: [56, 58], cad: [84, 78], br: [[58, 76], [58, 102]],
             pi: [[78, 102], [76, 128], [86, 130]], pi2: [[92, 102], [90, 128], [100, 130]] }) + DB(58, 104) },

  zancada: { capA: "De pie, mirada al frente", capB: "Rodilla de atrás casi al piso",
    a: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[63, 60], [62, 82]], br2: [[89, 60], [90, 82]],
             pi: [[66, 104], [66, 128], [76, 130]], pi2: [[86, 104], [86, 128], [96, 130]] }) + DB(62, 84) + DB(90, 84),
    b: FLOOR + FIG({ cab: [75, 38], hom: [75, 54], cad: [75, 92], br: [[63, 72], [62, 94]], br2: [[89, 72], [90, 94]],
             pi: [[102, 104], [102, 128], [112, 130]], pi2: [[56, 112], [72, 128], [80, 126]] }) + DB(62, 96) + DB(90, 96) },

  extensionRodilla: { capA: "Rodillas dobladas", capB: "Piernas estiradas al frente",
    a: FLOOR + BENCH("M34 96 H84 M34 96 L28 50") + THIN("M44 99 V128 M76 99 V128") +
       FIG({ cab: [42, 42], hom: [45, 56], cad: [54, 92], br: [[48, 74], [46, 94]],
             pi: [[84, 96], [88, 120]] }) + RODILLO(89, 122),
    b: FLOOR + BENCH("M34 96 H84 M34 96 L28 50") + THIN("M44 99 V128 M76 99 V128") +
       FIG({ cab: [42, 42], hom: [45, 56], cad: [54, 92], br: [[48, 74], [46, 94]],
             pi: [[84, 96], [114, 88]] }) + RODILLO(118, 87) },

  curlFemoral: { capA: "Boca abajo, piernas estiradas", capB: "Talones hacia el glúteo",
    a: FLOOR + BENCH("M24 96 H120") + THIN("M36 99 V128 M108 99 V128") +
       FIG({ cab: [30, 84], hom: [46, 90], cad: [88, 92], br: [[44, 80], [34, 76]],
             pi: [[108, 92], [124, 92]] }) + RODILLO(127, 92),
    b: FLOOR + BENCH("M24 96 H120") + THIN("M36 99 V128 M108 99 V128") +
       FIG({ cab: [30, 84], hom: [46, 90], cad: [88, 92], br: [[44, 80], [34, 76]],
             pi: [[106, 78], [96, 58]] }) + RODILLO(94, 55) },

  curlBiceps: { capA: "Brazos estirados al costado", capB: "Antebrazo arriba, codo quieto",
    a: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[64, 62], [62, 84]], br2: [[88, 62], [90, 84]],
             pi: [[67, 104], [67, 128], [77, 130]], pi2: [[85, 104], [85, 128], [95, 130]] }) + DB(62, 86) + DB(90, 86),
    b: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[64, 62], [70, 48]], br2: [[88, 62], [82, 48]],
             pi: [[67, 104], [67, 128], [77, 130]], pi2: [[85, 104], [85, 128], [95, 130]] }) + DB(70, 45) + DB(82, 45) },

  extensionTriceps: { capA: "Codos a 90°, pegados al cuerpo", capB: "Brazos estirados abajo",
    a: FLOOR + POLEA(104) +
       FIG({ cab: [64, 24], hom: [64, 41], cad: [64, 80], br: [[67, 62], [84, 57]],
             pi: [[56, 104], [56, 128], [66, 130]], pi2: [[74, 104], [74, 128], [84, 130]] }) + BAR(76, 108, 56),
    b: FLOOR + POLEA(104) +
       FIG({ cab: [64, 24], hom: [64, 41], cad: [64, 80], br: [[67, 62], [84, 80]],
             pi: [[56, 104], [56, 128], [66, 130]], pi2: [[74, 104], [74, 128], [84, 130]] }) + BAR(76, 108, 80) },

  elevacionLateral: { capA: "Peso al costado del cuerpo", capB: "Brazos a la altura del hombro",
    a: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[64, 62], [62, 82]], br2: [[88, 62], [90, 82]],
             pi: [[67, 104], [67, 128], [77, 130]], pi2: [[85, 104], [85, 128], [95, 130]] }) + DB(62, 84) + DB(90, 84),
    b: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[56, 42], [38, 44]], br2: [[94, 42], [112, 44]],
             pi: [[67, 104], [67, 128], [77, 130]], pi2: [[85, 104], [85, 128], [95, 130]] }) + DB(34, 44) + DB(116, 44) },

  elevacionFrontal: { capA: "Peso apoyado en los muslos", capB: "Brazos al frente, a la altura del hombro",
    a: FLOOR + FIG({ cab: [48, 24], hom: [48, 41], cad: [48, 80], br: [[54, 60], [56, 82]],
             pi: [[40, 104], [40, 128], [50, 130]], pi2: [[58, 104], [58, 128], [68, 130]] }) + DB(58, 84),
    b: FLOOR + FIG({ cab: [48, 24], hom: [48, 41], cad: [48, 80], br: [[74, 44], [100, 44]],
             pi: [[40, 104], [40, 128], [50, 130]], pi2: [[58, 104], [58, 128], [68, 130]] }) + DB(104, 44) },

  core: { capA: "Codos bajo el hombro, cuerpo firme", capB: "Aguantá sin que caiga la cadera",
    a: FLOOR + FIG({ cab: [30, 80], hom: [46, 86], cad: [88, 98], br: [[44, 112], [26, 126]],
             pi: [[112, 110], [132, 126], [138, 128]] }),
    b: FLOOR + FIG({ cab: [30, 80], hom: [46, 86], cad: [88, 98], br: [[44, 112], [26, 126]],
             pi: [[112, 110], [132, 126], [138, 128]] }) +
       `<path class="arrow" d="M88 64 V82 m-5 -6 l5 6 5 -6"/>` },

  abdominales: { capA: "Espalda apoyada, rodillas dobladas", capB: "Subí los hombros, no el cuello",
    a: FLOOR + FIG({ cab: [34, 108], hom: [48, 112], cad: [88, 114], br: [[54, 100], [44, 94]],
             pi: [[106, 94], [118, 114], [126, 116]] }),
    b: FLOOR + FIG({ cab: [44, 88], hom: [56, 96], cad: [90, 114], br: [[62, 86], [54, 80]],
             pi: [[106, 94], [118, 114], [126, 116]] }) },

  elevacionPiernas: { capA: "Piernas estiradas cerca del piso", capB: "Subí hasta 90° sin arquear",
    a: FLOOR + FIG({ cab: [28, 108], hom: [42, 112], cad: [84, 114], br: [[34, 100], [22, 104]],
             pi: [[108, 114], [130, 114], [136, 111]] }),
    b: FLOOR + FIG({ cab: [28, 108], hom: [42, 112], cad: [84, 114], br: [[34, 100], [22, 104]],
             pi: [[94, 84], [98, 52], [104, 48]] }) },

  flexion: { capA: "Brazos estirados, cuerpo en tabla", capB: "Pecho casi al piso, codos a 45°",
    a: FLOOR + FIG({ cab: [34, 74], hom: [48, 80], cad: [90, 94], br: [[46, 104], [44, 126]],
             pi: [[112, 106], [132, 126], [138, 128]] }),
    b: FLOOR + FIG({ cab: [34, 98], hom: [50, 102], cad: [92, 108], br: [[38, 114], [46, 126]],
             pi: [[114, 116], [132, 126], [138, 128]] }) },

  hipThrust: { capA: "Cadera abajo, espalda en el banco", capB: "Arriba: cuerpo en línea recta",
    a: FLOOR + BENCH("M18 74 H62") + THIN("M26 77 V128 M54 77 V128") +
       FIG({ cab: [26, 56], hom: [40, 68], cad: [78, 102], br: [[56, 88], [66, 100]],
             pi: [[104, 108], [108, 128], [117, 129]] }) + BAR(60, 96, 100),
    b: FLOOR + BENCH("M18 74 H62") + THIN("M26 77 V128 M54 77 V128") +
       FIG({ cab: [26, 56], hom: [40, 68], cad: [84, 80], br: [[60, 68], [70, 78]],
             pi: [[106, 100], [110, 128], [119, 129]] }) + BAR(66, 102, 76) },

  gemelos: { capA: "Talón por debajo del escalón", capB: "Punta de pie, bien arriba",
    a: FLOOR + THIN("M52 112 H120 V130") + FIG({ cab: [75, 30], hom: [75, 46], cad: [75, 84],
             br: [[64, 64], [62, 84]], br2: [[86, 64], [88, 84]],
             pi: [[70, 106], [70, 124], [80, 124]], pi2: [[84, 106], [84, 124], [94, 124]] }),
    b: FLOOR + THIN("M52 112 H120 V130") + FIG({ cab: [75, 20], hom: [75, 36], cad: [75, 74],
             br: [[64, 54], [62, 74]], br2: [[86, 54], [88, 74]],
             pi: [[70, 96], [70, 112], [82, 108]], pi2: [[84, 96], [84, 112], [96, 108]] }) },

  apertura: { capA: "Brazos abiertos, codo apenas doblado", capB: "Juntá adelante y apretá",
    a: BENCH("M50 112 H100") + FIG({ cab: [75, 28], hom: [75, 48], cad: [75, 92],
             br: [[52, 46], [34, 54]], br2: [[98, 46], [116, 54]],
             pi: [[66, 110], [66, 120]], pi2: [[84, 110], [84, 120]] }) + RODILLO(30, 56) + RODILLO(120, 56),
    b: BENCH("M50 112 H100") + FIG({ cab: [75, 28], hom: [75, 48], cad: [75, 92],
             br: [[58, 52], [68, 62]], br2: [[92, 52], [82, 62]],
             pi: [[66, 110], [66, 120]], pi2: [[84, 110], [84, 120]] }) + RODILLO(68, 64) + RODILLO(82, 64) },

  abduccion: { capA: "Rodillas juntas", capB: "Abrí contra la resistencia",
    a: BENCH("M46 104 H104 M46 104 L41 58") + THIN("M56 107 V128 M96 107 V128") +
       FIG({ cab: [75, 32], hom: [75, 48], cad: [75, 80], br: [[64, 64], [62, 84]], br2: [[86, 64], [88, 84]],
             pi: [[68, 100], [68, 122]], pi2: [[82, 100], [82, 122]] }) + `<path class="gear" d="M60 96 V118 M90 96 V118"/>`,
    b: BENCH("M46 104 H104 M46 104 L41 58") + THIN("M56 107 V128 M96 107 V128") +
       FIG({ cab: [75, 32], hom: [75, 48], cad: [75, 80], br: [[64, 64], [62, 84]], br2: [[86, 64], [88, 84]],
             pi: [[58, 98], [52, 120]], pi2: [[92, 98], [98, 120]] }) + `<path class="gear" d="M44 94 V118 M106 94 V118"/>` },

  encogimiento: { capA: "Hombros relajados abajo", capB: "Subí los hombros a las orejas",
    a: FLOOR + FIG({ cab: [75, 26], hom: [75, 46], cad: [75, 82], br: [[62, 62], [60, 78]], br2: [[88, 62], [90, 78]],
             pi: [[67, 104], [67, 128], [77, 130]], pi2: [[85, 104], [85, 128], [95, 130]] }) + DB(60, 80) + DB(90, 80),
    b: FLOOR + FIG({ cab: [75, 24], hom: [75, 38], cad: [75, 82], br: [[62, 54], [60, 70]], br2: [[88, 54], [90, 70]],
             pi: [[67, 104], [67, 128], [77, 130]], pi2: [[85, 104], [85, 128], [95, 130]] }) + DB(60, 72) + DB(90, 72) },

  cardio: { capA: "Ritmo cómodo para entrar en calor", capB: "Podés hablar de a frases cortas",
    a: THIN("M14 122 H136 M20 122 L26 92 H118 L124 122 M118 92 V44 M108 48 H128") +
       FIG({ cab: [60, 32], hom: [60, 48], cad: [60, 72], br: [[50, 60], [46, 70]], br2: [[70, 60], [76, 56]],
             pi: [[52, 82], [48, 92], [40, 93]], pi2: [[68, 82], [72, 92], [80, 93]], r: 9 }),
    b: THIN("M14 122 H136 M20 122 L26 92 H118 L124 122 M118 92 V44 M108 48 H128") +
       FIG({ cab: [60, 30], hom: [60, 46], cad: [60, 70], br: [[48, 58], [42, 50]], br2: [[72, 58], [78, 66]],
             pi: [[44, 74], [38, 86], [30, 88]], pi2: [[74, 80], [78, 92], [86, 93]], r: 9 }) },

  /* ---------- calistenia y funcional ---------- */
  pike: { capA: "Cadera arriba, cuerpo en V", capB: "La cabeza baja entre las manos",
    a: FLOOR + FIG({ cab: [42, 92], hom: [52, 80], cad: [88, 52], br: [[40, 104], [32, 126]],
             pi: [[112, 88], [126, 126], [134, 128]] }),
    b: FLOOR + FIG({ cab: [34, 112], hom: [50, 98], cad: [88, 54], br: [[40, 116], [32, 126]],
             pi: [[112, 90], [126, 126], [134, 128]] }) },

  fondos: { capA: "Brazos estirados, cuerpo suspendido", capB: "Codo a 90°, hombros abajo",
    a: FLOOR + THIN("M28 92 H60 M110 92 H142") + FIG({ cab: [72, 32], hom: [72, 48], cad: [76, 88],
             br: [[62, 68], [58, 90]], pi: [[100, 96], [104, 116]] }),
    b: FLOOR + THIN("M28 92 H60 M110 92 H142") + FIG({ cab: [72, 52], hom: [72, 68], cad: [78, 104],
             br: [[54, 78], [58, 90]], pi: [[102, 110], [106, 126]] }) },

  vertical: { capA: "Subí caminando por la pared", capB: "Cuerpo vertical, panza a la pared",
    a: FLOOR + THIN("M118 10 V130") + FIG({ cab: [62, 104], hom: [70, 92], cad: [92, 78],
             br: [[64, 108], [58, 126]], pi: [[108, 62], [116, 48], [117, 42]] }),
    b: FLOOR + THIN("M118 10 V130") + FIG({ cab: [72, 106], hom: [74, 92], cad: [80, 52],
             br: [[72, 110], [70, 126]], pi: [[84, 34], [86, 16], [93, 14]] }) },

  hollow: { capA: "Lumbar pegada al piso", capB: "Hombros y piernas despegados",
    a: FLOOR + FIG({ cab: [40, 106], hom: [52, 110], cad: [90, 114], br: [[34, 100], [20, 98]],
             pi: [[110, 114], [130, 114], [136, 111]] }),
    b: FLOOR + FIG({ cab: [42, 96], hom: [54, 102], cad: [90, 112], br: [[34, 88], [20, 84]],
             pi: [[110, 108], [130, 100], [136, 97]] }) },

  colgado: { capA: "Colgado, cuerpo quieto", capB: "Rodillas al pecho, sin balanceo",
    a: THIN("M20 22 H130") + FIG({ cab: [70, 52], hom: [70, 66], cad: [72, 102],
             br: [[70, 44], [70, 26]], pi: [[74, 116], [76, 134]] }),
    b: THIN("M20 22 H130") + FIG({ cab: [70, 52], hom: [70, 66], cad: [74, 100],
             br: [[70, 44], [70, 26]], pi: [[100, 92], [104, 116], [112, 118]],
             pi2: [[98, 96], [102, 120], [110, 122]] }) },

  dominada: { capA: "Colgado, brazos estirados", capB: "Mentón por encima de la barra",
    a: THIN("M20 22 H130") + FIG({ cab: [70, 52], hom: [70, 66], cad: [72, 102],
             br: [[70, 44], [70, 26]], pi: [[74, 118], [76, 136]] }),
    b: THIN("M20 22 H130") + FIG({ cab: [70, 30], hom: [70, 46], cad: [74, 82],
             br: [[58, 38], [68, 26]], pi: [[78, 98], [74, 120]] }) },

  lsit: { capA: "Manos al costado de la cadera", capB: "Cola despegada y piernas rectas",
    a: FLOOR + FIG({ cab: [56, 62], hom: [58, 76], cad: [62, 110], br: [[58, 96], [58, 124]],
             pi: [[92, 112], [122, 112], [128, 108]] }),
    b: FLOOR + FIG({ cab: [56, 52], hom: [58, 66], cad: [62, 100], br: [[58, 90], [58, 124]],
             pi: [[92, 100], [122, 96], [128, 92]] }) },

  tijera: { capA: "Pies juntos, brazos abajo", capB: "Abrí piernas y brazos a la vez",
    a: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[68, 60], [70, 82]], br2: [[82, 60], [80, 82]],
             pi: [[71, 104], [71, 128], [79, 130]], pi2: [[79, 104], [79, 128], [87, 130]] }),
    b: FLOOR + FIG({ cab: [75, 24], hom: [75, 41], cad: [75, 80], br: [[54, 28], [42, 16]], br2: [[96, 28], [108, 16]],
             pi: [[58, 102], [46, 128], [38, 130]], pi2: [[92, 102], [104, 128], [112, 130]] }) },

  escalador: { capA: "Posición de tabla, cadera baja", capB: "Rodilla al pecho, alternando",
    a: FLOOR + FIG({ cab: [34, 74], hom: [48, 80], cad: [90, 94], br: [[46, 104], [44, 126]],
             pi: [[112, 106], [132, 126], [138, 128]] }),
    b: FLOOR + FIG({ cab: [34, 74], hom: [48, 80], cad: [90, 94], br: [[46, 104], [44, 126]],
             pi: [[74, 100], [66, 118], [58, 122]], pi2: [[112, 108], [132, 126], [138, 128]] }) },

  burpee: { capA: "Cuclillas, manos al piso", capB: "Pies atrás, cuerpo en tabla",
    a: FLOOR + FIG({ cab: [58, 62], hom: [60, 76], cad: [64, 100], br: [[58, 108], [54, 126]],
             pi: [[86, 108], [74, 126], [86, 128]] }),
    b: FLOOR + FIG({ cab: [34, 74], hom: [48, 80], cad: [90, 94], br: [[46, 104], [44, 126]],
             pi: [[112, 106], [132, 126], [138, 128]] }) }
};

function patternSVG(key, label) {
  const p = PATTERNS[key]; if (!p) return "";
  return `<svg viewBox="0 0 330 140" role="img" aria-label="Ilustración de ${label}">
    <g>${p.a}</g><g transform="translate(180,0)">${p.b}</g>
    <path class="arrow" d="M156 76 h16 m-6 -6 l6 6 -6 6"/></svg>
  <div class="poses"><p><b>1</b>${p.capA}</p><p><b>2</b>${p.capB}</p></div>`;
}
