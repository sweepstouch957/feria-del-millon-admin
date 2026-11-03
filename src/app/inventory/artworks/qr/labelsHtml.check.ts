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
// Orden: datos → QR (siempre) → serie → casilla de precio abajo (siempre, aunque no se pida).
const withQr = buildLabelsHtml([{ ...items[0], qr: "data:image/png;base64,AA==" }], { ...opts, showQr: false, priceBox: false });
const body = withQr.slice(withQr.indexOf("<body>"));
const iQr = body.indexOf('class="qr '), iSerie = body.indexOf("Serie:"), iPrecio = body.indexOf("Precio:");
assert.ok(iQr > 0 && iSerie > iQr && iPrecio > iSerie, `orden qr(${iQr}) < serie(${iSerie}) < precio(${iPrecio})`);
// El mismo QR en varias copias va una sola vez en el documento.
const copies = buildLabelsHtml([1, 2, 3].map((n) => ({ ...items[0], n, total: 3, qr: "data:image/svg+xml,AAA" })), opts);
assert.equal(copies.split("data:image/svg+xml,AAA").length - 1, 1);
assert.equal(copies.split('class="qr q0"').length - 1, 3);
// Y si no alcanza, se achica la letra (nunca se corta).
assert.match(withQr, /window\.fit = function/);
assert.match(withQr, /var\(--f, 1\)/);
console.log("ok");
