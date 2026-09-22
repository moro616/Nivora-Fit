/* ============================================================
   pixel.js — Píxel de Meta (Facebook / Instagram Ads)
   En la landing mide visitas y clics en "Probar gratis".
   En la app NO mide páginas ni botones: solo avisa dos momentos
   (cuenta creada y suscripción), sin ningún dato de salud.
   ============================================================ */
(function () {
  var ID = "328967566847789";
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var esApp = location.pathname.indexOf("/app") === 0;

  function cargar() {
    if (window.fbq || local) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* Sin detección automática de botones: en la app hay pesos y medidas
       en pantalla y no queremos que nada de eso viaje a Meta. */
    window.fbq("set", "autoConfig", false, ID);
    window.fbq("init", ID);
  }

  window.Pixel = {
    evento: function (nombre, datos) {
      try { cargar(); if (window.fbq) window.fbq("track", nombre, datos || {}); } catch (e) { /* nada */ }
    }
  };

  if (esApp) return;               /* en la app, solo los eventos puntuales */

  cargar();
  if (window.fbq) window.fbq("track", "PageView");
  /* Cualquier botón de la landing que lleva a la app cuenta como interés. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="/app"]') : null;
    if (a) window.Pixel.evento("Lead", { content_name: "Prueba gratis" });
  });
})();
