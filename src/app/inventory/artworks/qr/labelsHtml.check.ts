// node --experimental-strip-types src/app/inventory/artworks/qr/labelsHtml.check.ts
import assert from "node:assert/strict";
import { buildLabelsHtml, labelSize } from "./labelsHtml.ts";

const opts = { cols: 6, rows: 3, landscape: true, paper: "pliego" as const, showQr: false, priceBox: false, logoUrl: "" };
const s = labelSize(opts);
assert.equal(s.pw, 470); // 480 − 2 × 5 mm de margen
assert.equal(s.ph, 318);
assert.ok(s.w > 78 && s.w < 79 && s.h > 105 && s.h < 107, JSON.stringify(s)); // ~7,8 × 10,6 cm

const items = Array.from({ length: 19 }, (_, i) => ({ artist: "A", title: `Obra ${i}`, n: 1, total: 1, code: `C${i}` }));
const html = buildLabelsHtml(items, opts);
assert.match(html, /@page \{ size: 480mm 330mm; margin: 5mm; \}/);
assert.equal((html.match(/<section class="page">/g) || []).length, 2); // 18 + 1
assert.equal(html.split('<section class="page">')[1].split('class="l"').length - 1, 18);

assert.match(buildLabelsHtml(items, { ...opts, paper: "letter", cols: 4 }), /size: letter landscape/);
// Nada se recorta: sin límite de líneas en el título y el código puede bajar de línea.
assert.doesNotMatch(html, /line-clamp/);
assert.match(html, /\.row \{[^}]*flex-wrap: wrap/);
assert.doesNotMatch(html, /\.c \{[^}]*nowrap/);
// Como la del año pasado: serie → QR (siempre) → casilla de precio abajo (siempre, aunque no se pida).
const withQr = buildLabelsHtml([{ ...items[0], qr: "data:image/png;base64,AA==" }], { ...opts, showQr: false, priceBox: false });
const iSerie = withQr.indexOf("Serie:"), iQr = withQr.indexOf('class="qr"'), iPrecio = withQr.indexOf("Precio:");
assert.ok(iSerie > 0 && iQr > iSerie && iPrecio > iQr, `orden serie(${iSerie}) < qr(${iQr}) < precio(${iPrecio})`);
console.log("ok");
