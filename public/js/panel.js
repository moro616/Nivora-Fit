"use strict";
/* ============================================================
   panel.js — la pestaña Progreso
   Todo dibujado a mano en SVG: liviano, sin librerías y en los dos temas.
   Arriba lo que importa esta semana; abajo, la historia.
   ============================================================ */

const DIA_MS = 86400000;
const esCardio = s => s.km != null;

function lunesDe(iso) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - diaSemana(iso));
  return d.toISOString().slice(0, 10);
}
function sumarDias(iso, n) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/* Las últimas N semanas, de la más vieja a la actual, con sus números. */
function semanas(n) {
  const actual = lunesDe(hoyISO());
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const lunes = sumarDias(actual, -7 * i);
    const hasta = sumarDias(lunes, 7);
    const ses = (S.sesiones || []).filter(s => s.fecha >= lunes && s.fecha < hasta);
    out.push({
      lunes, ses,
      gym: ses.filter(s => !esCardio(s)).reduce((a, s) => a + (s.min || 0), 0),
      cardio: ses.filter(esCardio).reduce((a, s) => a + (s.min || 0), 0),
      km: ses.filter(esCardio).reduce((a, s) => a + (s.km || 0), 0),
      n: ses.length
    });
  }
  return out;
}

/* Semanas seguidas cumpliendo el objetivo, sin contar la actual si todavía no se cumplió. */
function racha(meta) {
  const ss = semanas(52);
  let r = 0;
  for (let i = ss.length - 1; i >= 0; i--) {
    if (ss[i].n >= meta) r++;
    else if (i === ss.length - 1) continue;
    else break;
  }
  return r;
}

function vistaProgreso() {
  const v = document.getElementById("v-progreso");
  const ses = S.sesiones || [];
  const meta = (S.perfil && S.perfil.dias) || 3;
  const sem = semanas(12);
  const esta = sem[sem.length - 1];
  const r = racha(meta);
  const kmTot = ses.filter(esCardio).reduce((a, s) => a + (s.km || 0), 0);
  const minTot = ses.reduce((a, s) => a + (s.min || 0), 0);
  const kcalTot = ses.reduce((a, s) => a + (s.kcal || 0), 0);

  v.innerHTML = `
    <div class="hero panel-hero">
      <div class="anillo-wrap">
        ${anillo(esta.n, meta)}
      </div>
      <div class="panel-sem">
        <p class="eyebrow">Esta semana</p>
        <h2>${esta.n >= meta ? "Objetivo cumplido" : esta.n === 0 ? "Arrancá la semana" : `Te ${meta - esta.n === 1 ? "falta 1" : "faltan " + (meta - esta.n)}`}</h2>
        <dl class="panel-mini">
          <div><dt>Minutos</dt><dd>${esta.gym + esta.cardio}</dd></div>
          <div><dt>Kcal</dt><dd>${redondear(esta.ses.reduce((a, s) => a + (s.kcal || 0), 0), 0)}</dd></div>
          ${esta.km ? `<div><dt>Km</dt><dd>${redondear(esta.km, 1)}</dd></div>` : ""}
        </dl>
        <p class="racha">${r ? `${r} ${r === 1 ? "semana" : "semanas"} seguidas cumpliendo` : "Cumplí la meta para empezar una racha"}</p>
      </div>
    </div>

    ${bloqueLogros()}

    <section class="card pad panel-bloque">
      <div class="graf-head"><h3 class="graf-tit">Constancia</h3><span class="delta">últimas 16 semanas</span></div>
      ${mapaCalor(16)}
    </section>

    <section class="card pad panel-bloque">
      <div class="graf-head"><h3 class="graf-tit">Minutos por semana</h3>
        <span class="leyenda"><i class="lg-gym"></i>Gimnasio${sem.some(s => s.cardio) ? ` <i class="lg-cardio"></i>Afuera` : ""}</span></div>
      ${barrasSemana(sem.slice(-8))}
    </section>

    ${bloqueMusculos()}

    ${graficoLinea("Peso", S.medidas.map(m => ({ x: m.fecha, y: m.peso })), "kg", true)}
    ${graficoLinea("Grasa corporal", S.medidas.map(m => {
        const e = evaluar(S.perfil, m); return { x: m.fecha, y: e && e.grasa };
      }).filter(p => p.y != null), "%", true)}
    ${graficoVolumen()}
    ${kmTot ? graficoKm(sem.slice(-8)) : ""}

    <div class="totales">
      <div><b>${ses.length}</b><span>entrenamientos</span></div>
      <div><b>${minTot < 60 ? minTot + "′" : redondear(minTot / 60, 1) + "h"}</b><span>en movimiento</span></div>
      <div><b>${redondear(kcalTot, 0)}</b><span>kcal</span></div>
      ${kmTot ? `<div><b>${redondear(kmTot, 1)}</b><span>km</span></div>` : ""}
    </div>

    <h3 class="graf-tit" style="margin:24px 2px 10px">Tus mejores cargas</h3>
    ${Object.keys(S.cargas).length ? `<div class="exlist">${Object.entries(S.cargas)
      .filter(([id, c]) => c.kg > 0 && porId(id))
      .sort((a, b) => b[1].kg - a[1].kg).slice(0, 10)
      .map(([id, c]) => `<button class="exrow" data-ej="${id}">
        <span class="exnum mini">${redondear(c.kg, 0)}</span>
        <span class="extxt"><b>${esc(porId(id).nombre)}</b><small>${esc(diaRelativo(c.fecha))}${c.racha > 1 ? " · " + c.racha + " subidas seguidas" : ""}</small></span>
        <span class="exver">ver</span></button>`).join("")}</div>`
      : `<p class="vacio">Cuando entrenes con peso, tus marcas van a aparecer acá.</p>`}`;

  conectarFilas(v);
}

