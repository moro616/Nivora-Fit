"use strict";
/* ============================================================
   interfaz.js — todo lo que se ve y se toca
   Cinco pantallas: Hoy, Agenda, Ejercicios, Cuerpo y Progreso.
   Más el alta de perfil, los ajustes y las fichas de cada movimiento.
   ============================================================ */

/* ---------- piezas sueltas de la interfaz ---------- */
let tToast = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("ver");
  clearTimeout(tToast);
  tToast = setTimeout(() => t.classList.remove("ver"), 2600);
}

function estadoGuardado(texto) {
  const c = document.getElementById("chip");
  if (c) c.textContent = texto;
}

function abrirSheet(html) {
  const w = document.getElementById("sheet-wrap");
  document.getElementById("sheet-body").innerHTML = html;
  w.classList.add("abierto");
  document.body.style.overflow = "hidden";
  const x = document.getElementById("sheet-close");
  if (x) x.onclick = cerrarSheet;
}
function cerrarSheet() {
  document.getElementById("sheet-wrap").classList.remove("abierto");
  document.body.style.overflow = "";
}

/* El tema es una preferencia del teléfono, no de la cuenta: se guarda aparte
   y lo comparten la landing y la app (ver instalar.js). */
function aplicarTema() { Tema.aplicar(); }

function iniciales(nombre) {
  if (!nombre) return "N";
  return nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join("");
}

function pintarCabecera() {
  const who = document.getElementById("who");
  const av = document.getElementById("btn-avatar");
  const chat = document.getElementById("btn-chat");
  if (S.perfil) {
    who.innerHTML = `<b>${esc(S.perfil.nombre || "Nivora Fit")}</b><small>${esc(
      (NIVELES[S.perfil.nivel] || {}).nombre + " · " + (OBJETIVOS[S.perfil.objetivo] || {}).nombre)}</small>`;
    av.textContent = iniciales(S.perfil.nombre);
    chat.hidden = !HAY_NUBE || !Cuenta.usuario;
  } else {
    who.innerHTML = `<b>Nivora Fit</b><small>Tu entrenador y tu evaluación corporal</small>`;
    av.textContent = "N";
    chat.hidden = true;
  }
}

/* ---------- el director de orquesta ---------- */
function pintar() {
  pintarCabecera();
  const vistas = ["setup", "hoy", "agenda", "ejercicios", "cuerpo", "progreso"];
  const activa = S.perfil ? S.vista : "setup";
  vistas.forEach(v => {
    const el = document.getElementById("v-" + v);
    if (el) el.hidden = v !== activa;
  });
  document.getElementById("tabbar").hidden = !S.perfil;

  if (!S.perfil) return vistaSetup();
  if (activa === "hoy") return vistaHoy();
  if (activa === "agenda") return vistaAgenda();
  if (activa === "ejercicios") return vistaEjercicios();
  if (activa === "cuerpo") return vistaCuerpo();
  if (activa === "progreso") return vistaProgreso();
}

/* ============================================================
   ALTA DE PERFIL — seis preguntas, una pantalla cada una
   ============================================================ */
let borrador = null;
let paso = 0;

const PASOS = ["quien", "cuerpo", "nivel", "objetivo", "semana", "cuidados"];

function vistaSetup() {
  if (!borrador) borrador = {
    nombre: "", sexo: "", nacimiento: "", altura: null, peso: null,
    nivel: "principiante", objetivo: "salud", dias: 3, equipo: "gimnasio",
    actividad: "ligero", limitaciones: [], tema: "auto"
  };
  const v = document.getElementById("v-setup");
  const cual = PASOS[paso];
  const cuerpos = { quien: pasoQuien, cuerpo: pasoCuerpo, nivel: pasoNivel,
                    objetivo: pasoObjetivo, semana: pasoSemana, cuidados: pasoCuidados };

  v.innerHTML = `
    <div class="progreso-alta"><i style="width:${((paso + 1) / PASOS.length) * 100}%"></i></div>
    <p class="eyebrow">Paso ${paso + 1} de ${PASOS.length}</p>
    ${cuerpos[cual]()}
    <div class="alta-botones">
      ${paso > 0 ? `<button class="btn ghost" id="alta-atras">Atrás</button>` : `<span></span>`}
      <button class="btn" id="alta-seguir">${paso === PASOS.length - 1 ? "Armar mi rutina" : "Seguir"}</button>
    </div>`;

  const atras = document.getElementById("alta-atras");
  if (atras) atras.onclick = () => { paso--; vistaSetup(); };
  document.getElementById("alta-seguir").onclick = () => {
    if (!validarPaso(cual)) return;
    if (paso === PASOS.length - 1) return terminarAlta();
    paso++; vistaSetup();
  };
  conectarOpciones();
}

function bloqueOpciones(campo, opciones, valorActual, multiple) {
  return `<div class="ops" data-campo="${campo}" ${multiple ? 'data-multi="1"' : ""}>` +
    opciones.map(o => {
      const activo = multiple ? (valorActual || []).includes(o.id) : valorActual === o.id;
      return `<button type="button" class="op${activo ? " activo" : ""}" data-valor="${o.id}">
        <b>${esc(o.nombre)}</b>${o.desc ? `<small>${esc(o.desc)}</small>` : ""}</button>`;
    }).join("") + `</div>`;
}

function conectarOpciones() {
  document.querySelectorAll(".ops").forEach(caja => {
    const campo = caja.dataset.campo, multi = caja.dataset.multi === "1";
    caja.querySelectorAll(".op").forEach(b => {
      b.onclick = () => {
        if (multi) {
          const arr = borrador[campo] || [];
          borrador[campo] = arr.includes(b.dataset.valor) ? arr.filter(x => x !== b.dataset.valor) : [...arr, b.dataset.valor];
          b.classList.toggle("activo");
        } else {
          borrador[campo] = b.dataset.valor;
          caja.querySelectorAll(".op").forEach(o => o.classList.remove("activo"));
          b.classList.add("activo");
        }
      };
    });
  });
  document.querySelectorAll("[data-num]").forEach(i => {
    i.oninput = () => { borrador[i.dataset.num] = num(i.value); };
  });
  const n = document.getElementById("alta-nombre");
  if (n) n.oninput = () => { borrador.nombre = n.value; };
  const f = document.getElementById("alta-nac");
  if (f) f.onchange = () => { borrador.nacimiento = f.value; };
}

