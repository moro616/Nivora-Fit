"use strict";
/* ============================================================
   entreno.js — herramientas de la sesión
   La última vez, calentamiento, calculadora de discos, "máquina ocupada",
   notas por ejercicio y la música.
   ============================================================ */

/* ---------- la última vez ---------- */
function textoUltimaVez(it) {
  const c = S.cargas && S.cargas[it.id];
  const u = c && c.ultima;
  if (!u || !u.series || !u.series.length) return "";
  const sets = u.series;
  const unidad = it.porTiempo ? (it.minutos ? "′" : "″") : "";
  const mismoKg = sets.every(s => s.kg === sets[0].kg);
  const cuerpo = mismoKg
    ? sets.map(s => s.reps + unidad).join(" · ") + (sets[0].kg ? ` con ${redondear(sets[0].kg, 1)} kg` : "")
    : sets.map(s => `${s.reps}${unidad}×${redondear(s.kg, 1)}`).join(" · ") + " kg";
  return `<p class="ultima-vez"><span>La última vez</span> ${esc(cuerpo)} <em>${esc(diaRelativo(u.fecha))}</em></p>`;
}

/* ---------- calentamiento ----------
   Solo en los ejercicios principales y compuestos con carga: 2 o 3 series
   más livianas antes de las efectivas. No cuentan como series. */
function seriesCalentamiento(it) {
  const ej = porId(it.id);
  if (!ej || it.porTiempo || ej.tipo !== "compuesto" || it.rol !== "principal") return [];
  const salto = ej.salto || 2.5;
  if (!it.kg || it.kg < salto * 3) return [];
  const escalones = it.kg >= 30 ? [[0.5, 8], [0.7, 5], [0.85, 3]] : [[0.5, 8], [0.75, 4]];
  const out = [];
  escalones.forEach(([pct, reps]) => {
    const kg = Math.max(salto, Math.round((it.kg * pct) / salto) * salto);
    if (kg < it.kg && !out.some(o => o.kg === kg)) out.push({ kg, reps });
  });
  return out;
}

function bloqueCalentamiento(it) {
  const c = seriesCalentamiento(it);
  if (!c.length) return "";
  return `<details class="calentar">
    <summary>Calentamiento · ${c.length} series livianas antes</summary>
    <p>${c.map(x => `<b>${x.reps}</b> × ${redondear(x.kg, 1)} kg`).join("<span>·</span>")}</p>
    <small>Descansá un minuto entre cada una. No se anotan: las que cuentan son las de abajo.</small>
  </details>`;
}

/* ---------- calculadora de discos ---------- */
const DISCOS = [25, 20, 15, 10, 5, 2.5, 1.25];
function discosPorLado(total, barra) {
  let resto = Math.round(((total - barra) / 2) * 100) / 100;
  if (resto < 0) return null;
  const out = [];
  DISCOS.forEach(d => { while (resto >= d - 0.001) { out.push(d); resto = Math.round((resto - d) * 100) / 100; } });
  return { discos: out, sobra: resto };
}

