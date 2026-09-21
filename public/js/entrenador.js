"use strict";
/* ============================================================
   entrenador.js — el chat con el entrenador de IA
   La app no habla con el modelo: manda el mensaje a una función de Netlify,
   que valida quién sos y se lo pasa al flujo de n8n. La memoria de la
   conversación la guarda n8n; el hilo que ves acá sale de Supabase.
   ============================================================ */

const Chat = { mensajes: [], cargado: false, enviando: false };

async function cargarHistorial() {
  if (Chat.cargado || !Cuenta.usuario) return;
  const { data } = await SB.from("chat_mensajes")
    .select("rol, texto, creado")
    .eq("usuario_id", Cuenta.usuario.id)
    .order("creado", { ascending: true })
    .limit(60);
  Chat.mensajes = data || [];
  Chat.cargado = true;
}

function abrirEntrenador() {
  abrirSheet(`
    <div class="sheet-head">
      <h3>Tu entrenador</h3>
      <button class="xbtn" id="sheet-close" aria-label="Cerrar">✕</button>
    </div>
    <div class="chat" id="chat-hilo"></div>
    <div class="chat-sug" id="chat-sug"></div>
    <form class="chat-form" id="chat-form">
      <input id="chat-input" placeholder="Preguntale lo que quieras" autocomplete="off" aria-label="Tu mensaje">
      <button class="btn" id="chat-enviar" type="submit" aria-label="Enviar">→</button>
    </form>
    <p class="sm muted" style="margin:10px 0 0">Conoce tu perfil, tus medidas y tus últimos entrenamientos,
    y se acuerda de lo que hablaron antes. No reemplaza a un médico ni a un nutricionista.</p>`);

  document.getElementById("chat-form").onsubmit = e => { e.preventDefault(); enviarMensaje(); };
  cargarHistorial().then(pintarChat);
  pintarChat();
}

function pintarChat() {
  const hilo = document.getElementById("chat-hilo");
  if (!hilo) return;
  if (!Chat.mensajes.length && !Chat.enviando) {
    const nombre = S.perfil && S.perfil.nombre ? S.perfil.nombre.split(" ")[0] : "";
    hilo.innerHTML = `<div class="chat-vacio">
      <p><b>Hola${nombre ? " " + esc(nombre) : ""}.</b> Soy tu entrenador. Ya vi tu perfil, tus medidas
      y lo que venís entrenando, así que podés preguntarme directo.</p></div>`;
  } else {
    hilo.innerHTML = Chat.mensajes.map(m =>
      `<div class="burbuja ${m.rol === "usuario" ? "mia" : "suya"}">${formatearTexto(m.texto)}</div>`).join("") +
      (Chat.enviando ? `<div class="burbuja suya escribiendo"><i></i><i></i><i></i></div>` : "");
  }
  const sug = document.getElementById("chat-sug");
  if (sug) {
    sug.innerHTML = (Chat.mensajes.length ? SUGERENCIAS_SEGUIR : SUGERENCIAS_INICIO)
      .map(s => `<button type="button" data-sug="${esc(s)}">${esc(s)}</button>`).join("");
    sug.querySelectorAll("[data-sug]").forEach(b => {
      b.onclick = () => { document.getElementById("chat-input").value = b.dataset.sug; enviarMensaje(); };
    });
  }
  hilo.scrollTop = hilo.scrollHeight;
}

const SUGERENCIAS_INICIO = [
  "¿Cómo voy con mi objetivo?",
  "Me duele la rodilla, ¿qué cambio?",
  "¿Qué como después de entrenar?",
  "No tengo tiempo hoy, ¿qué hago?"
];
const SUGERENCIAS_SEGUIR = [
  "¿Por qué ese ejercicio?",
  "Dame una alternativa",
  "¿Estoy progresando bien?",
  "Explicámelo más simple"
];

/* Markdown mínimo: negrita, itálica y saltos de línea. Nada de HTML crudo. */
function formatearTexto(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|\s)\*(\S[^*]*?)\*/g, "$1<i>$2</i>")
    .replace(/\n/g, "<br>");
}

async function enviarMensaje() {
  const input = document.getElementById("chat-input");
  if (!input || Chat.enviando) return;
  const texto = input.value.trim();
  if (!texto) return;
  input.value = "";
  Chat.mensajes.push({ rol: "usuario", texto, creado: new Date().toISOString() });
  Chat.enviando = true;
  pintarChat();

  try {
    const { data: { session } } = await SB.auth.getSession();
    const r = await fetch("/.netlify/functions/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + session.access_token },
      body: JSON.stringify({ mensaje: texto })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ("http-" + r.status));
    Chat.mensajes.push({ rol: "entrenador", texto: j.respuesta, creado: new Date().toISOString() });
  } catch (e) {
    Chat.mensajes.push({
      rol: "entrenador",
      texto: ({
        sesion: "Tu sesión venció. Cerrá sesión desde Tu cuenta y volvé a entrar.",
        perfil: "No encuentro tu perfil en el servidor. Probá cerrar sesión y volver a entrar.",
        acceso: "El entrenador está disponible durante la prueba gratis o con la suscripción activa.",
        n8n: "El entrenador no está respondiendo en este momento. Probá de nuevo en unos minutos."
      })[e.message] || "Ahora mismo no puedo responderte (" + e.message + "). Probá de nuevo en un momento.",
      creado: new Date().toISOString()
    });
  } finally {
    Chat.enviando = false;
    pintarChat();
  }
}
