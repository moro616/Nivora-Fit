/* Genera public/config.js con las variables del entorno de Netlify.
   Así el mismo código sirve para desarrollo y para producción sin editar archivos.
   Va en la carpeta scripts/ del proyecto. */
const fs = require("fs");
const path = require("path");

const cfg = {
  APP_NOMBRE: process.env.APP_NOMBRE || "Nivora Fit",
  URL_APP: process.env.URL_APP || process.env.URL || "http://localhost:8888",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  PRECIO_MENSUAL: Number(process.env.PRECIO_MENSUAL || 10000),
  MONEDA: process.env.MONEDA || "ARS",
  DIAS_PRUEBA: Number(process.env.DIAS_PRUEBA || 7),
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || ""
};

if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
  console.warn("\n  Faltan SUPABASE_URL o SUPABASE_ANON_KEY en las variables de entorno.");
  console.warn("  La app va a cargar pero no va a poder crear cuentas.\n");
}

const salida = "/* Generado automáticamente en el build. No edites este archivo a mano. */\n" +
  "window.CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n";

fs.writeFileSync(path.join(__dirname, "..", "public", "config.js"), salida);
console.log("config.js generado para " + cfg.URL_APP);
