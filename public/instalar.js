"use strict";
/* ============================================================
   instalar.js — tener Nivora Fit en la pantalla de inicio
   Lo usan la landing y la app. Registra el service worker (que es lo
   que permite abrirla sin señal) y resuelve la instalación en cada
   teléfono, que no es igual en todos:

   · Android / Chrome / Edge / Samsung: el navegador avisa que se puede
     instalar y nosotros guardamos ese aviso para mostrarlo con un botón.
   · iPhone / iPad: Safari no tiene botón de instalar; hay que hacerlo
     desde Compartir → Agregar a inicio. Mostramos los pasos.
   · Ya instalada: no molestamos más.
   ============================================================ */

var Instalar = (function () {
  var aviso = null;            /* el evento beforeinstallprompt, guardado para después */
  var avisar = [];             /* quien quiera enterarse cuando cambia el estado */

  var ua = navigator.userAgent || "";
  var esIOS = /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); /* iPad que se hace pasar por Mac */
  var esSafariIOS = esIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

  function instalada() {
    return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
  }

  /* Qué se puede hacer en este dispositivo, ahora mismo. */
  function estado() {
    if (instalada()) return "instalada";
    if (aviso) return "boton";            /* Android y compañía: hay prompt nativo */
    if (esIOS) return esSafariIOS ? "ios" : "ios-otro-navegador";
    return "manual";                      /* navegador sin prompt: explicamos a mano */
  }

  function cambio() { avisar.forEach(function (f) { try { f(estado()); } catch (e) {} }); }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();                   /* lo mostramos nosotros, cuando corresponde */
    aviso = e;
    cambio();
  });
  window.addEventListener("appinstalled", function () {
    aviso = null;
    cambio();
  });

  /* Dispara la instalación. Devuelve una promesa con lo que pasó:
     "aceptada", "rechazada" o el estado si no hay prompt nativo (para
     que la pantalla muestre los pasos correspondientes). */
  function pedir() {
    if (!aviso) return Promise.resolve(estado());
    var e = aviso;
    aviso = null;
    e.prompt();
    return e.userChoice.then(function (r) {
      cambio();
      return r && r.outcome === "accepted" ? "aceptada" : "rechazada";
    });
  }

  function alCambiar(f) { avisar.push(f); f(estado()); }

  /* El service worker: sin esto no hay app sin conexión ni instalación en Android. */
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { /* sin SW sigue andando online */ });
    });
  }

  return { estado: estado, pedir: pedir, alCambiar: alCambiar, esIOS: esIOS, instalada: instalada };
})();

/* ---------- el tema, compartido entre la landing y la app ----------
   "auto" sigue al sistema; "oscuro" y "claro" lo fuerzan. Se guarda en el
   teléfono para que la landing y la app se vean igual. */
var Tema = (function () {
  var CLAVE = "nivora.tema";
  function leer() { try { return localStorage.getItem(CLAVE) || "auto"; } catch (e) { return "auto"; } }
  function guardar(t) { try { localStorage.setItem(CLAVE, t); } catch (e) {} }
  function sistemaOscuro() { return !(window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches); }
  function efectivo(t) { t = t || leer(); return t === "auto" ? (sistemaOscuro() ? "oscuro" : "claro") : t; }

  function aplicar(t) {
    t = t || leer();
    var r = document.documentElement;
    if (t === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", t);
    var ef = efectivo(t);
    r.setAttribute("data-tema-efectivo", ef);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", ef === "oscuro" ? "#0B0B0C" : "#FAFAFB");
  }
  function fijar(t) { guardar(t); aplicar(t); }
  /* El botón de la landing: pasa al opuesto de lo que se ve ahora. */
  function alternar() { fijar(efectivo() === "oscuro" ? "claro" : "oscuro"); }

  if (window.matchMedia) {
    var mq = matchMedia("(prefers-color-scheme: light)");
    var alSistema = function () { if (leer() === "auto") aplicar("auto"); };
    if (mq.addEventListener) mq.addEventListener("change", alSistema); else if (mq.addListener) mq.addListener(alSistema);
  }
  return { leer: leer, fijar: fijar, aplicar: aplicar, alternar: alternar, efectivo: efectivo };
})();
