"use strict";
/* ============================================================
   figura.js — el cuerpo de las ilustraciones
   En vez de palitos, una silueta: torso con volumen, brazos y piernas
   con grosor, cabeza y pies. Cada dibujo se arma con las articulaciones
   (hombro, codo, mano, cadera, rodilla, tobillo) y esto las convierte en
   una figura humana. El lado más lejano va más tenue, para dar profundidad.
   ============================================================ */

const XY = p => `${p[0]} ${p[1]}`;

/* El torso: un trapecio de hombros a cadera, más ancho arriba. */
function tronco(hom, cad, ancho) {
  const dx = cad[0] - hom[0], dy = cad[1] - hom[1];
  const largo = Math.hypot(dx, dy) || 1;
  const px = -dy / largo, py = dx / largo;
  const a = (ancho || 1) * 12.5, b = (ancho || 1) * 9.5;
  const q = (p, w, s) => `${(p[0] + px * w * s).toFixed(1)} ${(p[1] + py * w * s).toFixed(1)}`;
  return `<path class="sil" d="M${q(hom, a, 1)} L${q(cad, b, 1)} L${q(cad, b, -1)} L${q(hom, a, -1)} Z"/>`;
}

/* Un miembro de dos tramos: el de arriba más grueso que el de abajo. */
function miembro(desde, med, fin, g1, g2, cls) {
  return `<path class="${cls}" stroke-width="${g1}" d="M${XY(desde)} L${XY(med)}"/>` +
         `<path class="${cls}" stroke-width="${g2}" d="M${XY(med)} L${XY(fin)}"/>`;
}

/* p = { cab, hom, cad, br:[codo, mano], br2, pi:[rodilla, tobillo, punta], pi2, r, ancho } */
function FIG(p) {
  const r = p.r || 9.5;
  const lejos = [];
  if (p.pi2) lejos.push(miembro(p.cad, p.pi2[0], p.pi2[1], 12, 9, "sil-l") +
    (p.pi2[2] ? `<path class="sil-l" stroke-width="6" d="M${XY(p.pi2[1])} L${XY(p.pi2[2])}"/>` : ""));
  if (p.br2) lejos.push(miembro(p.hom, p.br2[0], p.br2[1], 8.5, 7, "sil-l"));

  const cerca = [];
  if (p.pi) cerca.push(miembro(p.cad, p.pi[0], p.pi[1], 12.5, 9.5, "sil-t") +
    (p.pi[2] ? `<path class="sil-t" stroke-width="6.5" d="M${XY(p.pi[1])} L${XY(p.pi[2])}"/>` : ""));
  if (p.br) cerca.push(miembro(p.hom, p.br[0], p.br[1], 9, 7.5, "sil-t"));

  const cuello = p.cab ? `<path class="sil-t" stroke-width="8" d="M${XY(p.hom)} L${XY(p.cab)}"/>` : "";
  const cabeza = p.cab ? `<circle class="sil" cx="${p.cab[0]}" cy="${p.cab[1]}" r="${r}"/>` : "";

  return lejos.join("") + cuello + tronco(p.hom, p.cad, p.ancho) + cabeza + cerca.join("");
}