/* ---------- anillo de la semana ---------- */
function anillo(n, meta) {
  const R = 46, C = 2 * Math.PI * R;
  const f = Math.min(1, n / meta);
  const extra = n > meta ? n - meta : 0;
  return `<svg class="anillo" viewBox="0 0 120 120" role="img" aria-label="${n} de ${meta} entrenamientos esta semana">
    <circle class="an-fondo" cx="60" cy="60" r="${R}"/>
    ${f > 0 ? `<circle class="an-valor${f >= 1 ? " lleno" : ""}" cx="60" cy="60" r="${R}"
      stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/>` : ""}
    ${Array.from({ length: meta }, (_, i) => {
      const a = (i / meta) * 2 * Math.PI - Math.PI / 2;
      return `<line class="an-marca" x1="${60 + Math.cos(a) * 38}" y1="${60 + Math.sin(a) * 38}" x2="${60 + Math.cos(a) * 54}" y2="${60 + Math.sin(a) * 54}"/>`;
    }).join("")}
    <text class="an-num" x="60" y="62">${n}<tspan class="an-de" dx="2">/${meta}</tspan></text>
    <text class="an-lbl" x="60" y="80">${extra ? "+" + extra + " extra" : "entrenos"}</text>
  </svg>`;
}

/* ---------- mapa de calor ---------- */
function mapaCalor(nSem) {
  const inicio = sumarDias(lunesDe(hoyISO()), -7 * (nSem - 1));
  const porDia = {};
  (S.sesiones || []).forEach(s => {
    if (s.fecha < inicio) return;
    const d = porDia[s.fecha] || (porDia[s.fecha] = { min: 0, cardio: false, gym: false });
    d.min += s.min || 0;
    if (esCardio(s)) d.cardio = true; else d.gym = true;
  });
  const hoy = hoyISO();
  const celda = 16, gap = 4, izq = 16;
  const W = izq + nSem * (celda + gap), H = 7 * (celda + gap) + 14;
  let cuadros = "";
  for (let w = 0; w < nSem; w++) {
    for (let d = 0; d < 7; d++) {
      const f = sumarDias(inicio, w * 7 + d);
      if (f > hoy) continue;
      const info = porDia[f];
      const nivel = !info ? 0 : info.min < 25 ? 1 : info.min < 50 ? 2 : info.min < 75 ? 3 : 4;
      cuadros += `<rect class="mc n${nivel}${info && info.cardio && !info.gym ? " afuera" : ""}${f === hoy ? " hoy" : ""}"
        x="${izq + w * (celda + gap)}" y="${d * (celda + gap)}" width="${celda}" height="${celda}" rx="4">
        <title>${fechaCorta(f)}${info ? " · " + info.min + " min" : ""}</title></rect>`;
    }
  }
  const meses = [];
  for (let w = 0; w < nSem; w++) {
    const f = sumarDias(inicio, w * 7);
    const m = new Date(f + "T00:00:00").toLocaleDateString("es-AR", { month: "short" }).replace(".", "");
    if (!meses.length || meses[meses.length - 1].m !== m) meses.push({ m, w });
  }
  const activos = Object.keys(porDia).length;
  return `<svg class="mapa" viewBox="0 0 ${W} ${H}" role="img" aria-label="${activos} días con actividad en ${nSem} semanas">
    ${["L", "", "M", "", "V", "", "D"].map((t, d) => t ? `<text class="mc-dia" x="0" y="${d * (celda + gap) + 12}">${t}</text>` : "").join("")}
    ${cuadros}
    ${meses.map(x => `<text class="mc-mes" x="${izq + x.w * (celda + gap)}" y="${H - 1}">${x.m}</text>`).join("")}
  </svg>
  <div class="mc-pie"><span>${activos} ${activos === 1 ? "día activo" : "días activos"}</span>
    <span class="mc-escala">menos <i class="mc n1"></i><i class="mc n2"></i><i class="mc n3"></i><i class="mc n4"></i> más</span></div>`;
}

