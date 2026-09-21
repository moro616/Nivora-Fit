"use strict";
/* ============================================================
   fotos.js — fotos de progreso, privadas
   Se guardan en un espacio privado de Supabase Storage, dentro de una
   carpeta con el id de la persona. Las reglas de la base no dejan que
   nadie más las lea: ni otros usuarios ni la app de otra cuenta.
   Para mostrarlas se piden links firmados que vencen en una hora.
   ============================================================ */

const BUCKET_FOTOS = "progreso";
const Fotos = { lista: null, urls: {}, cargando: false };

function fotosDisponibles() { return HAY_NUBE && Cuenta.usuario; }

function tarjetaFotos() {
  if (!fotosDisponibles()) {
    return `<div class="card pad" style="margin-top:14px">
      <p class="eyebrow">Fotos de progreso</p>
      <p class="sm muted" style="margin:6px 0 0">Para guardar fotos de progreso necesitás una cuenta.</p></div>`;
  }
  return `<div class="card pad fotos-card" style="margin-top:14px">
    <div class="graf-head"><p class="eyebrow" style="margin:0">Fotos de progreso</p>
      <span class="delta" id="fotos-cuenta"></span></div>
    <p class="sm muted" style="margin:6px 0 12px">Privadas: solo las ves vos. Sacalas siempre en el mismo lugar, con la misma luz y la misma ropa, así la comparación es justa.</p>
    <div class="fotos-grilla" id="fotos-grilla"><p class="vacio chico">Cargando…</p></div>
    <div class="linea-botones" style="margin-top:12px">
      <button class="btn" id="fotos-agregar">Agregar foto</button>
      <button class="btn ghost" id="fotos-comparar" disabled>Comparar</button>
    </div>
  </div>`;
}

function conectarFotos() {
  const a = document.getElementById("fotos-agregar");
  if (!a) return;
  a.onclick = agregarFoto;
  document.getElementById("fotos-comparar").onclick = compararFotos;
  cargarFotos().then(pintarGrillaFotos);
}

const fechaDeFoto = nombre => nombre.slice(0, 10);

async function cargarFotos(forzar) {
  if (Fotos.lista && !forzar) return Fotos.lista;
  const uid = Cuenta.usuario.id;
  const { data, error } = await SB.storage.from(BUCKET_FOTOS).list(uid, { limit: 200, sortBy: { column: "name", order: "asc" } });
  if (error) { console.warn("fotos:", error.message); Fotos.lista = []; return []; }
  Fotos.lista = (data || []).filter(f => /\.jpe?g$/i.test(f.name)).map(f => ({ nombre: f.name, ruta: uid + "/" + f.name, fecha: fechaDeFoto(f.name) }));
  if (S.perfil && S.perfil.fotos !== Fotos.lista.length) { S.perfil.fotos = Fotos.lista.length; guardar(); }
  const faltan = Fotos.lista.filter(f => !Fotos.urls[f.ruta]).map(f => f.ruta);
  if (faltan.length) {
    const { data: firmadas } = await SB.storage.from(BUCKET_FOTOS).createSignedUrls(faltan, 3600);
    (firmadas || []).forEach(x => { if (x.signedUrl) Fotos.urls[x.path] = x.signedUrl; });
  }
  return Fotos.lista;
}

function pintarGrillaFotos() {
  const g = document.getElementById("fotos-grilla");
  if (!g) return;
  const l = Fotos.lista || [];
  const c = document.getElementById("fotos-cuenta");
  if (c) c.textContent = l.length ? l.length + (l.length === 1 ? " foto" : " fotos") : "";
  document.getElementById("fotos-comparar").disabled = l.length < 2;
  if (!l.length) { g.innerHTML = `<p class="vacio chico">Todavía no hay fotos. La primera es tu punto de partida.</p>`; return; }
  g.innerHTML = l.slice().reverse().map(f => `<button class="foto-mini" data-foto="${esc(f.ruta)}" aria-label="Foto del ${esc(fechaCorta(f.fecha))}">
    <img src="${esc(Fotos.urls[f.ruta] || "")}" alt="" loading="lazy"><span>${esc(fechaCorta(f.fecha))}</span></button>`).join("");
  g.querySelectorAll("[data-foto]").forEach(b => b.onclick = () => verFoto(b.dataset.foto));
}

/* Achica la foto en el teléfono: lado mayor de 1280 px, JPEG. */
function achicarImagen(archivo, lado) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => b ? ok(b) : mal(new Error("imagen")), "image/jpeg", 0.84);
    };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error("imagen")); };
    img.src = url;
  });
}

