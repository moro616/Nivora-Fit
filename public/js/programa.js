"use strict";
/* ============================================================
   programa.js — el entrenamiento por bloques (periodización)
   Cada bloque dura entre 5 y 6 semanas y tiene fases con un propósito:
   - Principiante (progresión lineal): adaptación → progresión → descarga.
   - Intermedio: acumulación (más volumen) → intensificación (más peso,
     menos repeticiones) → descarga.
   - Avanzado: acumulación → intensificación → realización (lo más
     pesado del bloque) → descarga.
   La descarga baja series y peso para recuperarse y volver más fuerte.
   Cuando termina un bloque arranca el siguiente, y si alguien pasa dos
   semanas sin entrenar, el bloque vuelve a empezar de la semana 1.
   ============================================================ */

const FASES = {
  adaptacion:      { nombre: "Adaptación",      rir: "2 o 3", desc: "Técnica y ritmo. Pesos cómodos: terminá cada serie sintiendo que te quedaban 2 o 3 repeticiones." },
  progresion:      { nombre: "Progresión",      rir: "1 o 2", desc: "Cada semana un poco más. Cuando completás el rango de repeticiones, la app te sube el peso." },
  acumulacion:     { nombre: "Acumulación",     rir: "2",     desc: "Más volumen: una serie extra en los ejercicios principales. Construye la base del bloque." },
  intensificacion: { nombre: "Intensificación", rir: "1 o 2", desc: "Más peso y menos repeticiones. Descansos un poco más largos: cada serie tiene que ser de calidad." },
  realizacion:     { nombre: "Realización",     rir: "1",     desc: "La semana más pesada del bloque. Pocas repeticiones, mucha concentración y técnica impecable." },
  descarga:        { nombre: "Descarga",        rir: "3 o 4", desc: "Una serie menos y 15% menos de peso. Tu cuerpo se recupera y asimila todo lo que entrenaste." }
};

const BLOQUES_POR_NIVEL = {
  principiante: [["adaptacion", 2], ["progresion", 3], ["descarga", 1]],
  intermedio:   [["acumulacion", 2], ["intensificacion", 2], ["descarga", 1]],
  avanzado:     [["acumulacion", 2], ["intensificacion", 2], ["realizacion", 1], ["descarga", 1]]
};

function semanasDelBloque(perfil) {
  const def = BLOQUES_POR_NIVEL[(perfil && perfil.nivel) || "principiante"] || BLOQUES_POR_NIVEL.principiante;
  const out = [];
  def.forEach(([fase, n]) => { for (let i = 0; i < n; i++) out.push(fase); });
  return out;
}

function lunesISO(iso) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/* Se asegura de que haya un bloque en curso y lo reinicia después de un parate. */
function asegurarPrograma() {
  const p = S.perfil;
  if (!p) return;
  const dd = diasDesdeUltima();
  const lunes = lunesISO(hoyISO());
  if (!p.programa || !p.programa.inicio) {
    p.programa = { inicio: lunes, bloque: 1 };
    guardar();
  } else if (dd != null && dd >= 14 && p.programa.inicio < lunes && !S.activa) {
    p.programa = { inicio: lunes, bloque: 1, reinicio: "parate" };
    guardar();
  }
}

/* En qué semana y fase está hoy. */
function faseActual(perfil) {
  const p = perfil || S.perfil;
  const semanas = semanasDelBloque(p);
  const inicio = (p && p.programa && p.programa.inicio) || lunesISO(hoyISO());
  const dias = Math.max(0, Math.round((new Date(hoyISO()) - new Date(inicio)) / 86400000));
  const idx = Math.floor(dias / 7);
  const semana = idx % semanas.length;
  const id = semanas[semana];
  return { id, ...FASES[id], semana: semana + 1, total: semanas.length, bloque: Math.floor(idx / semanas.length) + 1, semanas };
}

/* Ajusta un ejercicio del plan según la fase. El peso de trabajo guardado
   (S.cargas) no cambia en intensificación, realización ni descarga: esas
   semanas usan un peso derivado y solo registran lo que hiciste. */
