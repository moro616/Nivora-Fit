/* ============================================================
   clima.js — el pronóstico para salir a entrenar
   Pasa por acá (y no directo desde el teléfono) para:
   - identificarnos ante MET Norway como pide su política de uso;
   - no exponer la IP de la persona a un tercero;
   - cachear: el mismo pedido no se repite por 20 minutos.
   La ubicación llega redondeada a ~1 km y no se guarda en ningún lado.
   Datos: MET Norway (api.met.no), licencia CC BY 4.0, uso comercial permitido.
   ============================================================ */
const { json } = require("../lib/comun");

const cache = new Map();

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const lat = Number(q.lat), lon = Number(q.lon);
  if (!isFinite(lat) || !isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return json(400, { error: "coordenadas" });
  const la = lat.toFixed(2), lo = lon.toFixed(2);
  const clave = la + "," + lo;

  const guardado = cache.get(clave);
  if (guardado && Date.now() - guardado.t < 20 * 60 * 1000) return respuesta(guardado.d);

  try {
    const r = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${la}&lon=${lo}`, {
      headers: { "User-Agent": "NivoraFit/1.0 (+https://nivorafit.netlify.app; soporte Nivora Fit)" }
    });
    if (!r.ok) throw new Error("met.no " + r.status);
    const j = await r.json();
    const serie = (j.properties && j.properties.timeseries) || [];
    const horas = serie.slice(0, 13).map(t => {
      const d = t.data.instant.details;
      const sig = t.data.next_1_hours || t.data.next_6_hours || {};
      return {
        hora: t.time,
        temp: d.air_temperature,
        viento: d.wind_speed,
        humedad: d.relative_humidity,
        lluvia: sig.details ? sig.details.precipitation_amount : 0,
        simbolo: sig.summary ? sig.summary.symbol_code : ""
      };
    });
    const d = { horas, actualizado: new Date().toISOString() };
    cache.set(clave, { t: Date.now(), d });
    if (cache.size > 500) cache.delete(cache.keys().next().value);
    return respuesta(d);
  } catch (e) {
    console.error("clima:", e.message);
    return json(502, { error: "clima" });
  }
};

function respuesta(d) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=900" },
    body: JSON.stringify(d)
  };
}