function agregarFoto() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const b = document.getElementById("fotos-agregar");
    if (b) { b.disabled = true; b.textContent = "Subiendo…"; }
    try {
      const blob = await achicarImagen(f, 1280);
      const nombre = `${hoyISO()}_${nuevoId()}.jpg`;
      const { error } = await SB.storage.from(BUCKET_FOTOS).upload(Cuenta.usuario.id + "/" + nombre, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      await cargarFotos(true);
      pintarGrillaFotos();
      toast("Foto guardada.");
      if (typeof revisarLogros === "function") revisarLogros();
    } catch (e) {
      toast("No se pudo subir la foto. Revisá la conexión y probá de nuevo.");
    } finally {
      if (b) { b.disabled = false; b.textContent = "Agregar foto"; }
    }
  };
  input.click();
}

function verFoto(ruta) {
  const f = (Fotos.lista || []).find(x => x.ruta === ruta);
  if (!f) return;
  abrirSheet(`
    <div class="sheet-head"><h3>${esc(fechaCorta(f.fecha))}</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <img class="foto-grande-img" src="${esc(Fotos.urls[ruta] || "")}" alt="Foto de progreso del ${esc(fechaCorta(f.fecha))}">
    <button class="btn ghost block peligro" id="foto-borrar" style="margin-top:14px">Borrar esta foto</button>`);
  document.getElementById("foto-borrar").onclick = async () => {
    if (!confirm("¿Borrás esta foto? No se puede recuperar.")) return;
    const { error } = await SB.storage.from(BUCKET_FOTOS).remove([ruta]);
    if (error) return toast("No se pudo borrar ahora.");
    delete Fotos.urls[ruta];
    await cargarFotos(true);
    cerrarSheet();
    pintarGrillaFotos();
    toast("Foto borrada.");
  };
}

/* Antes y después: dos fotos superpuestas y una manija para deslizar. */
function compararFotos() {
  const l = Fotos.lista || [];
  if (l.length < 2) return;
  let antes = l[0], despues = l[l.length - 1];
  const opciones = sel => l.map(f => `<option value="${esc(f.ruta)}"${f.ruta === sel.ruta ? " selected" : ""}>${esc(fechaCorta(f.fecha))}</option>`).join("");
  const dias = () => Math.round((new Date(despues.fecha) - new Date(antes.fecha)) / 86400000);

  abrirSheet(`
    <div class="sheet-head"><h3>Antes y después</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    <div class="dos">
      <div class="field"><label for="cmp-a">Antes</label><select id="cmp-a">${opciones(antes)}</select></div>
      <div class="field"><label for="cmp-d">Después</label><select id="cmp-d">${opciones(despues)}</select></div>
    </div>
    <div class="comparador" id="cmp">
      <img id="cmp-img-d" src="${esc(Fotos.urls[despues.ruta])}" alt="Después">
      <div class="cmp-antes" id="cmp-antes"><img id="cmp-img-a" src="${esc(Fotos.urls[antes.ruta])}" alt="Antes"></div>
      <div class="cmp-linea" id="cmp-linea"><span></span></div>
      <span class="cmp-et izq">Antes</span><span class="cmp-et der">Después</span>
    </div>
    <input type="range" id="cmp-rango" min="0" max="100" value="50" aria-label="Deslizar para comparar" class="cmp-rango">
    <p class="sm muted" id="cmp-dias" style="margin:8px 0 0;text-align:center"></p>`);

  const rango = document.getElementById("cmp-rango");
  const mover = v => {
    document.getElementById("cmp-antes").style.clipPath = `inset(0 ${100 - v}% 0 0)`;
    document.getElementById("cmp-linea").style.left = v + "%";
  };
  const pintarDias = () => {
    const d = dias();
    document.getElementById("cmp-dias").textContent = d > 0 ? `${d} días entre una y otra` : d < 0 ? "La de \"antes\" es más nueva que la de \"después\"" : "Son del mismo día";
  };
  rango.oninput = e => mover(Number(e.target.value));
  const cmp = document.getElementById("cmp");
  const arrastrar = ev => {
    const r = cmp.getBoundingClientRect();
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const v = Math.max(0, Math.min(100, (x / r.width) * 100));
    rango.value = v; mover(v);
  };
  cmp.addEventListener("pointerdown", e => { cmp.setPointerCapture(e.pointerId); arrastrar(e); });
  cmp.addEventListener("pointermove", e => { if (e.buttons) arrastrar(e); });
  document.getElementById("cmp-a").onchange = e => {
    antes = l.find(f => f.ruta === e.target.value); document.getElementById("cmp-img-a").src = Fotos.urls[antes.ruta]; pintarDias();
  };
  document.getElementById("cmp-d").onchange = e => {
    despues = l.find(f => f.ruta === e.target.value); document.getElementById("cmp-img-d").src = Fotos.urls[despues.ruta]; pintarDias();
  };
  mover(50); pintarDias();
}