/* ---------- barras apiladas por semana ---------- */
function barrasSemana(sem) {
  const W = 340, H = 150, abajo = 20, arriba = 18;
  const max = Math.max(60, ...sem.map(s => s.gym + s.cardio));
  const escala = (H - abajo - arriba) / max;
  const ancho = (W / sem.length) * 0.56;
  const paso = W / sem.length;
  const guia = Math.ceil(max / 2 / 30) * 30;
  const yG = H - abajo - guia * escala;
  return `<svg class="barras" viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutos entrenados por semana">
    <line class="rejilla" x1="0" x2="${W}" y1="${yG}" y2="${yG}"/>
    <text class="guia-txt" x="${W}" y="${yG - 4}">${guia}′</text>
    <line class="base" x1="0" x2="${W}" y1="${H - abajo}" y2="${H - abajo}"/>
    ${sem.map((s, i) => {
      const x = i * paso + (paso - ancho) / 2;
      const hG = s.gym * escala, hC = s.cardio * escala;
      const yBase = H - abajo;
      const actual = i === sem.length - 1;
      const tot = s.gym + s.cardio;
      return `<g class="${actual ? "actual" : ""}">
        ${hG ? `<rect class="b-gym" x="${x}" y="${yBase - hG}" width="${ancho}" height="${hG}" rx="${Math.min(5, ancho / 2)}"/>` : ""}
        ${hC ? `<rect class="b-cardio" x="${x}" y="${yBase - hG - hC}" width="${ancho}" height="${hC}" rx="${Math.min(5, ancho / 2)}"/>` : ""}
        ${!tot ? `<rect class="b-vacia" x="${x}" y="${yBase - 3}" width="${ancho}" height="3" rx="1.5"/>` : ""}
        ${tot ? `<text class="b-val" x="${x + ancho / 2}" y="${yBase - hG - hC - 5}">${tot}</text>` : ""}
        <text class="b-eje" x="${x + ancho / 2}" y="${H - 5}">${actual ? "hoy" : new Date(s.lunes + "T00:00:00").getDate() + "/" + (new Date(s.lunes + "T00:00:00").getMonth() + 1)}</text>
      </g>`;
    }).join("")}
  </svg>`;
}

