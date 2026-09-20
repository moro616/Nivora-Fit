# Nivora Fit

App web de entrenamiento: arma la rutina según tu cuerpo, tu nivel y los días
que puedas ir, con evaluación corporal, guía de cada ejercicio y un entrenador
de IA con memoria. Suscripción mensual con débito automático de Mercado Pago y
7 días de prueba gratis sin tarjeta.

## Cómo está armado

```
public/              lo que ve el usuario (se publica tal cual)
  index.html
  estilos.css
  icono.svg, icono-*.png, manifest.json
  js/
    dibujos.js       las ilustraciones de cada movimiento, dibujadas en SVG
    ejercicios.js    catálogo: músculo, equipo, nivel, cómo se hace, qué cuidar
    cuerpo.js        evaluación corporal: IMC, grasa (Navy), calorías, macros
    motor.js         arma la rutina del día y maneja la progresión de cargas
    interfaz.js      las cinco pantallas, el alta de perfil y los ajustes
    entrenador.js    el chat con el entrenador de IA
    nube.js          cuenta, sincronización y suscripción
    arranque.js      el estado de la app y el encendido
netlify/functions/   el servidor: pagos, webhook de Mercado Pago y chat
scripts/             genera public/config.js en cada build
supabase/schema.sql  base de datos completa, idempotente
n8n/                 el flujo del entrenador de IA
```

`public/config.js` **se genera en el build**, no se versiona. Si abrís la app
sin haber corrido el build, arranca igual en modo local: guarda todo en el
teléfono y no pide cuenta. Sirve para probar la app antes de conectar nada.

## Levantarla en tu máquina

```bash
npm install
npm run dev          # netlify dev, en http://localhost:8888
```

Sin Netlify CLI también sirve cualquier servidor estático sobre `public/`
(`npx serve public`), pero sin las funciones no hay pagos ni chat.

## Publicarla

1. **Supabase** → SQL Editor → pegar `supabase/schema.sql` y correrlo.
2. **Netlify** → conectar el repo de GitHub. Build command y carpeta ya vienen
   en `netlify.toml` (`node scripts/generar-config.js`, publica `public`).
3. **Variables de entorno** en Netlify → Site settings → Environment variables,
   las de `.env.example`. La `SUPABASE_SERVICE_ROLE_KEY` y el
   `MP_ACCESS_TOKEN` van solo ahí: nunca en el repo ni en el navegador.
4. **Mercado Pago** → crear el webhook apuntando a
   `https://tu-dominio/.netlify/functions/webhook-mercadopago` y copiar el
   secreto en `MP_WEBHOOK_SECRET`.
5. **n8n** → importar `n8n/entrenador-ia.json`, poner la URL del webhook y el
   token en las variables de Netlify.

## Decisiones que ya están tomadas

- Un solo plan: $10.000 por mes, débito automático, 7 días de prueba sin tarjeta.
- La app funciona sin conexión y sincroniza cuando vuelve.
- Nada de días fijos: la rotación mira el historial y decide qué toca hoy.
- Las columnas de suscripción las escribe solo el servidor (ver los GRANT del
  schema). Sin eso, cualquiera se pone `activa` desde la consola del navegador.

## Pendiente

- Comprar el dominio y confirmar que el nombre esté libre para registrar.
- Términos y política de privacidad (la app ya los referencia en el alta).
- Envoltorio para Google Play (TWA sobre la PWA).
