"use strict";
/* ============================================================
   informe.js — "Descargar mi informe": un PDF prolijo con tu perfil,
   tu evaluación corporal, tu actividad y tus marcas.
   jsPDF se carga recién cuando alguien toca el botón (vive en /vendor),
   así la app no paga esos KB al abrir.
   ============================================================ */

function cargarJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  return new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "/vendor/jspdf.umd.min.js";
    s.onload = () => window.jspdf ? ok(window.jspdf) : mal(new Error("jsPDF no cargó"));
    s.onerror = () => mal(new Error("sin conexión"));
    document.head.appendChild(s);
  });
}

/* Helvetica de los PDF no tiene algunos signos tipográficos: los cambiamos. */
const pdfTxt = t => String(t == null ? "" : t)
  .replace(/[′’‘]/g, "'").replace(/[″“”]/g, '"').replace(/[–—]/g, "-").replace(/…/g, "...").replace(/→/g, "->");

async function descargarInforme(boton) {
  const txt = boton ? boton.innerHTML : "";
  if (boton) { boton.disabled = true; }
  toast("Armando tu informe…");
  try {
    const { jsPDF } = await cargarJsPDF();
    const doc = armarInforme(jsPDF);
    const nombre = "nivora-fit-informe-" + hoyISO() + ".pdf";
    const blob = doc.output("blob");
    const archivo = typeof File === "function" ? new File([blob], nombre, { type: "application/pdf" }) : null;
    /* En el teléfono, compartir abre "Guardar en archivos", Drive, WhatsApp… */
    if (archivo && navigator.canShare && navigator.canShare({ files: [archivo] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try { await navigator.share({ files: [archivo], title: "Mi informe Nivora Fit" }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast("Informe descargado.");
  } catch (e) {
    toast("No pudimos armar el PDF. Revisá la conexión y probá de nuevo.");
  } finally {
    if (boton) { boton.disabled = false; boton.innerHTML = txt; }
  }
}

function armarInforme(jsPDF) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16, ANCHO = W - M * 2;
  const NEGRO = [11, 11, 12], GRIS = [117, 117, 127], LINEA = [226, 226, 231], SUAVE = [245, 245, 247], VERDE = [22, 124, 74];
  const p = S.perfil || {};
  const ev = evaluar(p) || {};
  const ses = (S.sesiones || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  let y = 0, pagina = 1;

  const color = (c, tipo) => tipo === "f" ? doc.setFillColor(...c) : tipo === "d" ? doc.setDrawColor(...c) : doc.setTextColor(...c);
  const fuente = (peso, tam) => { doc.setFont("helvetica", peso); doc.setFontSize(tam); };
  const texto = (t, x, yy, op) => doc.text(pdfTxt(t), x, yy, op);

  function pie() {
    fuente("normal", 7.5); color(GRIS);
    texto("Nivora Fit te da estimaciones a partir de fórmulas estándar. No reemplaza a un médico, nutricionista ni profesor.", M, H - 9);
    texto("Página " + pagina, W - M, H - 9, { align: "right" });
  }
  function nuevaPagina() {
    pie(); doc.addPage(); pagina++;
    y = 18;
    fuente("bold", 8); color(GRIS);
    texto("NIVORA FIT · " + (p.nombre || "").toUpperCase(), M, 11);
    color(LINEA, "d"); doc.setLineWidth(0.3); doc.line(M, 13.5, W - M, 13.5);
  }
  const lugar = alto => { if (y + alto > H - 18) nuevaPagina(); };

  /* reservar: lo que ocupa lo que viene abajo, para no dejar un título huérfano al pie. */
  function titulo(t, bajada, reservar) {
    lugar((bajada ? 20 : 14) + (reservar || 30));
    y += 6;
    fuente("bold", 13); color(NEGRO); texto(t, M, y);
    if (bajada) { y += 5; fuente("normal", 8.5); color(GRIS); texto(bajada, M, y); }
    y += 5;
  }

  /* Cajas de datos en una fila: [{v, u, l, tono}] */
  function cajas(items, alto) {
    alto = alto || 22;
    lugar(alto + 3);
    const gap = 3, w = (ANCHO - gap * (items.length - 1)) / items.length;
    items.forEach((it, i) => {
      const x = M + i * (w + gap);
      color(SUAVE, "f"); doc.roundedRect(x, y, w, alto, 2.5, 2.5, "F");
      fuente("normal", 7.5); color(GRIS); texto(it.l.toUpperCase(), x + 4, y + 6);
      fuente("bold", 15); color(it.tono === "bien" ? VERDE : NEGRO); texto(String(it.v), x + 4, y + 14.5);
      const anchoV = doc.getTextWidth(pdfTxt(String(it.v)));
      if (it.u) { fuente("normal", 8.5); color(GRIS); texto(it.u, x + 5 + anchoV, y + 14.5); }
      if (it.s) { fuente("normal", 7); color(GRIS); texto(doc.splitTextToSize(pdfTxt(it.s), w - 8)[0], x + 4, y + 19.2); }
    });
    y += alto + 3;
  }

  /* Tabla simple: columnas [{t, w, a}] y filas de strings */
  function tabla(cols, filas) {
    const alto = 7.2;
    const cabecera = () => {
      color(NEGRO, "f"); doc.rect(M, y, ANCHO, alto, "F");
      fuente("bold", 8); color([255, 255, 255]);
      let x = M;
      cols.forEach(c => { texto(c.t, c.a === "r" ? x + c.w - 3 : x + 3, y + 4.8, c.a === "r" ? { align: "right" } : undefined); x += c.w; });
      y += alto;
    };
    lugar(alto * 2 + 2); cabecera();
    filas.forEach((f, i) => {
      if (y + alto > H - 18) { nuevaPagina(); cabecera(); }
      if (i % 2) { color(SUAVE, "f"); doc.rect(M, y, ANCHO, alto, "F"); }
      fuente("normal", 8.5); color(NEGRO);
      let x = M;
      cols.forEach((c, j) => {
        const val = doc.splitTextToSize(pdfTxt(f[j]), c.w - 5)[0] || "";
        texto(val, c.a === "r" ? x + c.w - 3 : x + 3, y + 4.8, c.a === "r" ? { align: "right" } : undefined);
        x += c.w;
      });
      y += alto;
    });
    y += 2;
  }

  function parrafo(t, tam) {
    fuente("normal", tam || 9.5); color([51, 51, 58]);
    const lineas = doc.splitTextToSize(pdfTxt(t), ANCHO);
    lugar(lineas.length * 4.6 + 2);
    doc.text(lineas, M, y + 3.5);
    y += lineas.length * 4.6 + 2;
  }

  function graficoPeso(pts) {
    const alto = 46;
    lugar(alto + 6);
    color(LINEA, "d"); doc.setLineWidth(0.2);
    const ys = pts.map(p => p.y);
    let min = Math.min(...ys), max = Math.max(...ys);
    const m = Math.max((max - min) * 0.2, 0.5); min -= m; max += m;
    const x0 = M + 12, x1 = W - M, y0 = y + 3, y1 = y + alto - 7;
    const t0 = new Date(pts[0].x).getTime(), t1 = new Date(pts[pts.length - 1].x).getTime();
    const px = p => x0 + ((new Date(p.x).getTime() - t0) / Math.max(1, t1 - t0)) * (x1 - x0);
    const py = v => y1 - ((v - min) / (max - min)) * (y1 - y0);
    fuente("normal", 7); color(GRIS);
    [0, 0.5, 1].forEach(f => {
      const v = min + f * (max - min), yy = py(v);
      doc.setLineDashPattern([0.8, 1], 0); doc.line(x0, yy, x1, yy);
      texto(redondear(v, 1), x0 - 2, yy + 1, { align: "right" });
    });
    doc.setLineDashPattern([], 0);
    color(NEGRO, "d"); doc.setLineWidth(0.6);
    for (let i = 1; i < pts.length; i++) doc.line(px(pts[i - 1]), py(pts[i - 1].y), px(pts[i]), py(pts[i].y));
    color(NEGRO, "f");
    pts.forEach(p => doc.circle(px(p), py(p.y), 0.9, "F"));
    fuente("normal", 7); color(GRIS);
    texto(fechaCorta(pts[0].x), x0, y + alto - 2);
    texto(fechaCorta(pts[pts.length - 1].x), x1, y + alto - 2, { align: "right" });
    y += alto + 2;
  }

  /* ---------- portada ---------- */
  color(NEGRO, "f"); doc.rect(0, 0, W, 46, "F");
  fuente("bold", 11); color([255, 255, 255]); doc.setCharSpace(1.2);
  texto("NIVORA FIT", M, 16); doc.setCharSpace(0);
  fuente("bold", 22); texto("Informe personal", M, 30);
  fuente("normal", 9.5); color([190, 190, 198]);
  texto(`${p.nombre || "Sin nombre"} · generado el ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`, M, 38);
  y = 54;

  /* ---------- datos ---------- */
  titulo("Tus datos");
  const edad = edadDe(p);
  tabla([{ t: "Dato", w: 58 }, { t: "Valor", w: ANCHO - 58 }], [
    ["Nombre", p.nombre || "—"],
    ["Correo", (HAY_NUBE && Cuenta.usuario) ? Cuenta.usuario.email : "—"],
    ["Edad y sexo", `${edad || "—"} años · ${p.sexo === "mujer" ? "Mujer" : "Hombre"}`],
    ["Altura", p.altura ? p.altura + " cm" : "—"],
    ["Objetivo", (OBJETIVOS[p.objetivo] || {}).nombre || "—"],
    ["Nivel", (NIVELES[p.nivel] || {}).nombre || "—"],
    ["Días por semana", String(p.dias || 3)],
    ["Dónde entrena", (EQUIPO[p.equipo] || {}).nombre || "—"],
    ["Molestias a cuidar", (p.limitaciones || []).map(l => (LIMITACIONES[l] || {}).nombre || l).join(", ") || "Ninguna"],
    ...(p.telefono ? [["Teléfono", p.telefono]] : []),
    ...(p.ciudad ? [["Ciudad", p.ciudad]] : [])
  ]);

  /* ---------- evaluación ---------- */
  titulo("Evaluación corporal", "Según tu última medición" + (ultimaMedida() ? " del " + fechaCorta(ultimaMedida().fecha) : "") + ".");
  cajas([
    { l: "Peso", v: redondear(ev.peso, 1), u: "kg" },
    { l: "IMC", v: redondear(ev.imc, 1), s: ev.imcEtq ? ev.imcEtq.texto : "" },
    { l: "Grasa corporal", v: ev.grasa != null ? redondear(ev.grasa, 1) : "—", u: ev.grasa != null ? "%" : "", s: ev.grasaEtq ? ev.grasaEtq.texto : "" },
    { l: "Masa magra", v: ev.magra != null ? redondear(ev.magra, 1) : "—", u: ev.magra != null ? "kg" : "" }
  ], 24);
  if (ev.kcal) cajas([
    { l: "Calorías por día", v: redondear(ev.kcal, 0), u: "kcal" },
    { l: "Proteína", v: ev.proteina, u: "g" },
    { l: "Carbohidratos", v: ev.carbos, u: "g" },
    { l: "Grasas", v: ev.grasaG, u: "g" }
  ]);
  if (ev.cintura) parrafo(`${ev.cintura.texto}. La relación entre cintura y altura es ${redondear(ev.cintura.valor, 2)}; por debajo de 0,50 se considera saludable.`);

  const prog = progresoCorporal();
  if (prog) {
    titulo("Desde que empezaste", `${prog.dias} días de seguimiento.`);
    const signo = v => (v > 0 ? "+" : "") + redondear(v, 1);
    cajas([
      { l: "Peso", v: signo(prog.peso), u: "kg", tono: prog.peso < 0 ? "bien" : "" },
      ...(prog.grasa != null ? [{ l: "Grasa", v: signo(prog.grasa), u: "%", tono: prog.grasa < 0 ? "bien" : "" }] : []),
      ...(prog.cintura != null ? [{ l: "Cintura", v: signo(prog.cintura), u: "cm", tono: prog.cintura < 0 ? "bien" : "" }] : [])
    ]);
  }
  const ptsPeso = (S.medidas || []).filter(m => m.peso).map(m => ({ x: m.fecha, y: m.peso }));
  if (ptsPeso.length >= 2) { titulo("Evolución del peso", null, 52); graficoPeso(ptsPeso); }

  /* ---------- actividad ---------- */
  const gym = ses.filter(s => s.km == null), afuera = ses.filter(s => s.km != null);
  const minTot = ses.reduce((a, s) => a + (s.min || 0), 0);
  titulo("Actividad", ses.length ? `Desde el ${fechaCorta(ses[0].fecha)}.` : "Todavía no hay entrenamientos registrados.");
  if (ses.length) {
    cajas([
      { l: "Entrenamientos", v: gym.length },
      { l: "Salidas afuera", v: afuera.length, s: afuera.length ? redondear(afuera.reduce((a, s) => a + s.km, 0), 1) + " km en total" : "" },
      { l: "Tiempo total", v: minTot < 60 ? minTot : redondear(minTot / 60, 1), u: minTot < 60 ? "min" : "h" },
      { l: "Calorías", v: redondear(ses.reduce((a, s) => a + (s.kcal || 0), 0), 0), u: "kcal" }
    ], 24);
    titulo("Últimos entrenamientos");
    tabla([{ t: "Fecha", w: 26 }, { t: "Entrenamiento", w: 60 }, { t: "Detalle", w: 50 }, { t: "Tiempo", w: 21, a: "r" }, { t: "Kcal", w: ANCHO - 157, a: "r" }],
      ses.slice(-20).reverse().map(s => [
        fechaCorta(s.fecha), s.nombre || s.bloque,
        s.km != null ? redondear(s.km, 2) + " km" + (s.ritmo ? " · " + fmtSeg(s.ritmo) + " /km" : "")
          : s.series + " series" + (s.volumen ? " · " + redondear(s.volumen, 0) + " kg" : ""),
        s.min + " min", String(s.kcal || 0)
      ]));
  }

  /* ---------- medidas ---------- */
  if ((S.medidas || []).length) {
    titulo("Historial de medidas");
    tabla([{ t: "Fecha", w: 28 }, { t: "Peso", w: 24, a: "r" }, { t: "Grasa", w: 24, a: "r" }, { t: "Cintura", w: 26, a: "r" }, { t: "Cadera", w: 26, a: "r" }, { t: "Cuello", w: ANCHO - 128, a: "r" }],
      S.medidas.slice(-15).reverse().map(m => {
        const e2 = evaluar(p, m);
        const cm = v => v ? redondear(v, 1) + " cm" : "—";
        return [fechaCorta(m.fecha), redondear(m.peso, 1) + " kg", e2 && e2.grasa != null ? redondear(e2.grasa, 1) + " %" : "—", cm(m.cintura), cm(m.cadera), cm(m.cuello)];
      }));
  }

  /* ---------- cargas ---------- */
  const cargas = Object.entries(S.cargas || {}).filter(([id, c]) => c.kg > 0 && porId(id)).sort((a, b) => b[1].kg - a[1].kg);
  if (cargas.length) {
    titulo("Tus mejores cargas");
    tabla([{ t: "Ejercicio", w: 90 }, { t: "Músculo", w: 40 }, { t: "Carga", w: 22, a: "r" }, { t: "Último", w: ANCHO - 152, a: "r" }],
      cargas.slice(0, 15).map(([id, c]) => [porId(id).nombre, GRUPOS[porId(id).grupo] || "", redondear(c.kg, 1) + " kg", fechaCorta(c.fecha)]));
  }

  pie();
  return doc;
}