function aplicarFase(item, fase, salto) {
  if (item.porTiempo || item.grupo === "cardio") return item;
  const r0 = item.reps[0], r1 = item.reps[1];
  const redondo = kg => Math.max(salto, Math.round(kg / salto) * salto);
  const base = item.kg;
  item.fase = fase.id;
  item.rirObjetivo = fase.rir;
  switch (fase.id) {
    case "acumulacion":
      if (item.rol === "principal") item.series += 1;
      break;
    case "intensificacion":
      item.reps = [Math.max(3, r0 - 3), Math.max(Math.max(3, r0 - 3) + 1, r1 - 4)];
      if (base) item.kg = redondo(base * 1.08);
      item.descanso += 30;
      item.noProgresa = true;
      break;
    case "realizacion":
      item.reps = [Math.max(2, r0 - 5), Math.max(Math.max(2, r0 - 5) + 1, r1 - 6)];
      if (base) item.kg = redondo(base * 1.15);
      item.descanso += 60;
      if (item.rol !== "principal") item.series = Math.max(1, item.series - 1);
      item.noProgresa = true;
      break;
    case "descarga":
      item.series = Math.max(1, item.series - 1);
      if (base) item.kg = redondo(base * 0.85);
      item.noProgresa = true;
      break;
  }
  item.kgBase = base;
  return item;
}

/* ---------- pantalla del bloque ---------- */
function chipFase() {
  if (!S.perfil) return "";
  const f = faseActual();
  return `<button class="fase-chip" id="ver-bloque">
    <span>Bloque ${f.bloque} · semana ${f.semana} de ${f.total}</span><b>${esc(f.nombre)}</b></button>`;
}

function lineaBloque(f) {
  return `<div class="bloque-linea" role="img" aria-label="Semana ${f.semana} de ${f.total}">${f.semanas.map((id, i) =>
    `<span class="bl-sem${i + 1 === f.semana ? " hoy" : ""}${i + 1 < f.semana ? " hecha" : ""} f-${id}"><i></i><small>${i + 1}</small></span>`).join("")}</div>`;
}

function hojaBloque() {
  const f = faseActual();
  const orden = [...new Set(f.semanas)];
  abrirSheet(`
    <div class="sheet-head"><h3>Tu bloque de entrenamiento</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <p class="sm muted" style="margin:0 0 12px">Bloque ${f.bloque} · semana ${f.semana} de ${f.total}.
      Nivel ${esc((NIVELES[S.perfil.nivel] || {}).nombre || "")}: ${S.perfil.nivel === "principiante" ? "progresión lineal" : "fases de volumen, intensidad y descarga"}.</p>
    ${lineaBloque(f)}
    <div class="ojo" style="margin-top:14px"><b>Esta semana: ${esc(f.nombre)}</b><p>${esc(f.desc)} Terminá cada serie con ${esc(f.rir)} repeticiones en reserva.</p></div>
    <div class="fases-lista">${orden.map(id => {
      const n = f.semanas.filter(x => x === id).length;
      return `<div class="${id === f.id ? "actual" : ""}"><b>${esc(FASES[id].nombre)}</b><small>${n} ${n === 1 ? "semana" : "semanas"}</small><p>${esc(FASES[id].desc)}</p></div>`;
    }).join("")}</div>
    ${S.perfil.programa && S.perfil.programa.reinicio === "parate" ? `<p class="sm muted" style="margin:12px 0 0">El bloque volvió a la semana 1 porque pasaron más de dos semanas sin entrenar.</p>` : ""}
    <button class="btn ghost block" id="bloque-reiniciar" style="margin-top:16px">Empezar el bloque de nuevo</button>`);
  document.getElementById("bloque-reiniciar").onclick = () => {
    if (!confirm("¿Volvés a la semana 1 del bloque?")) return;
    S.perfil.programa = { inicio: lunesISO(hoyISO()), bloque: 1 };
    if (!S.activa) S.agenda = null;
    guardar(); cerrarSheet(); pintar();
    toast("Listo: arrancás el bloque desde la semana 1.");
  };
}