const pasoQuien = () => `
  <h2 class="titulo">Empecemos por lo básico</h2>
  <p class="bajada">Con esto la app te habla por tu nombre y calcula bien tu evaluación corporal.</p>
  <div class="card pad">
    <div class="field"><label for="alta-nombre">¿Cómo te llamás?</label>
      <input id="alta-nombre" value="${esc(borrador.nombre)}" placeholder="Tu nombre" autocomplete="given-name"></div>
    <label class="lbl">Sexo biológico <small>cambia las fórmulas de grasa corporal y calorías</small></label>
    ${bloqueOpciones("sexo", [
      { id: "hombre", nombre: "Hombre" }, { id: "mujer", nombre: "Mujer" }], borrador.sexo)}
  </div>`;

const pasoCuerpo = () => `
  <h2 class="titulo">Tu cuerpo hoy</h2>
  <p class="bajada">El punto de partida. Después vas a poder cargar medidas con cinta para afinar todo.</p>
  <div class="card pad">
    <div class="field"><label for="alta-nac">Fecha de nacimiento</label>
      <input id="alta-nac" type="date" value="${esc(borrador.nacimiento)}" max="${hoyISO()}"></div>
    <div class="dos">
      <div class="field"><label for="alta-alt">Altura (cm)</label>
        <input id="alta-alt" data-num="altura" type="number" inputmode="decimal" placeholder="175" value="${borrador.altura || ""}"></div>
      <div class="field"><label for="alta-peso">Peso (kg)</label>
        <input id="alta-peso" data-num="peso" type="number" inputmode="decimal" placeholder="80" value="${borrador.peso || ""}"></div>
    </div>
    <label class="lbl">¿Cómo es tu día fuera del gimnasio?</label>
    ${bloqueOpciones("actividad", Object.entries(ACTIVIDAD).map(([id, a]) => ({ id, nombre: a.nombre })), borrador.actividad)}
  </div>`;

const pasoNivel = () => `
  <h2 class="titulo">¿Cuánta experiencia tenés?</h2>
  <p class="bajada">De esto depende cuántas series hacés y qué ejercicios te proponemos.</p>
  <div class="card pad">
    ${bloqueOpciones("nivel", Object.entries(NIVELES).map(([id, n]) => ({ id, nombre: n.nombre, desc: n.desc })), borrador.nivel)}
  </div>`;

const pasoObjetivo = () => `
  <h2 class="titulo">¿Qué querés conseguir?</h2>
  <p class="bajada">Cambia las repeticiones, los descansos y las calorías que te vamos a sugerir.</p>
  <div class="card pad">
    ${bloqueOpciones("objetivo", Object.entries(OBJETIVOS).map(([id, o]) => ({ id, nombre: o.nombre })), borrador.objetivo)}
  </div>`;

const pasoSemana = () => `
  <h2 class="titulo">Tu semana y tu gimnasio</h2>
  <p class="bajada">No hacen falta días fijos: decinos cuántas veces podés ir y la app te dice qué toca cada vez.</p>
  <div class="card pad">
    <label class="lbl">¿Cuántos días por semana podés entrenar?</label>
    ${bloqueOpciones("dias", [2, 3, 4, 5, 6].map(d => ({ id: String(d), nombre: d + " días" })), String(borrador.dias))}
    <label class="lbl" style="margin-top:18px">¿Con qué contás?</label>
    ${bloqueOpciones("equipo", Object.entries(EQUIPO).map(([id, e]) => ({ id, nombre: e.nombre })), borrador.equipo)}
  </div>`;

const pasoCuidados = () => `
  <h2 class="titulo">¿Algo que te moleste?</h2>
  <p class="bajada">Marcá lo que corresponda y sacamos de tu rutina los ejercicios que suelen dar problema. Podés cambiarlo cuando quieras.</p>
  <div class="card pad">
    ${bloqueOpciones("limitaciones", Object.entries(LIMITACIONES).map(([id, l]) => ({ id, nombre: l.nombre })), borrador.limitaciones, true)}
    <p class="sm muted" style="margin:16px 0 0">Si tenés una lesión diagnosticada o estás en tratamiento,
    consultá con tu médico o kinesiólogo antes de empezar. Nivora Fit no reemplaza una consulta profesional.</p>
  </div>`;

function validarPaso(cual) {
  if (cual === "quien") {
    if (!borrador.nombre.trim()) return toast("Escribí tu nombre para seguir."), false;
    if (!borrador.sexo) return toast("Elegí una opción para calcular bien tu evaluación."), false;
  }
  if (cual === "cuerpo") {
    if (!borrador.altura || borrador.altura < 120 || borrador.altura > 230) return toast("Revisá la altura en centímetros."), false;
    if (!borrador.peso || borrador.peso < 35 || borrador.peso > 250) return toast("Revisá el peso en kilos."), false;
  }
  return true;
}

function terminarAlta() {
  S.perfil = { ...borrador, dias: Number(borrador.dias) || 3, creado: hoyISO() };
  S.medidas = [{ fecha: hoyISO(), peso: borrador.peso }];
  S.vista = "hoy";
  borrador = null; paso = 0;
  guardar("Perfil listo");
  pintar();
  toast("Listo. Esta es tu primera rutina.");
}

/* ============================================================
   HOY
   ============================================================ */
function rutinaDeHoy() {
  if (S.activa) return S.activa;
  if (S.agenda && S.agenda.fecha === hoyISO()) return S.agenda;
  const bloque = siguienteBloque(S.perfil);
  const r = armarRutina(bloque, S.perfil);
  S.agenda = { ...r, fecha: hoyISO() };
  return S.agenda;
}

