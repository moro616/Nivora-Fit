"use strict";
/* ============ dibujos de los movimientos ============ */
const L = d => `<path class="body" d="${d}"/>`;
const HEAD = (x, y, r) => `<circle class="head" cx="${x}" cy="${y}" r="${r || 9}"/>`;
const DB = (x, y) => `<path class="gear" d="M${x - 8} ${y} H${x + 8}"/><circle class="gearfill" cx="${x - 9}" cy="${y}" r="4.2"/><circle class="gearfill" cx="${x + 9}" cy="${y}" r="4.2"/>`;
const BAR = (x1, x2, y) => `<path class="gear" d="M${x1} ${y} H${x2}"/><circle class="gearfill" cx="${x1 + 5}" cy="${y}" r="6"/><circle class="gearfill" cx="${x2 - 5}" cy="${y}" r="6"/>`;
const FLOOR = `<path class="floor" d="M8 130 H142"/>`;
const BENCH = d => `<path class="bench" d="${d}"/>`;
const THIN = d => `<path class="thin" d="${d}"/>`;

const PATTERNS = {
  pressHorizontal: { capA: "Abajo, a la altura del pecho", capB: "Arriba, brazos largos",
    a: FLOOR + BENCH("M22 100 H128") + THIN("M34 103 V128 M116 103 V128") + HEAD(34, 88) +
       L("M44 91 H94") + L("M94 91 L108 95 L112 116 L124 127") + L("M58 91 L45 79 L63 71") + BAR(42, 100, 71),
    b: FLOOR + BENCH("M22 100 H128") + THIN("M34 103 V128 M116 103 V128") + HEAD(34, 88) +
       L("M44 91 H94") + L("M94 91 L108 95 L112 116 L124 127") + L("M58 91 L59 74 L62 54") + BAR(40, 98, 54) },
  pressVertical: { capA: "Manos a la altura del hombro", capB: "Arriba, sin trabar el codo",
    a: FLOOR + BENCH("M46 104 H110 M46 104 L41 58") + THIN("M58 107 V128 M100 107 V128") + HEAD(56, 46) +
       L("M58 55 L64 94") + L("M64 94 L96 99 L100 128") + L("M61 64 L54 82 L74 66") + DB(74, 64),
    b: FLOOR + BENCH("M46 104 H110 M46 104 L41 58") + THIN("M58 107 V128 M100 107 V128") + HEAD(56, 46) +
       L("M58 55 L64 94") + L("M64 94 L96 99 L100 128") + L("M61 64 L70 44 L74 24") + DB(74, 22) },
  jalonVertical: { capA: "Brazos estirados arriba", capB: "Codos abajo, pecho alto",
    a: FLOOR + THIN("M120 14 V122 M120 18 H84") + `<circle class="thin" cx="84" cy="22" r="4" fill="none"/>` +
       BENCH("M56 102 H108") + HEAD(62, 52) + L("M64 61 L68 98") + L("M68 98 L98 102 L104 128") +
       L("M66 70 L74 46 L82 26") + BAR(60, 104, 24),
    b: FLOOR + THIN("M120 14 V122 M120 18 H84") + `<circle class="thin" cx="84" cy="22" r="4" fill="none"/>` +
       BENCH("M56 102 H108") + HEAD(62, 52) + L("M64 61 L68 98") + L("M68 98 L98 102 L104 128") +
       L("M66 70 L52 74 L62 62") + BAR(42, 86, 61) },
  remoHorizontal: { capA: "Brazos estirados adelante", capB: "Codos atrás, omóplatos juntos",
    a: FLOOR + BENCH("M28 104 H86") + THIN("M124 40 V124 M122 62 H100") + HEAD(36, 56) +
       L("M39 65 L42 100") + L("M42 100 L76 104 L82 128") + L("M41 74 L64 72 L94 70") +
       `<circle class="gearfill" cx="98" cy="70" r="6"/>`,
    b: FLOOR + BENCH("M28 104 H86") + THIN("M124 40 V124 M122 62 H100") + HEAD(36, 56) +
       L("M39 65 L42 100") + L("M42 100 L76 104 L82 128") + L("M41 74 L30 84 L56 78") +
       `<circle class="gearfill" cx="60" cy="78" r="6"/>` },
  sentadilla: { capA: "De pie, pecho alto", capB: "Cadera atrás, muslo paralelo",
    a: FLOOR + HEAD(75, 26) + L("M75 35 V78") + L("M75 78 L64 104 L64 128") + L("M75 78 L88 104 L88 128") +
       L("M75 46 L58 46 M75 46 L92 46") + BAR(46, 104, 44),
    b: FLOOR + HEAD(80, 44) + L("M80 53 L70 86") + L("M70 86 L92 100 L90 128") + L("M70 86 L52 100 L58 128") +
       L("M78 62 L61 62 M78 62 L95 62") + BAR(49, 107, 60) },
  bisagra: { capA: "De pie, peso en los muslos", capB: "Cadera atrás, espalda recta",
    a: FLOOR + HEAD(75, 26) + L("M75 35 V80") + L("M75 80 L66 104 L66 128") + L("M75 80 L86 104 L86 128") +
       L("M75 46 L68 70 L68 84") + DB(68, 86),
    b: FLOOR + HEAD(44, 52) + L("M52 56 L80 76") + L("M80 76 L74 102 L74 128") + L("M80 76 L88 102 L88 128") +
       L("M58 62 L58 88 L58 104") + DB(58, 106) },
  zancada: { capA: "De pie, mirada al frente", capB: "Rodilla de atrás casi al piso",
    a: FLOOR + HEAD(75, 26) + L("M75 35 V80") + L("M75 80 L64 104 L64 128") + L("M75 80 L88 104 L88 128") +
       L("M75 46 L62 68 L62 82") + DB(62, 84) + L("M75 46 L90 68 L90 82") + DB(90, 84),
    b: FLOOR + HEAD(75, 40) + L("M75 49 V90") + L("M75 90 L102 100 L102 128") + L("M75 90 L54 108 L68 128") +
       L("M75 58 L62 80 L62 94") + DB(62, 96) + L("M75 58 L90 80 L90 94") + DB(90, 96) },
  extensionRodilla: { capA: "Rodillas dobladas", capB: "Piernas estiradas al frente",
    a: FLOOR + BENCH("M34 96 H84 M34 96 L28 52") + THIN("M44 99 V128 M76 99 V128 M104 70 V116") +
       HEAD(42, 44) + L("M45 53 L50 90") + L("M50 90 L84 94 L86 120") + `<circle class="gearfill" cx="88" cy="122" r="6"/>`,
    b: FLOOR + BENCH("M34 96 H84 M34 96 L28 52") + THIN("M44 99 V128 M76 99 V128 M104 70 V116") +
       HEAD(42, 44) + L("M45 53 L50 90") + L("M50 90 L84 94 L114 88") + `<circle class="gearfill" cx="118" cy="87" r="6"/>` },
  curlFemoral: { capA: "Boca abajo, piernas estiradas", capB: "Talones hacia el glúteo",
    a: FLOOR + BENCH("M24 96 H120") + THIN("M36 99 V128 M108 99 V128") + HEAD(30, 86) +
       L("M40 90 H86") + L("M86 90 L120 92") + `<circle class="gearfill" cx="124" cy="92" r="6"/>` + L("M46 90 L40 76"),
    b: FLOOR + BENCH("M24 96 H120") + THIN("M36 99 V128 M108 99 V128") + HEAD(30, 86) +
       L("M40 90 H86") + L("M86 90 L104 76 L96 58") + `<circle class="gearfill" cx="94" cy="55" r="6"/>` + L("M46 90 L40 76") },
  curlBiceps: { capA: "Brazos estirados al costado", capB: "Antebrazo arriba, codo quieto",
    a: FLOOR + HEAD(75, 26) + L("M75 35 V80") + L("M75 80 L66 104 L66 128") + L("M75 80 L86 104 L86 128") +
       L("M75 46 L62 66 L62 84") + DB(62, 86),
    b: FLOOR + HEAD(75, 26) + L("M75 35 V80") + L("M75 80 L66 104 L66 128") + L("M75 80 L86 104 L86 128") +
       L("M75 46 L62 66 L74 50") + DB(76, 47) },
  extensionTriceps: { capA: "Codos a 90°, pegados al cuerpo", capB: "Brazos estirados abajo",
    a: FLOOR + THIN("M126 14 V124 M126 18 H104") + `<circle class="thin" cx="104" cy="22" r="4" fill="none"/>` +
       HEAD(64, 26) + L("M64 35 V80") + L("M64 80 L55 104 L55 128") + L("M64 80 L75 104 L75 128") +
       L("M64 46 L66 64 L84 58") + BAR(76, 108, 57),
    b: FLOOR + THIN("M126 14 V124 M126 18 H104") + `<circle class="thin" cx="104" cy="22" r="4" fill="none"/>` +
       HEAD(64, 26) + L("M64 35 V80") + L("M64 80 L55 104 L55 128") + L("M64 80 L75 104 L75 128") +
       L("M64 46 L66 64 L84 80") + BAR(76, 108, 80) },
  elevacionLateral: { capA: "Peso al costado del cuerpo", capB: "Brazos a la altura del hombro",
    a: FLOOR + HEAD(75, 26) + L("M75 35 V80") + L("M75 80 L66 104 L66 128") + L("M75 80 L86 104 L86 128") +
       L("M75 46 L64 68 L62 82") + DB(62, 84) + L("M75 46 L86 68 L88 82") + DB(88, 84),
    b: FLOOR + HEAD(75, 26) + L("M75 35 V80") + L("M75 80 L66 104 L66 128") + L("M75 80 L86 104 L86 128") +
       L("M75 46 L54 44 L36 46") + DB(34, 46) + L("M75 46 L96 44 L114 46") + DB(116, 46) },
  elevacionFrontal: { capA: "Peso apoyado en los muslos", capB: "Brazos al frente, a la altura del hombro",
    a: FLOOR + HEAD(48, 26) + L("M48 35 V80") + L("M48 80 L38 104 L38 128") + L("M48 80 L60 104 L60 128") +
       L("M48 46 L54 66 L56 82") + DB(58, 84),
    b: FLOOR + HEAD(48, 26) + L("M48 35 V80") + L("M48 80 L38 104 L38 128") + L("M48 80 L60 104 L60 128") +
       L("M48 46 L74 46 L100 46") + DB(104, 46) },
  core: { capA: "Codos bajo el hombro, cuerpo firme", capB: "Aguantá sin que caiga la cadera",
    a: FLOOR + HEAD(30, 76) + L("M40 80 L84 88 L118 104") + L("M40 80 L38 104 L26 110") +
       L("M118 104 L124 118 L128 128") + THIN("M40 104 H26"),
    b: FLOOR + HEAD(30, 84) + L("M40 88 L84 94 L118 106") + L("M40 88 L38 108 L26 114") +
       L("M118 106 L124 118 L128 128") + THIN("M26 114 H14") + `<path class="arrow" d="M84 70 V84 m-5 -5 l5 5 5 -5"/>` },
  abdominales: { capA: "Espalda apoyada, rodillas dobladas", capB: "Subí los hombros, no el cuello",
    a: FLOOR + HEAD(34, 104) + L("M44 108 H84") + L("M84 108 L102 92 L116 108") + L("M48 108 L60 96 L46 92"),
    b: FLOOR + HEAD(40, 88) + L("M50 94 L86 108") + L("M86 108 L102 92 L116 108") + L("M54 96 L64 90 L52 84") },
  elevacionPiernas: { capA: "Piernas estiradas cerca del piso", capB: "Subí hasta 90° sin arquear",
    a: FLOOR + HEAD(28, 104) + L("M38 108 H84") + L("M84 108 L128 110") + L("M38 108 L30 96 L20 100"),
    b: FLOOR + HEAD(28, 104) + L("M38 108 H84") + L("M84 108 L92 76 L96 48") + L("M38 108 L30 96 L20 100") },
  flexion: { capA: "Brazos estirados, cuerpo en tabla", capB: "Pecho casi al piso, codos a 45°",
    a: FLOOR + HEAD(34, 74) + L("M44 78 L88 90 L124 104") + L("M44 78 L42 104 L30 110") +
       L("M124 104 L130 118 L134 128"),
    b: FLOOR + HEAD(34, 96) + L("M46 98 L90 102 L124 108") + L("M46 98 L40 110 L30 114") +
       L("M124 108 L130 120 L134 128") },
  hipThrust: { capA: "Cadera abajo, espalda en el banco", capB: "Arriba: cuerpo en línea recta",
    a: FLOOR + BENCH("M18 74 H62") + THIN("M26 77 V128 M54 77 V128") + HEAD(26, 58) +
       L("M36 66 L76 104") + L("M76 104 L104 106 L108 128") + BAR(60, 96, 100),
    b: FLOOR + BENCH("M18 74 H62") + THIN("M26 77 V128 M54 77 V128") + HEAD(26, 58) +
       L("M36 66 L82 80") + L("M82 80 L104 100 L110 128") + BAR(64, 100, 76) },
  gemelos: { capA: "Talón por debajo del escalón", capB: "Punta de pie, bien arriba",
    a: FLOOR + THIN("M52 112 H120 V130") + HEAD(75, 30) + L("M75 39 V82") +
       L("M75 82 L70 108 L70 122") + L("M75 82 L84 108 L84 122") + L("M70 122 H86") + L("M75 48 L58 52 M75 48 L92 52"),
    b: FLOOR + THIN("M52 112 H120 V130") + HEAD(75, 22) + L("M75 31 V74") +
       L("M75 74 L70 100 L70 112") + L("M75 74 L84 100 L84 112") + L("M70 112 L88 106") + L("M75 40 L58 44 M75 40 L92 44") },
  apertura: { capA: "Brazos abiertos, codo apenas doblado", capB: "Juntá adelante y apretá",
    a: BENCH("M50 110 H100") + `<circle class="thin" cx="75" cy="118" r="3" fill="none"/>` + HEAD(75, 30) +
       L("M75 39 V88") + L("M75 88 L62 106 M75 88 L88 106") + L("M75 50 L44 48 L30 56") + L("M75 50 L106 48 L120 56") +
       `<circle class="gearfill" cx="26" cy="58" r="6"/><circle class="gearfill" cx="124" cy="58" r="6"/>`,
    b: BENCH("M50 110 H100") + `<circle class="thin" cx="75" cy="118" r="3" fill="none"/>` + HEAD(75, 30) +
       L("M75 39 V88") + L("M75 88 L62 106 M75 88 L88 106") + L("M75 50 L56 54 L66 62") + L("M75 50 L94 54 L84 62") +
       `<circle class="gearfill" cx="70" cy="64" r="6"/><circle class="gearfill" cx="80" cy="64" r="6"/>` },
  abduccion: { capA: "Rodillas juntas", capB: "Abrí contra la resistencia",
    a: BENCH("M46 104 H104 M46 104 L41 60") + THIN("M56 107 V128 M96 107 V128") + HEAD(75, 34) +
       L("M75 43 V78") + L("M75 78 L68 100 L68 122") + L("M75 78 L82 100 L82 122") +
       `<path class="gear" d="M62 96 V118 M88 96 V118"/>`,
    b: BENCH("M46 104 H104 M46 104 L41 60") + THIN("M56 107 V128 M96 107 V128") + HEAD(75, 34) +
       L("M75 43 V78") + L("M75 78 L54 98 L50 120") + L("M75 78 L96 98 L100 120") +
       `<path class="gear" d="M42 94 V118 M108 94 V118"/>` },
  encogimiento: { capA: "Hombros relajados abajo", capB: "Subí los hombros a las orejas",
    a: FLOOR + HEAD(75, 28) + L("M75 37 V80") + L("M75 80 L66 104 L66 128") + L("M75 80 L86 104 L86 128") +
       L("M75 46 L60 48 L58 76") + DB(58, 78) + L("M75 46 L90 48 L92 76") + DB(92, 78),
    b: FLOOR + HEAD(75, 30) + L("M75 39 V80") + L("M75 80 L66 104 L66 128") + L("M75 80 L86 104 L86 128") +
       L("M75 40 L60 40 L58 68") + DB(58, 70) + L("M75 40 L90 40 L92 68") + DB(92, 70) },
  cardio: { capA: "Ritmo cómodo para entrar en calor", capB: "Podés hablar de a frases cortas",
    a: THIN("M14 122 H136 M20 122 L26 92 H118 L124 122 M118 92 V44 M110 48 H126") + HEAD(70, 44) +
       L("M70 53 L68 76") + L("M68 76 L60 88 L54 90") + L("M68 76 L78 88 L82 90") +
       L("M70 60 L60 68 L56 74") + L("M70 60 L82 66 L88 62"),
    b: THIN("M14 122 H136 M20 122 L26 92 H118 L124 122 M118 92 V44 M110 48 H126") + HEAD(70, 42) +
       L("M70 51 L68 74") + L("M68 74 L54 82 L46 88") + L("M68 74 L82 84 L88 90") +
       L("M70 58 L58 62 L52 56") + L("M70 58 L84 64 L90 72") }
};

function patternSVG(key, label) {
  const p = PATTERNS[key]; if (!p) return "";
  return `<svg viewBox="0 0 330 140" role="img" aria-label="Ilustración de ${label}">
    <g>${p.a}</g><g transform="translate(180,0)">${p.b}</g>
    <path class="arrow" d="M156 76 h16 m-6 -6 l6 6 -6 6"/></svg>
  <div class="poses"><p><b>1</b>${p.capA}</p><p><b>2</b>${p.capB}</p></div>`;
}