function hojaDiscos(kgInicial) {
  let barra = (S.perfil && S.perfil.barra) || 20, kg = kgInicial;
  const pintar = () => {
    const r = discosPorLado(kg, barra);
    const caja = document.getElementById("dc-res");
    if (!caja) return;
    if (!r) { caja.innerHTML = `<p class="cuerpo">Con ${redondear(kg, 1)} kg no alcanza para la barra de ${barra} kg. Usá una barra más liviana o mancuernas.</p>`; return; }
    caja.innerHTML = r.discos.length
      ? `<div class="barra-dibujo" aria-hidden="true"><span class="bd-barra"></span>${r.discos.map(d =>
          `<span class="bd-disco" style="height:${34 + d * 2.2}px">${d}</span>`).join("")}</div>
        <p class="cuerpo" style="text-align:center">De <b>cada lado</b>: ${r.discos.map(d => redondear(d, 2)).join(" + ")} kg</p>
        ${r.sobra > 0 ? `<p class="sm muted" style="text-align:center">Sobran ${r.sobra} kg por lado que no se pueden armar: redondeá a ${redondear(kg - r.sobra * 2, 2)} kg.</p>` : ""}`
      : `<p class="cuerpo" style="text-align:center">Solo la barra.</p>`;
  };
  abrirSheet(`
    <div class="sheet-head"><h3>Calculadora de discos</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="peso-sheet">
      <button class="pbtn" id="dc-menos" aria-label="Bajar">−</button>
      <span><b id="dc-kg">${redondear(kg, 1)}</b> kg en total</span>
      <button class="pbtn" id="dc-mas" aria-label="Subir">+</button>
    </div>
    <label class="lbl" style="margin-top:14px">Barra</label>
    <div class="segmento" id="dc-barra">${[20, 15, 10].map(b =>
      `<button type="button" class="${b === barra ? "activo" : ""}" data-b="${b}">${b} kg</button>`).join("")}</div>
    <div id="dc-res" style="margin-top:16px"></div>`);
  const kgTxt = () => { document.getElementById("dc-kg").textContent = redondear(kg, 1); pintar(); };
  document.getElementById("dc-menos").onclick = () => { kg = Math.max(0, kg - 2.5); kgTxt(); };
  document.getElementById("dc-mas").onclick = () => { kg += 2.5; kgTxt(); };
  document.querySelectorAll("#dc-barra [data-b]").forEach(b => b.onclick = () => {
    barra = Number(b.dataset.b); S.perfil.barra = barra; guardar();
    document.querySelectorAll("#dc-barra [data-b]").forEach(o => o.classList.toggle("activo", o === b));
    pintar();
  });
  pintar();
}

/* ---------- "máquina ocupada": cambiar el ejercicio ---------- */
function alternativas(it) {
  const p = S.perfil;
  const evitar = evitarPorLimitaciones(p.limitaciones);
  const enPlan = new Set(S.activa.plan.map(x => x.id));
  const actual = porId(it.id);
  return disponibles({ ...p, evitar: [...(p.evitar || []), ...evitar] })
    .filter(e => e.grupo === it.grupo && !enPlan.has(e.id) && e.tipo !== "cardio" && !!e.porTiempo === !!it.porTiempo)
    .sort((a, b) => (b.patron === (actual && actual.patron)) - (a.patron === (actual && actual.patron)));
}

function hojaCambiar(it, i) {
  const alt = alternativas(it);
  abrirSheet(`
    <div class="sheet-head"><h3>Cambiar ${esc(it.nombre)}</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <p class="sm muted" style="margin:0 0 12px">¿Máquina ocupada o no te sale? Estos trabajan el mismo músculo con lo que tenés disponible.</p>
    ${alt.length ? `<div class="exlist">${alt.slice(0, 8).map(e => `
      <button class="exrow" data-alt="${e.id}">
        <span class="extxt"><b>${esc(e.nombre)}</b><small>${esc(EQUIPOS_TXT[e.equipo] || e.equipo)} · ${e.tipo === "compuesto" ? "compuesto" : "aislado"}</small></span>
        <span class="exver">elegir</span></button>`).join("")}</div>`
    : `<p class="vacio chico">No hay otro ejercicio para este músculo con tu equipamiento.</p>`}`);
  document.querySelectorAll("[data-alt]").forEach(b => b.onclick = () => {
    const e = porId(b.dataset.alt);
    const previo = it.nombre;
    Object.assign(it, { id: e.id, nombre: e.nombre, kg: sugerirCarga(e, S.perfil), met: e.met, porTiempo: !!e.porTiempo });
    delete S.activa.hechos[it.id];
    guardar(); cerrarSheet(); pintar();
    toast(`${previo} → ${e.nombre}`);
  });
}
const EQUIPOS_TXT = { maquina: "máquina", polea: "polea", barra: "barra", mancuernas: "mancuernas", banco: "banco", libre: "peso corporal", cardio: "cardio", cali: "peso corporal", funcional: "funcional", movilidad: "movilidad" };