function vistaHoy() {
  const v = document.getElementById("v-hoy");
  const r = rutinaDeHoy();

  if (S.activa) return pintarSesion(v);

  const mins = duracionEstimada(r);
  const dd = diasDesdeUltima();
  const aviso = dd == null ? "Tu primer entrenamiento."
    : dd === 0 ? "Ya entrenaste hoy. Si querés hacer otro, adelante."
    : dd >= 7 ? `Hace ${dd} días que no venís. Arrancamos suave y retomamos el ritmo.`
    : `Último entrenamiento ${diaRelativo(S.sesiones[S.sesiones.length - 1].fecha)}.`;

  v.innerHTML = `
    <div class="hero">
      <p class="eyebrow">Hoy te toca</p>
      <h2>${esc(r.nombre)}</h2>
      <p class="sm muted" style="margin:6px 0 0">${esc(r.musculos)}</p>
      <div class="datos">
        <div><b>${r.plan.length}</b><span>ejercicios</span></div>
        <div><b>${mins}′</b><span>aprox.</span></div>
        <div><b>${r.plan.reduce((a, i) => a + i.series, 0)}</b><span>series</span></div>
      </div>
      <button class="btn block" id="empezar" style="margin-top:16px">Empezar entrenamiento</button>
      <div class="linea-acciones">
        <button class="linkbtn" id="poco-tiempo">Tengo poco tiempo</button>
        <button class="linkbtn" id="otro-bloque">Cambiar el músculo</button>
      </div>
    </div>

    <p class="sm muted" style="margin:14px 2px 10px">${esc(aviso)}</p>

    <div class="card pad">
      <p class="eyebrow">Antes de empezar</p>
      <ul class="warns">${CALENTAMIENTO.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>

    <p class="eyebrow" style="margin:20px 2px 10px">La rutina de hoy</p>
    <div class="exlist">${r.plan.map((it, i) => filaEjercicio(it, i)).join("")}</div>
    ${tarjetaInstalar()}`;

  document.getElementById("empezar").onclick = empezarSesion;
  conectarInstalar();
  document.getElementById("poco-tiempo").onclick = () => {
    abrirSheet(`<div class="sheet-head"><h3>¿Cuánto tiempo tenés?</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
      <div class="ops" id="ops-tiempo">
        ${[20, 30, 45].map(m => `<button type="button" class="op" data-min="${m}"><b>${m} minutos</b></button>`).join("")}
      </div>`);
    document.querySelectorAll("#ops-tiempo .op").forEach(b => b.onclick = () => {
      S.agenda = { ...recortarRutina(r, Number(b.dataset.min)), fecha: hoyISO() };
      guardar(); cerrarSheet(); pintar();
      toast("Rutina recortada a lo esencial.");
    });
  };
  document.getElementById("otro-bloque").onclick = () => {
    const split = splitDe(S.perfil);
    abrirSheet(`<div class="sheet-head"><h3>¿Qué querés entrenar?</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
      <div class="ops" id="ops-bloque">
        ${[...new Set(split)].map(b => `<button type="button" class="op" data-b="${b}">
          <b>${esc(BLOQUES[b].nombre)}</b><small>${esc(BLOQUES[b].musculos)}</small></button>`).join("")}
      </div>`);
    document.querySelectorAll("#ops-bloque .op").forEach(b => b.onclick = () => {
      S.agenda = { ...armarRutina(b.dataset.b, S.perfil), fecha: hoyISO() };
      guardar(); cerrarSheet(); pintar();
    });
  };
  conectarFilas(v);
}

function filaEjercicio(it, i, hechas) {
  const ej = porId(it.id);
  const detalle = it.minutos ? `${it.reps[0]}–${it.reps[1]} min`
    : it.porTiempo ? `${it.series} × ${it.reps[0]}–${it.reps[1]} seg`
    : `${it.series} × ${it.reps[0]}–${it.reps[1]}${it.kg ? " · " + redondear(it.kg, 1) + " kg" : ""}`;
  return `<button class="exrow" data-ej="${it.id}">
    <span class="exnum">${hechas != null ? (hechas + "/" + it.series) : (i + 1)}</span>
    <span class="extxt"><b>${esc(it.nombre)}</b><small>${esc((GRUPOS[it.grupo] || "") + " · " + detalle)}</small></span>
    <span class="exver">ver</span>
  </button>`;
}

function conectarFilas(scope) {
  scope.querySelectorAll("[data-ej]").forEach(b => {
    b.onclick = () => fichaEjercicio(b.dataset.ej);
  });
}

/* ---------- ficha de un ejercicio ---------- */
function fichaEjercicio(id) {
  const e = porId(id);
  if (!e) return;
  const carga = S.cargas[id];
  abrirSheet(`
    <div class="sheet-head">
      <h3>${esc(e.nombre)}</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button>
    </div>
    <p class="eyebrow">${esc(GRUPOS[e.grupo] || "")} · ${esc(EQUIPO_NOMBRE(e.equipo))}</p>
    <div class="dibujo">${patternSVG(e.patron, e.nombre)}</div>
    <p class="cuerpo">${esc(e.como)}</p>
    <div class="ojo"><b>Ojo con esto</b><p>${esc(e.cuidado)}</p></div>
    ${carga ? `<p class="sm muted">Tu última carga: <b>${redondear(carga.kg, 1)} kg</b> · ${esc(diaRelativo(carga.fecha))}</p>` : ""}
    <a class="btn ghost block" href="${urlVideo(e)}" target="_blank" rel="noopener">Ver videos del movimiento</a>`);
}

const EQUIPO_NOMBRE = e => ({
  maquina: "Máquina", polea: "Polea", barra: "Barra", mancuernas: "Mancuernas",
  banco: "Banco", cardio: "Cardio", libre: "Sin equipo"
}[e] || e);

/* ============================================================
   SESIÓN EN CURSO
   ============================================================ */
function empezarSesion() {
  const r = rutinaDeHoy();
  S.activa = { ...r, fecha: hoyISO(), inicio: Date.now(), hechos: {} };
  guardar("Entrenando");
  pintar();
}

function pintarSesion(v) {
  const a = S.activa;
  const total = a.plan.reduce((x, i) => x + i.series, 0);
  const hechas = Object.values(a.hechos).reduce((x, arr) => x + arr.length, 0);
  const min = Math.round((Date.now() - a.inicio) / 60000);

  v.innerHTML = `
    <div class="hero corriendo">
      <p class="eyebrow">Entrenando · ${esc(a.nombre)}</p>
      <div class="barra"><i style="width:${total ? (hechas / total) * 100 : 0}%"></i></div>
      <div class="datos">
        <div><b>${hechas}/${total}</b><span>series</span></div>
        <div><b>${min}′</b><span>llevás</span></div>
        <div><b>${redondear(volumenActual(), 0)}</b><span>kg movidos</span></div>
      </div>
    </div>
    <div class="sesion">${a.plan.map((it, i) => tarjetaSesion(it, i)).join("")}</div>
    <button class="btn block" id="terminar" style="margin-top:18px">Terminar entrenamiento</button>
    <button class="btn ghost block" id="cancelar" style="margin-top:8px">Cancelar</button>
    <div class="descanso" id="descanso" hidden><span id="desc-txt"></span><button class="linkbtn" id="desc-cortar">Listo</button></div>`;

  a.plan.forEach((it, i) => conectarTarjeta(it, i));
  v.querySelectorAll("[data-ficha]").forEach(b => b.onclick = () => fichaEjercicio(b.dataset.ficha));
  document.getElementById("terminar").onclick = terminarSesion;
  document.getElementById("cancelar").onclick = () => {
    if (!confirm("¿Cancelás el entrenamiento? No se va a guardar.")) return;
    S.activa = null; guardar(); pintar();
  };
  const dc = document.getElementById("desc-cortar");
  if (dc) dc.onclick = cortarDescanso;
}

