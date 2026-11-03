// node --experimental-strip-types src/app/inventory/artworks/qr/labelsSize.check.ts
// Mide el documento de "todo en un solo PDF" con el volumen real (1.671 obras, 4.521 etiquetas).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { buildLabelsHtml } from "./labelsHtml.ts";

const QRCode = createRequire(import.meta.url)("qrcode");
const t0 = Date.now();
const qrs: string[] = [];
for (let i = 0; i < 1671; i++) {
  const svg = await QRCode.toString(`https://feria-millon.immsai.com/obra/6a${String(i).padStart(22, "0")}`, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  qrs.push(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}
const items = Array.from({ length: 4521 }, (_, i) => ({ artist: "Artista", title: `Obra ${i}`, technique: "Pintura", dimensions: "60 x 60 cm", n: 1, total: 1, code: `FDM25-XXXXXX-01-${i}`, qr: qrs[i % 1671] }));
const html = buildLabelsHtml(items, { cols: 6, rows: 3, landscape: true, paper: "pliego", showQr: true, priceBox: true, logoUrl: "" });
const mb = html.length / 1e6;
console.log(`QR: ${Date.now() - t0} ms · documento: ${mb.toFixed(1)} MB`);
assert.ok(mb < 40, `documento muy pesado: ${mb} MB`);
console.log("ok");