/* ---------- notas por ejercicio ---------- */
function notaDe(id) { return (S.perfil && S.perfil.notas && S.perfil.notas[id]) || ""; }
function hojaNota(it) {
  abrirSheet(`
    <div class="sheet-head"><h3>Nota · ${esc(it.nombre)}</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="field"><label for="nt-txt">Te la mostramos cada vez que toque este ejercicio</label>
      <textarea id="nt-txt" rows="3" maxlength="200" placeholder="Ej.: asiento en 4, agarre cerrado, bajar lento">${esc(notaDe(it.id))}</textarea></div>
    <button class="btn block" id="nt-guardar">Guardar</button>`);
  document.getElementById("nt-guardar").onclick = () => {
    const t = document.getElementById("nt-txt").value.trim().slice(0, 200);
    S.perfil.notas = S.perfil.notas || {};
    if (t) S.perfil.notas[it.id] = t; else delete S.perfil.notas[it.id];
    guardar(); cerrarSheet(); pintar();
  };
}

/* Las herramientas que van en la tarjeta del ejercicio. */
function herramientasTarjeta(it, i, hechas) {
  const ej = porId(it.id);
  const nota = notaDe(it.id);
  const botones = it.cadena ? [herramientasCali(it, i, hechas),
    `<button class="herr" data-nota="${i}">${nota ? "Editar nota" : "Nota"}</button>`].join("") : [
    ej && ej.equipo === "barra" && it.kg ? `<button class="herr" data-discos="${i}">Discos</button>` : "",
    !hechas ? `<button class="herr" data-cambiar="${i}">Cambiar</button>` : "",
    `<button class="herr" data-nota="${i}">${nota ? "Editar nota" : "Nota"}</button>`
  ].filter(Boolean).join("");
  return `${nota ? `<p class="nota-ej">${esc(nota)}</p>` : ""}<div class="herrs">${botones}</div>`;
}

function conectarHerramientas(it, i) {
  if (it.cadena) conectarHerramientasCali(it, i);
  const d = document.querySelector(`[data-discos="${i}"]`);
  if (d) d.onclick = () => hojaDiscos(it.kg);
  const c = document.querySelector(`[data-cambiar="${i}"]`);
  if (c) c.onclick = () => hojaCambiar(it, i);
  const n = document.querySelector(`[data-nota="${i}"]`);
  if (n) n.onclick = () => hojaNota(it);
}

/* ---------- música ----------
   El reproductor de Spotify no funciona dentro de una web en el teléfono,
   así que abrimos la app de Spotify con la lista elegida.
   Cuando existan las listas propias de Nivora Fit, se ponen acá sus links
   (open.spotify.com/playlist/...) y reemplazan a las búsquedas. */
const MUSICA = [
  { id: "fuerza",  nombre: "Fuerza",  url: "https://open.spotify.com/playlist/1kxvopu2JBqyYymvJ9siws" },
  { id: "cardio",  nombre: "Cardio",  url: "https://open.spotify.com/playlist/3zXYeHNp0FlduIBN4W3Nyw" },
  { id: "correr",  nombre: "Correr",  url: "https://open.spotify.com/playlist/5SC6fU5GBUjFLBtHEcMW9K" },
  { id: "estirar", nombre: "Estirar", url: "https://open.spotify.com/playlist/1Rg5JFIsQ5TtctCfFfJasA" }
];

function tarjetaMusica(sugerida) {
  return `<div class="musica">
    <span class="musica-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M7.5 9.5c3-1 6.5-.7 9 .8M8 12.6c2.6-.7 5.3-.4 7.4.8M8.6 15.4c2-.5 4-.3 5.7.6"/></svg></span>
    <span class="musica-txt"><b>Música para entrenar</b><small>Se abre en Spotify</small></span>
    <div class="musica-chips">${MUSICA.map(m =>
      `<a class="chipx${m.id === sugerida ? " activo" : ""}" href="${m.url}" target="_blank" rel="noopener">${esc(m.nombre)}</a>`).join("")}</div>
  </div>`;
}