function tarjetaSesion(it, i) {
  const hechas = (S.activa.hechos[it.id] || []).length;
  const listo = hechas >= it.series;
  const unidad = it.minutos ? "min" : it.porTiempo ? "seg" : "reps";
  return `<div class="strow${listo ? " listo" : ""}" data-i="${i}">
    <div class="sthead">
      <div>
        <b>${esc(it.nombre)}</b>
        <small>${esc(GRUPOS[it.grupo] || "")} · objetivo ${it.reps[0]}–${it.reps[1]} ${unidad}</small>
      </div>
      <button class="exver" data-ficha="${it.id}">cómo se hace</button>
    </div>
    ${it.kg ? `<div class="peso">
      <button class="pbtn" data-menos="${i}">−</button>
      <span><b id="kg-${i}">${redondear(it.kg, 1)}</b> kg</span>
      <button class="pbtn" data-mas="${i}">+</button>
    </div>` : ""}
    <div class="series">
      ${Array.from({ length: it.series }, (_, s) => {
        const hecha = (S.activa.hechos[it.id] || [])[s];
        return `<button class="serie${hecha ? " ok" : ""}" data-serie="${i}-${s}">
          ${hecha ? esc(hecha.reps + (it.porTiempo ? "″" : "")) : "○"}</button>`;
      }).join("")}
    </div>
  </div>`;
}

function conectarTarjeta(it, i) {
  document.querySelectorAll(`[data-serie^="${i}-"]`).forEach(b => {
    b.onclick = () => registrarSerie(it, i, Number(b.dataset.serie.split("-")[1]));
  });
  const menos = document.querySelector(`[data-menos="${i}"]`);
  const mas = document.querySelector(`[data-mas="${i}"]`);
  const ej = porId(it.id);
  const paso = (ej && ej.salto) || 2.5;
  if (menos) menos.onclick = () => { it.kg = Math.max(0, it.kg - paso); document.getElementById("kg-" + i).textContent = redondear(it.kg, 1); guardar(); };
  if (mas) mas.onclick = () => { it.kg = it.kg + paso; document.getElementById("kg-" + i).textContent = redondear(it.kg, 1); guardar(); };
}

function registrarSerie(it, i, s) {
  const arr = S.activa.hechos[it.id] || (S.activa.hechos[it.id] = []);
  if (arr[s]) { arr.splice(s, 1); guardar(); return pintar(); }

  const sugerido = it.reps[1];
  const unidad = it.minutos ? "minutos" : it.porTiempo ? "segundos" : "repeticiones";
  abrirSheet(`
    <div class="sheet-head"><h3>${esc(it.nombre)}</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <p class="eyebrow">Serie ${s + 1} de ${it.series} · ¿cuántas ${unidad} hiciste?</p>
    <div class="repgrid" id="repgrid">
      ${repsSugeridas(it).map(r => `<button class="op chico" data-r="${r}"><b>${r}</b></button>`).join("")}
    </div>
    <div class="field" style="margin-top:14px"><label for="rep-otro">Otro número</label>
      <input id="rep-otro" type="number" inputmode="numeric" placeholder="${sugerido}"></div>
    <button class="btn block" id="rep-guardar">Guardar serie</button>`);

  const guardarSerie = r => {
    arr[s] = { reps: r, kg: it.kg };
    guardar();
    cerrarSheet();
    pintar();
    if (it.descanso) arrancarDescanso(it.descanso);
  };
  document.querySelectorAll("#repgrid .op").forEach(b => b.onclick = () => guardarSerie(Number(b.dataset.r)));
  document.getElementById("rep-guardar").onclick = () => {
    const r = num(document.getElementById("rep-otro").value, sugerido);
    guardarSerie(Math.max(1, Math.round(r)));
  };
}

function repsSugeridas(it) {
  const [a, b] = it.reps;
  const out = [];
  const paso = it.porTiempo && !it.minutos ? 10 : 1;
  for (let r = Math.max(paso, a - 2 * paso); r <= b + 2 * paso; r += paso) out.push(r);
  return out.slice(0, 9);
}

function volumenActual() {
  if (!S.activa) return 0;
  let v = 0;
  Object.entries(S.activa.hechos).forEach(([id, arr]) =>
    arr.forEach(s => { if (s && s.kg) v += s.kg * s.reps; }));
  return v;
}

/* ---------- cronómetro de descanso ---------- */
let tDesc = null;
function arrancarDescanso(seg) {
  const caja = document.getElementById("descanso");
  const txt = document.getElementById("desc-txt");
  if (!caja || !txt) return;
  caja.hidden = false;
  let quedan = seg;
  const tic = () => {
    txt.textContent = "Descanso · " + String(Math.floor(quedan / 60)).padStart(1, "0") + ":" + String(quedan % 60).padStart(2, "0");
    if (quedan <= 0) { cortarDescanso(); toast("Descanso terminado. Vamos con la que sigue."); return; }
    quedan--;
  };
  tic();
  clearInterval(tDesc);
  tDesc = setInterval(tic, 1000);
}
function cortarDescanso() {
  clearInterval(tDesc);
  const caja = document.getElementById("descanso");
  if (caja) caja.hidden = true;
}

function terminarSesion() {
  const a = S.activa;
  const series = Object.values(a.hechos).reduce((x, arr) => x + arr.filter(Boolean).length, 0);
  if (!series) { toast("Marcá al menos una serie antes de terminar."); return; }

  const min = Math.max(5, Math.round((Date.now() - a.inicio) / 60000));
  const mets = a.plan.filter(i => (a.hechos[i.id] || []).length).map(i => i.met || 5);
  const met = mets.length ? mets.reduce((x, y) => x + y, 0) / mets.length : 5;
  const kcal = kcalSesion(min, pesoActual(), met);
  const volumen = volumenActual();

  S.sesiones.push({ fecha: a.fecha, bloque: a.bloque, nombre: a.nombre, series, min, kcal, volumen });

  /* Progresión: quien completó todo arriba del rango, la próxima sube. */
  const subieron = [];
  a.plan.forEach(it => {
    const arr = (a.hechos[it.id] || []).filter(Boolean);
    if (!arr.length) return;
    const mejor = Math.max(...arr.map(s => s.reps));
    const nuevo = actualizarProgresion({ ...it, kg: arr[arr.length - 1].kg || it.kg }, arr.length, mejor);
    if (nuevo) subieron.push(it.nombre);
  });

  S.activa = null;
  S.agenda = null;
  guardar("Entrenamiento guardado");
  cortarDescanso();
  pintar();

  abrirSheet(`
    <div class="sheet-head"><h3>Terminaste</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="datos grande">
      <div><b>${series}</b><span>series</span></div>
      <div><b>${min}′</b><span>de entrenamiento</span></div>
      <div><b>${kcal}</b><span>kcal aprox.</span></div>
    </div>
    ${volumen ? `<p class="cuerpo">Moviste <b>${redondear(volumen, 0)} kg</b> en total entre todas las series.</p>` : ""}
    ${subieron.length
      ? `<div class="ojo bien"><b>La próxima subís peso</b><p>${esc(subieron.join(", "))}. Completaste el rango, así que toca sumar un escalón.</p></div>`
      : `<p class="cuerpo">Quedó registrado. Cuando completes todas las series en el tope de repeticiones, la app te va a subir el peso sola.</p>`}
    <button class="btn block" id="cerrar-resumen">Listo</button>`);
  document.getElementById("cerrar-resumen").onclick = cerrarSheet;
}