/* ---------- series por músculo, últimos 30 días ---------- */
function bloqueMusculos() {
  const desde = sumarDias(hoyISO(), -30);
  const tot = {};
  (S.sesiones || []).filter(s => s.fecha >= desde && s.grupos).forEach(s =>
    Object.entries(s.grupos).forEach(([g, n]) => { tot[g] = (tot[g] || 0) + n; }));
  const filas = Object.entries(tot).filter(([g]) => g !== "cardio").sort((a, b) => b[1] - a[1]);
  if (!filas.length) return `<section class="card pad panel-bloque">
      <h3 class="graf-tit">Qué músculos trabajaste</h3>
      <p class="vacio chico">Aparece después de tu primer entrenamiento de gimnasio.</p></section>`;
  const max = filas[0][1];
  return `<section class="card pad panel-bloque">
    <div class="graf-head"><h3 class="graf-tit">Qué músculos trabajaste</h3><span class="delta">series · 30 días</span></div>
    <div class="musculos">${filas.map(([g, n]) => `
      <div class="mu-fila"><span>${esc(GRUPOS[g] || g)}</span>
        <div class="mu-barra"><i style="width:${(n / max) * 100}%"></i></div><b>${n}</b></div>`).join("")}
    </div></section>`;
}

/* ---------- línea con ejes ---------- */
function graficoLinea(titulo, puntos, unidad, bajarEsBueno) {
  if (!puntos || puntos.length < 2)
    return `<section class="card pad panel-bloque"><h3 class="graf-tit">${esc(titulo)}</h3>
      <p class="vacio chico">Hacen falta al menos dos registros para dibujar la evolución.</p></section>`;

  const W = 340, H = 140, izq = 34, der = 10, arriba = 16, abajo = 22;
  const ys = puntos.map(p => p.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  const margen = Math.max((max - min) * 0.2, max * 0.01, 0.5);
  min -= margen; max += margen;
  const t0 = new Date(puntos[0].x).getTime(), t1 = new Date(puntos[puntos.length - 1].x).getTime();
  const px = p => izq + ((new Date(p.x).getTime() - t0) / Math.max(1, t1 - t0)) * (W - izq - der);
  const py = y => arriba + (1 - (y - min) / (max - min)) * (H - arriba - abajo);
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${px(p).toFixed(1)} ${py(p.y).toFixed(1)}`).join(" ");
  const area = linea + ` L${px(puntos[puntos.length - 1]).toFixed(1)} ${H - abajo} L${px(puntos[0]).toFixed(1)} ${H - abajo} Z`;
  const ult = puntos[puntos.length - 1];
  const delta = ult.y - puntos[0].y;
  const tono = delta === 0 ? "" : (delta < 0) === !!bajarEsBueno ? "baja" : "sube";
  const marcas = [0, 0.5, 1].map(f => min + f * (max - min));

  return `<section class="card pad panel-bloque">
    <div class="graf-head">
      <h3 class="graf-tit">${esc(titulo)}</h3>
      <span class="delta ${tono}">${delta > 0 ? "+" : ""}${redondear(delta, 1)} ${esc(unidad)}</span>
    </div>
    <p class="graf-actual"><b>${redondear(ult.y, 1)}</b> ${esc(unidad)} <span>${esc(diaRelativo(ult.x))}</span></p>
    <svg class="linea" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de ${esc(titulo.toLowerCase())}">
      <defs><linearGradient id="gr-${titulo.length}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" class="gr-a"/><stop offset="1" class="gr-b"/></linearGradient></defs>
      ${marcas.map(m => `<line class="rejilla" x1="${izq}" x2="${W - der}" y1="${py(m).toFixed(1)}" y2="${py(m).toFixed(1)}"/>
        <text class="guia-txt izq" x="${izq - 6}" y="${(py(m) + 3).toFixed(1)}">${redondear(m, 1)}</text>`).join("")}
      <path d="${area}" fill="url(#gr-${titulo.length})"/>
      <path class="graf-linea" d="${linea}"/>
      ${puntos.length <= 24 ? puntos.map(p => `<circle class="graf-punto" cx="${px(p).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="3"/>`).join("") : ""}
      <circle class="graf-ult" cx="${px(ult).toFixed(1)}" cy="${py(ult.y).toFixed(1)}" r="5"/>
      <text class="b-eje" x="${izq}" y="${H - 4}" text-anchor="start">${esc(fechaCorta(puntos[0].x))}</text>
      <text class="b-eje" x="${W - der}" y="${H - 4}" text-anchor="end">${esc(fechaCorta(ult.x))}</text>
    </svg>
  </section>`;
}

/* ---------- kilos movidos por sesión ---------- */
function graficoVolumen() {
  const ses = (S.sesiones || []).filter(s => !esCardio(s) && s.volumen > 0).slice(-10);
  if (ses.length < 2) return "";
  const W = 340, H = 120, abajo = 18, arriba = 16;
  const max = Math.max(...ses.map(s => s.volumen));
  const paso = W / ses.length, ancho = paso * 0.5;
  const prom = ses.reduce((a, s) => a + s.volumen, 0) / ses.length;
  const yP = H - abajo - (prom / max) * (H - abajo - arriba);
  const ult = ses[ses.length - 1].volumen, ant = ses[ses.length - 2].volumen;
  return `<section class="card pad panel-bloque">
    <div class="graf-head"><h3 class="graf-tit">Kilos movidos por entrenamiento</h3>
      <span class="delta ${ult >= ant ? "baja" : ""}">${ult >= ant ? "+" : ""}${redondear(ult - ant, 0)} kg</span></div>
    <svg class="barras" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volumen de las últimas sesiones">
      ${ses.map((s, i) => {
        const h = (s.volumen / max) * (H - abajo - arriba);
        const x = i * paso + (paso - ancho) / 2;
        return `<rect class="b-gym${i === ses.length - 1 ? "" : " tenue"}" x="${x}" y="${H - abajo - h}" width="${ancho}" height="${h}" rx="4"/>
          <text class="b-eje" x="${x + ancho / 2}" y="${H - 4}">${new Date(s.fecha + "T00:00:00").getDate()}</text>`;
      }).join("")}
      <line class="promedio" x1="0" x2="${W}" y1="${yP}" y2="${yP}"/>
      <text class="guia-txt" x="${W}" y="${yP - 4}">prom. ${redondear(prom, 0)}</text>
    </svg></section>`;
}

/* ---------- km por semana ---------- */
function graficoKm(sem) {
  const W = 340, H = 110, abajo = 18, arriba = 16;
  const max = Math.max(1, ...sem.map(s => s.km));
  const paso = W / sem.length, ancho = paso * 0.5;
  return `<section class="card pad panel-bloque">
    <div class="graf-head"><h3 class="graf-tit">Kilómetros por semana</h3>
      <span class="delta">${redondear(sem[sem.length - 1].km, 1)} km esta semana</span></div>
    <svg class="barras" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kilómetros por semana">
      ${sem.map((s, i) => {
        const h = (s.km / max) * (H - abajo - arriba);
        const x = i * paso + (paso - ancho) / 2;
        return `${h ? `<rect class="b-cardio" x="${x}" y="${H - abajo - h}" width="${ancho}" height="${h}" rx="4"/>
          <text class="b-val" x="${x + ancho / 2}" y="${H - abajo - h - 5}">${redondear(s.km, 1)}</text>`
          : `<rect class="b-vacia" x="${x}" y="${H - abajo - 3}" width="${ancho}" height="3" rx="1.5"/>`}
          <text class="b-eje" x="${x + ancho / 2}" y="${H - 4}">${i === sem.length - 1 ? "hoy" : new Date(s.lunes + "T00:00:00").getDate() + "/" + (new Date(s.lunes + "T00:00:00").getMonth() + 1)}</text>`;
      }).join("")}
    </svg></section>`;
}
