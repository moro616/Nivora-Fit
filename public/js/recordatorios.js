"use strict";
/* ============================================================
   recordatorios.js — avisos en el teléfono
   El teléfono se suscribe a las notificaciones y le dice al servidor a
   qué hora las quiere. Una función de Netlify corre cada hora y manda el
   aviso que corresponda: "hoy te toca" o "hace días que no entrenás".
   Andan en Android (Chrome) y en iPhone con la app instalada (iOS 16.4+).
   ============================================================ */

function pushSoportado() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!CONFIG.VAPID_PUBLIC_KEY;
}

function textoRecordatorios() {
  const r = S.perfil && S.perfil.recordatorios;
  if (!r || !r.activo) return "Apagados";
  return `Todos los días a las ${String(r.hora).padStart(2, "0")}:00`;
}

function claveUint8(base64) {
  const relleno = "=".repeat((4 - base64.length % 4) % 4);
  const b = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...b].map(c => c.charCodeAt(0)));
}

async function llamarPush(cuerpo) {
  const { data: { session } } = await SB.auth.getSession();
  const r = await fetch("/.netlify/functions/push-suscribir", {
    method: "POST",
    headers: { "Authorization": "Bearer " + session.access_token, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo)
  });
  if (!r.ok) throw new Error("http-" + r.status);
  return r.json();
}

function hojaRecordatorios() {
  const r = (S.perfil && S.perfil.recordatorios) || { activo: false, hora: 18, faltas: true, tocaHoy: true };
  const ios = /iPhone|iPad/i.test(navigator.userAgent);
  const instalada = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const bloqueado = "Notification" in window && Notification.permission === "denied";

  abrirSheet(`
    <div class="sheet-head"><button class="xbtn" id="volver" aria-label="Volver">‹</button>
      <h3>Recordatorios</h3><button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button></div>
    ${!pushSoportado() ? `<p class="cuerpo">${ios && !instalada
        ? "En iPhone los recordatorios funcionan con la app instalada: tocá Compartir → Agregar a inicio, abrila desde ahí y volvé a esta pantalla."
        : "Este navegador no permite recordatorios. Probá con Chrome, o instalando la app."}</p>`
    : `
    <label class="interruptor">
      <input type="checkbox" id="rc-activo" ${r.activo ? "checked" : ""}>
      <span><b>Avisarme para entrenar</b><small>Un aviso por día como mucho, solo cuando sirve.</small></span>
    </label>
    <div id="rc-opciones" ${r.activo ? "" : "hidden"}>
      <label class="lbl" style="margin-top:16px">¿A qué hora?</label>
      <div class="chips" id="rc-hora">${[7, 8, 9, 12, 17, 18, 19, 20, 21].map(h =>
        `<button class="chipx${r.hora === h ? " activo" : ""}" data-h="${h}">${String(h).padStart(2, "0")}:00</button>`).join("")}</div>
      <label class="lbl" style="margin-top:12px">¿Cuándo?</label>
      <label class="interruptor chico"><input type="checkbox" id="rc-toca" ${r.tocaHoy !== false ? "checked" : ""}>
        <span><b>Los días que te toca</b><small>"Hoy te toca entrenar: te faltan 2 para cumplir la semana."</small></span></label>
      <label class="interruptor chico"><input type="checkbox" id="rc-faltas" ${r.faltas !== false ? "checked" : ""}>
        <span><b>Si pasan varios días sin entrenar</b><small>"Hace 4 días que no entrenás. Volvé suave."</small></span></label>
    </div>
    ${bloqueado ? `<p class="sm" style="color:var(--aviso);margin:14px 0 0">Las notificaciones están bloqueadas para Nivora Fit en este navegador. Habilitalas en la configuración del sitio y volvé a intentar.</p>` : ""}
    <button class="btn block" id="rc-guardar" style="margin-top:18px">Guardar</button>
    <p class="sm muted" style="margin:10px 0 0">Si ese día ya entrenaste o ya cumpliste la meta de la semana, no te molestamos.</p>`}`);

  document.getElementById("volver").onclick = abrirAjustes;
  if (!pushSoportado()) return;

  let hora = r.hora || 18;
  const activo = document.getElementById("rc-activo");
  activo.onchange = () => { document.getElementById("rc-opciones").hidden = !activo.checked; };
  document.querySelectorAll("#rc-hora [data-h]").forEach(b => b.onclick = () => {
    hora = Number(b.dataset.h);
    document.querySelectorAll("#rc-hora [data-h]").forEach(o => o.classList.toggle("activo", o === b));
  });

  document.getElementById("rc-guardar").onclick = async e => {
    const boton = e.target;
    boton.disabled = true; boton.textContent = "Guardando…";
    const nuevo = { activo: activo.checked, hora, tocaHoy: document.getElementById("rc-toca").checked, faltas: document.getElementById("rc-faltas").checked };
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (nuevo.activo) {
        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") throw new Error("permiso");
        if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveUint8(CONFIG.VAPID_PUBLIC_KEY) });
        await llamarPush({ accion: "guardar", suscripcion: sub.toJSON(), zona: Intl.DateTimeFormat().resolvedOptions().timeZone, ...nuevo });
      } else if (sub) {
        await llamarPush({ accion: "borrar", endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      S.perfil.recordatorios = nuevo;
      guardar();
      toast(nuevo.activo ? `Listo: te avisamos a las ${String(hora).padStart(2, "0")}:00.` : "Recordatorios apagados.");
      abrirAjustes();
    } catch (err) {
      toast(err.message === "permiso" ? "Sin permiso para notificaciones: habilitalo en el navegador." : "No se pudo guardar. Probá de nuevo.");
      boton.disabled = false; boton.textContent = "Guardar";
    }
  };
}