/* ============================================================
   AGENDA
   ============================================================ */
function vistaAgenda() {
  const v = document.getElementById("v-agenda");
  const split = splitDe(S.perfil);
  const proximo = siguienteBloque(S.perfil);
  const semana = sesionesDeLaSemana();
  const meta = S.perfil.dias || 3;

  v.innerHTML = `
    <div class="card pad">
      <p class="eyebrow">Esta semana</p>
      <h2 class="titulo chico">${semana.length} de ${meta} entrenamientos</h2>
      <div class="semana">${["L", "M", "M", "J", "V", "S", "D"].map((d, i) => {
        const hecho = semana.some(s => diaSemana(s.fecha) === i);
        return `<span class="${hecho ? "on" : ""}">${d}</span>`;
      }).join("")}</div>
      <p class="sm muted" style="margin:12px 0 0">${
        semana.length >= meta ? "Cumpliste tu objetivo de la semana. Todo lo que sumes es ganancia."
        : "Te faltan " + (meta - semana.length) + " para cumplir tu objetivo. No importa qué días sean."}</p>
    </div>

    <p class="eyebrow" style="margin:22px 2px 10px">Tu rotación</p>
    <div class="exlist">
      ${[...new Set(split)].map(b => `<div class="exrow estatico${b === proximo ? " marcado" : ""}">
        <span class="exnum">${b === proximo ? "→" : "·"}</span>
        <span class="extxt"><b>${esc(BLOQUES[b].nombre)}</b><small>${esc(BLOQUES[b].musculos)}</small></span>
        <span class="exver">${esc(ultimaVez(b))}</span>
      </div>`).join("")}
    </div>

    <p class="eyebrow" style="margin:22px 2px 10px">Historial</p>
    ${S.sesiones.length ? `<div class="exlist">${S.sesiones.slice().reverse().slice(0, 20).map(s => `
      <div class="exrow estatico">
        <span class="exnum">${esc(fechaCorta(s.fecha).split(" ")[0])}</span>
        <span class="extxt"><b>${esc(s.nombre || BLOQUES[s.bloque] && BLOQUES[s.bloque].nombre || s.bloque)}</b>
          <small>${s.series} series · ${s.min}′ · ${s.kcal} kcal</small></span>
        <span class="exver">${esc(fechaCorta(s.fecha))}</span>
      </div>`).join("")}</div>`
      : `<p class="vacio">Todavía no hay entrenamientos cargados. El primero aparece acá apenas lo termines.</p>`}`;
}

function diaSemana(iso) { const d = new Date(iso + "T00:00:00").getDay(); return (d + 6) % 7; }

function sesionesDeLaSemana() {
  const hoy = hoyISO_date();
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - diaSemana(hoyISO()));
  return (S.sesiones || []).filter(s => new Date(s.fecha + "T00:00:00") >= lunes);
}

function ultimaVez(bloque) {
  const s = (S.sesiones || []).slice().reverse().find(x => x.bloque === bloque);
  return s ? diaRelativo(s.fecha) : "nunca";
}

/* ============================================================
   EJERCICIOS — la biblioteca
   ============================================================ */
let grupoAbierto = "todos";

function vistaEjercicios() {
  const chips = document.getElementById("lib-chips");
  const lista = document.getElementById("lib-list");
  const pool = disponibles(S.perfil);
  const grupos = ["todos", ...Object.keys(GRUPOS).filter(g => pool.some(e => e.grupo === g))];

  chips.innerHTML = grupos.map(g =>
    `<button class="chipx${g === grupoAbierto ? " activo" : ""}" data-g="${g}">${esc(g === "todos" ? "Todos" : GRUPOS[g])}</button>`).join("");
  chips.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { grupoAbierto = b.dataset.g; vistaEjercicios(); });

  const items = pool.filter(e => grupoAbierto === "todos" || e.grupo === grupoAbierto);
  lista.innerHTML = items.map(e => {
    const c = S.cargas[e.id];
    return `<button class="exrow" data-ej="${e.id}">
      <span class="exnum mini">${esc((GRUPOS[e.grupo] || "").slice(0, 3))}</span>
      <span class="extxt"><b>${esc(e.nombre)}</b><small>${esc(EQUIPO_NOMBRE(e.equipo))}${c ? " · " + redondear(c.kg, 1) + " kg" : ""}</small></span>
      <span class="exver">ver</span></button>`;
  }).join("");
  conectarFilas(lista);
}

/* ============================================================
   CUERPO — la evaluación
   ============================================================ */
function vistaCuerpo() {
  const v = document.getElementById("v-cuerpo");
  const ev = evaluar(S.perfil);
  const m = ultimaMedida();
  const prog = progresoCorporal();

  if (!ev) {
    v.innerHTML = `<p class="vacio">Faltan datos para calcular tu evaluación.</p>`;
    return;
  }

  v.innerHTML = `
    <div class="hero">
      <p class="eyebrow">Tu evaluación${m ? " · " + esc(diaRelativo(m.fecha)) : ""}</p>
      <div class="medallas">
        <div class="med"><span>Peso</span><b>${redondear(ev.peso, 1)}</b><i>kg</i></div>
        <div class="med"><span>IMC</span><b>${redondear(ev.imc, 1)}</b><i class="t-${ev.imcEtq.tono}">${esc(ev.imcEtq.texto)}</i></div>
        <div class="med"><span>Grasa</span><b>${ev.grasa != null ? redondear(ev.grasa, 1) + "%" : "—"}</b><i class="t-${ev.grasaEtq.tono}">${esc(ev.grasaEtq.texto)}</i></div>
      </div>
      <button class="btn block" id="cargar-medidas" style="margin-top:16px">Cargar medidas de hoy</button>
    </div>

    <div class="card pad" style="margin-top:14px">
      <p class="eyebrow">Tus calorías</p>
      <p class="cuerpo">Para <b>${esc(ev.objetivo.nombre.toLowerCase())}</b>, apuntá a
        <b>${redondear(ev.kcal, 0)} kcal por día</b>. Tu cuerpo gasta cerca de
        ${redondear(ev.gasto, 0)} kcal contando el entrenamiento${ev.ritmoSemanal ? `, así que el ritmo esperado es de
        unos ${redondear(ev.ritmoSemanal, 2)} kg por semana` : ""}.</p>
      <div class="macros">
        <div><b>${ev.proteina} g</b><span>proteína</span></div>
        <div><b>${ev.carbos} g</b><span>carbohidratos</span></div>
        <div><b>${ev.grasaG} g</b><span>grasas</span></div>
      </div>
      <p class="sm muted" style="margin:12px 0 0">Son estimaciones a partir de fórmulas estándar.
      Si tenés alguna condición de salud, consultá con un nutricionista antes de cambiar tu alimentación.</p>
    </div>

    ${ev.cintura ? `<div class="card pad" style="margin-top:14px">
      <p class="eyebrow">Cintura y altura</p>
      <p class="cuerpo"><b class="t-${ev.cintura.tono}">${esc(ev.cintura.texto)}</b>.
      La relación entre tu cintura y tu altura es de ${redondear(ev.cintura.valor, 2)};
      por debajo de 0,50 es la zona que se considera saludable.</p></div>` : ""}

    ${prog ? `<div class="card pad" style="margin-top:14px">
      <p class="eyebrow">Desde que empezaste · ${prog.dias} días</p>
      <div class="datos">
        <div><b class="${prog.peso <= 0 ? "t-bien" : ""}">${prog.peso > 0 ? "+" : ""}${redondear(prog.peso, 1)}</b><span>kg</span></div>
        ${prog.grasa != null ? `<div><b class="${prog.grasa <= 0 ? "t-bien" : ""}">${prog.grasa > 0 ? "+" : ""}${redondear(prog.grasa, 1)}</b><span>% grasa</span></div>` : ""}
        ${prog.cintura != null ? `<div><b class="${prog.cintura <= 0 ? "t-bien" : ""}">${prog.cintura > 0 ? "+" : ""}${redondear(prog.cintura, 1)}</b><span>cm cintura</span></div>` : ""}
      </div></div>` : ""}

    <p class="eyebrow" style="margin:22px 2px 10px">Historial de medidas</p>
    ${S.medidas.length ? `<div class="exlist">${S.medidas.slice().reverse().slice(0, 12).map(x => {
      const e2 = evaluar(S.perfil, x);
      return `<div class="exrow estatico">
        <span class="exnum mini">${esc(fechaCorta(x.fecha).split(" ")[0])}</span>
        <span class="extxt"><b>${redondear(x.peso, 1)} kg</b>
          <small>${e2 && e2.grasa != null ? redondear(e2.grasa, 1) + "% grasa · " : ""}${x.cintura ? "cintura " + redondear(x.cintura, 0) + " cm" : "sin cinta"}</small></span>
        <span class="exver">${esc(fechaCorta(x.fecha))}</span></div>`;
    }).join("")}</div>` : `<p class="vacio">Cargá tus medidas para ver cómo evolucionan.</p>`}`;

  document.getElementById("cargar-medidas").onclick = sheetMedidas;
}

function sheetMedidas() {
  const ult = ultimaMedida() || {};
  const campos = MEDIDAS_CINTA.filter(c => !(c.id === "cadera" && S.perfil.sexo === "hombre" && false));
  abrirSheet(`
    <div class="sheet-head"><h3>Medidas de hoy</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <p class="eyebrow">Con el peso alcanza. La cinta métrica es lo que permite estimar tu grasa corporal.</p>
    <div class="field"><label for="md-peso">Peso (kg)</label>
      <input id="md-peso" type="number" inputmode="decimal" value="${ult.peso || ""}" placeholder="80"></div>
    ${campos.map(c => `<div class="field">
      <label for="md-${c.id}">${esc(c.nombre)} (cm)<small>${esc(c.donde)}</small></label>
      <input id="md-${c.id}" type="number" inputmode="decimal" value="${ult[c.id] || ""}"></div>`).join("")}
    <button class="btn block" id="md-guardar">Guardar medidas</button>`);

  document.getElementById("md-guardar").onclick = () => {
    const peso = num(document.getElementById("md-peso").value);
    if (!peso || peso < 35 || peso > 250) return toast("Revisá el peso en kilos.");
    const fila = { fecha: hoyISO(), peso };
    MEDIDAS_CINTA.forEach(c => {
      const val = num(document.getElementById("md-" + c.id).value);
      if (val) fila[c.id] = val;
    });
    const i = S.medidas.findIndex(m => m.fecha === fila.fecha);
    if (i >= 0) S.medidas[i] = fila; else S.medidas.push(fila);
    S.medidas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    guardar("Medidas guardadas");
    cerrarSheet();
    pintar();
    toast("Medidas guardadas.");
  };
}

/* ============================================================
   PROGRESO
   ============================================================ */
function vistaProgreso() {
  const v = document.getElementById("v-progreso");
  const ses = S.sesiones || [];
  const totalSeries = ses.reduce((a, s) => a + s.series, 0);
  const totalKcal = ses.reduce((a, s) => a + s.kcal, 0);
  const totalMin = ses.reduce((a, s) => a + s.min, 0);

  v.innerHTML = `
    <div class="hero">
      <p class="eyebrow">Todo lo que llevás</p>
      <div class="datos grande">
        <div><b>${ses.length}</b><span>entrenamientos</span></div>
        <div><b>${totalSeries}</b><span>series</span></div>
        <div><b>${totalMin < 60 ? totalMin + "′" : Math.round(totalMin / 60) + "h"}</b><span>de gimnasio</span></div>
      </div>
      <p class="sm muted" style="margin:12px 0 0">${totalKcal ? "Cerca de " + redondear(totalKcal, 0) + " calorías quemadas entrenando." : "Tus números aparecen acá apenas termines el primer entrenamiento."}</p>
    </div>

    ${grafico("Peso", S.medidas.map(m => ({ x: m.fecha, y: m.peso })), "kg")}
    ${grafico("Grasa corporal", S.medidas.map(m => {
        const e = evaluar(S.perfil, m); return { x: m.fecha, y: e && e.grasa };
      }).filter(p => p.y != null), "%")}
    ${grafico("Entrenamientos por semana", porSemana(ses), "")}

    <p class="eyebrow" style="margin:22px 2px 10px">Tus mejores cargas</p>
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

function porSemana(ses) {
  const mapa = {};
  ses.forEach(s => {
    const d = new Date(s.fecha + "T00:00:00");
    d.setDate(d.getDate() - diaSemana(s.fecha));
    const k = d.toISOString().slice(0, 10);
    mapa[k] = (mapa[k] || 0) + 1;
  });
  return Object.entries(mapa).sort().map(([x, y]) => ({ x, y }));
}

/* Gráfico de línea, dibujado a mano con SVG: liviano y sin librerías. */
function grafico(titulo, puntos, unidad) {
  if (!puntos || puntos.length < 2)
    return `<div class="card pad" style="margin-top:14px"><p class="eyebrow">${esc(titulo)}</p>
      <p class="vacio chico">Hacen falta al menos dos registros para dibujar la evolución.</p></div>`;

  const W = 320, H = 96, P = 8;
  const ys = puntos.map(p => p.y);
  const min = Math.min(...ys), max = Math.max(...ys);
  const plano = (max - min) === 0;
  const rango = (max - min) || 1;
  const px = i => P + (i * (W - P * 2)) / (puntos.length - 1);
  /* Si todos los valores son iguales, la línea va al medio y no pegada al piso. */
  const py = y => plano ? H / 2 : H - P - ((y - min) / rango) * (H - P * 2);
  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(p.y).toFixed(1)}`).join(" ");
  const area = linea + ` L${px(puntos.length - 1).toFixed(1)} ${H} L${px(0).toFixed(1)} ${H} Z`;
  const delta = puntos[puntos.length - 1].y - puntos[0].y;

  return `<div class="card pad" style="margin-top:14px">
    <div class="graf-head">
      <p class="eyebrow">${esc(titulo)}</p>
      <span class="delta ${delta === 0 ? "" : delta < 0 ? "baja" : "sube"}">${delta > 0 ? "+" : ""}${redondear(delta, 1)} ${esc(unidad)}</span>
    </div>
    <svg class="graf" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
      aria-label="Evolución de ${esc(titulo.toLowerCase())}">
      <path class="graf-area" d="${area}"/>
      <path class="graf-linea" d="${linea}"/>
      ${puntos.map((p, i) => `<circle class="graf-punto" cx="${px(i).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="2.6"/>`).join("")}
    </svg>
    <div class="graf-pie"><span>${esc(fechaCorta(puntos[0].x))}</span>
      <span>${redondear(min, 1)}–${redondear(max, 1)} ${esc(unidad)}</span>
      <span>${esc(fechaCorta(puntos[puntos.length - 1].x))}</span></div>
  </div>`;
}

/* ============================================================
   AJUSTES
   ============================================================ */
function abrirAjustes() {
  if (!S.perfil) return;
  const p = S.perfil;
  const suscripcion = Cuenta.acceso
    ? (Cuenta.acceso.motivo === "prueba"
        ? `Prueba gratis · quedan ${Cuenta.acceso.diasRestantes} día${Cuenta.acceso.diasRestantes === 1 ? "" : "s"}`
        : Cuenta.acceso.motivo === "suscripcion" ? "Suscripción activa" : "Sin suscripción")
    : "Guardado solo en este dispositivo";

  abrirSheet(`
    <div class="sheet-head"><h3>Tu cuenta</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <p class="eyebrow">${esc(suscripcion)}</p>

    <div class="field"><label for="aj-nombre">Nombre</label>
      <input id="aj-nombre" value="${esc(p.nombre || "")}"></div>
    <div class="dos">
      <div class="field"><label for="aj-altura">Altura (cm)</label>
        <input id="aj-altura" type="number" inputmode="decimal" value="${p.altura || ""}"></div>
      <div class="field"><label for="aj-dias">Días por semana</label>
        <input id="aj-dias" type="number" inputmode="numeric" min="2" max="6" value="${p.dias || 3}"></div>
    </div>

    <label class="lbl">Objetivo</label>
    <div class="ops" id="aj-obj">${Object.entries(OBJETIVOS).map(([id, o]) =>
      `<button type="button" class="op${p.objetivo === id ? " activo" : ""}" data-v="${id}"><b>${esc(o.nombre)}</b></button>`).join("")}</div>

    <label class="lbl" style="margin-top:16px">Nivel</label>
    <div class="ops" id="aj-niv">${Object.entries(NIVELES).map(([id, n]) =>
      `<button type="button" class="op${p.nivel === id ? " activo" : ""}" data-v="${id}"><b>${esc(n.nombre)}</b></button>`).join("")}</div>

    <label class="lbl" style="margin-top:16px">Dónde entrenás</label>
    <div class="ops" id="aj-eq">${Object.entries(EQUIPO).map(([id, e]) =>
      `<button type="button" class="op${p.equipo === id ? " activo" : ""}" data-v="${id}"><b>${esc(e.nombre)}</b></button>`).join("")}</div>

    <label class="lbl" style="margin-top:16px">Molestias a cuidar</label>
    <div class="ops" id="aj-lim">${Object.entries(LIMITACIONES).map(([id, l]) =>
      `<button type="button" class="op${(p.limitaciones || []).includes(id) ? " activo" : ""}" data-v="${id}"><b>${esc(l.nombre)}</b></button>`).join("")}</div>

    <label class="lbl" style="margin-top:16px">Tema</label>
    <div class="ops" id="aj-tema">${[["auto", "Automático"], ["oscuro", "Oscuro"], ["claro", "Claro"]].map(([id, n]) =>
      `<button type="button" class="op${Tema.leer() === id ? " activo" : ""}" data-v="${id}"><b>${esc(n)}</b></button>`).join("")}</div>

    ${bloqueInstalarAjustes()}

    <button class="btn block" id="aj-guardar" style="margin-top:20px">Guardar cambios</button>
    <button class="btn ghost block" id="aj-exportar" style="margin-top:8px">Descargar mis datos</button>
    ${HAY_NUBE && Cuenta.usuario ? `
      ${Cuenta.acceso && Cuenta.acceso.motivo === "suscripcion"
        ? `<button class="btn ghost block" id="aj-cancelar" style="margin-top:8px">Cancelar suscripción</button>` : ""}
      <button class="btn ghost block" id="aj-salir" style="margin-top:8px">Cerrar sesión</button>` : ""}
    <button class="btn ghost block peligro" id="aj-borrar" style="margin-top:8px">Borrar todo y empezar de cero</button>
    <p class="sm muted" style="margin:16px 0 0">Nivora Fit te da estimaciones y una rutina general.
    No reemplaza a un médico, un nutricionista ni un profesor. Si algo te duele, pará y consultá.</p>`);

  const elegidos = {};
  [["aj-obj", "objetivo"], ["aj-niv", "nivel"], ["aj-eq", "equipo"], ["aj-tema", "tema"]].forEach(([caja, campo]) => {
    document.querySelectorAll("#" + caja + " .op").forEach(b => b.onclick = () => {
      elegidos[campo] = b.dataset.v;
      document.querySelectorAll("#" + caja + " .op").forEach(o => o.classList.remove("activo"));
      b.classList.add("activo");
    });
  });
  const lims = new Set(p.limitaciones || []);
  document.querySelectorAll("#aj-lim .op").forEach(b => b.onclick = () => {
    if (lims.has(b.dataset.v)) lims.delete(b.dataset.v); else lims.add(b.dataset.v);
    b.classList.toggle("activo");
  });

  document.getElementById("aj-guardar").onclick = () => {
    const antes = JSON.stringify([p.objetivo, p.nivel, p.equipo, p.dias, [...lims]]);
    p.nombre = document.getElementById("aj-nombre").value.trim() || p.nombre;
    p.altura = num(document.getElementById("aj-altura").value, p.altura);
    p.dias = Math.min(6, Math.max(2, Math.round(num(document.getElementById("aj-dias").value, p.dias))));
    Object.assign(p, elegidos);
    if (elegidos.tema) Tema.fijar(elegidos.tema);
    p.limitaciones = [...lims];
    const despues = JSON.stringify([p.objetivo, p.nivel, p.equipo, p.dias, [...lims]]);
    if (antes !== despues && !S.activa) S.agenda = null; /* que se rearme con lo nuevo */
    aplicarTema();
    guardar("Ajustes guardados");
    cerrarSheet();
    pintar();
    toast("Listo, guardado.");
  };

  const bi = document.getElementById("aj-instalar");
  if (bi) bi.onclick = () => { cerrarSheet(); pedirInstalacion(); };

  document.getElementById("aj-exportar").onclick = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "nivora-fit-" + hoyISO() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const cancelar = document.getElementById("aj-cancelar");
  if (cancelar) cancelar.onclick = async () => {
    if (!confirm("¿Cancelás la suscripción? Vas a poder seguir usando la app hasta el final del período pago.")) return;
    if (await cancelarSuscripcion()) { cerrarSheet(); pintar(); }
  };
  const salir = document.getElementById("aj-salir");
  if (salir) salir.onclick = () => { cerrarSheet(); cerrarSesion(); };

  document.getElementById("aj-borrar").onclick = () => {
    if (!confirm("Esto borra tu perfil, tus medidas y todo tu historial en este dispositivo. ¿Seguro?")) return;
    S.perfil = null; S.medidas = []; S.cargas = {}; S.sesiones = []; S.activa = null; S.agenda = null;
    borrador = null; paso = 0;
    lsBorrar(); guardar("Datos borrados");
    cerrarSheet(); pintar();
  };
}

/* ============================================================
   INSTALAR EN EL TELÉFONO
   ============================================================ */
const CLAVE_INSTALAR_OCULTO = "nivora.instalar.oculto";

function instalarOculto() {
  try { return localStorage.getItem(CLAVE_INSTALAR_OCULTO) === "1"; } catch (e) { return false; }
}

/* La tarjeta del final de Hoy: aparece solo si se puede instalar y la
   persona no dijo "ahora no". */
function tarjetaInstalar() {
  const e = Instalar.estado();
  const vale = (e === "boton" || e === "ios") && !instalarOculto();
  return `<div class="card pad instalar-card" id="caja-instalar" ${vale ? "" : "hidden"} style="margin-top:18px">
    <p class="eyebrow">Tenela a mano</p>
    <p class="cuerpo" style="margin:8px 0 14px">Instalá Nivora Fit en tu pantalla de inicio: abre al toque,
    a pantalla completa, y funciona aunque en el gimnasio no haya señal.</p>
    <div class="linea-botones">
      <button class="btn" id="hoy-instalar">Instalar</button>
      <button class="btn ghost" id="hoy-instalar-no">Ahora no</button>
    </div>
  </div>`;
}

function conectarInstalar() {
  const si = document.getElementById("hoy-instalar");
  const no = document.getElementById("hoy-instalar-no");
  if (si) si.onclick = pedirInstalacion;
  if (no) no.onclick = () => {
    try { localStorage.setItem(CLAVE_INSTALAR_OCULTO, "1"); } catch (e) {}
    const c = document.getElementById("caja-instalar");
    if (c) c.hidden = true;
    toast("Cuando quieras, está en tu cuenta → Instalar.");
  };
}

/* Si el navegador avisa tarde que se puede instalar, actualizamos la tarjeta. */
function refrescarInstalar() {
  const c = document.getElementById("caja-instalar");
  if (!c) return;
  c.outerHTML = tarjetaInstalar();
  conectarInstalar();
}

function bloqueInstalarAjustes() {
  const e = Instalar.estado();
  if (e === "instalada")
    return `<p class="sm muted" style="margin:18px 0 0">● Nivora Fit ya está instalada en este teléfono.</p>`;
  if (e === "boton" || e === "ios" || e === "ios-otro-navegador")
    return `<button class="btn ghost block" id="aj-instalar" style="margin-top:18px">Instalar en el teléfono</button>`;
  return "";
}

function pedirInstalacion() {
  Instalar.pedir().then(r => {
    if (r === "aceptada") {
      toast("Listo, ya la tenés en la pantalla de inicio.");
      const c = document.getElementById("caja-instalar");
      if (c) c.hidden = true;
    } else if (r === "ios") {
      pasosIOS();
    } else if (r === "ios-otro-navegador") {
      abrirSheet(`<div class="sheet-head"><h3>Abrila en Safari</h3>
        <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
        <p class="cuerpo">En iPhone, solo Safari puede agregar apps a la pantalla de inicio.
        Copiá la dirección, abrila en Safari y seguí los pasos de ahí.</p>
        <button class="btn block" id="copiar-url">Copiar dirección</button>`);
      document.getElementById("copiar-url").onclick = () => {
        (navigator.clipboard ? navigator.clipboard.writeText(location.origin + "/app/") : Promise.reject())
          .then(() => toast("Dirección copiada."), () => toast(location.origin + "/app/"));
      };
    } else if (r === "manual") {
      toast("Buscá \"Instalar\" o \"Agregar a inicio\" en el menú del navegador.");
    }
  });
}

function pasosIOS() {
  abrirSheet(`<div class="sheet-head"><h3>Instalar en iPhone</h3>
    <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <ol class="pasos-ios">
      <li>Tocá <b>Compartir</b>
        <span class="ico-ios"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 12v8h14v-8"/></svg></span>
        en la barra de Safari, abajo en el centro.</li>
      <li>Bajá en la lista y elegí <b>Agregar a inicio</b>.</li>
      <li>Tocá <b>Agregar</b> arriba a la derecha. Listo.</li>
    </ol>
    <button class="btn block" id="ios-ok">Entendido</button>`);
  document.getElementById("ios-ok").onclick = cerrarSheet;
}
