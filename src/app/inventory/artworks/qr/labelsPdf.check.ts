// npx tsx src/app/inventory/artworks/qr/labelsPdf.check.ts [salida.pdf]
// PDF real con el volumen de la feria: hoja EXACTA de 48 × 33 cm, 18 por hoja, todas las copias.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { buildLabelsPdf, MM, wrap } from "./labelsPdf";

const pub = path.resolve("public");
const read = (f: string) => new Uint8Array(fs.readFileSync(path.join(pub, f)));
const assets = {
  anton: read("fonts/Anton-Regular.ttf"),
  regular: read("fonts/SairaCondensed-Regular.ttf"),
  medium: read("fonts/SairaCondensed-Medium.ttf"),
  semibold: read("fonts/SairaCondensed-SemiBold.ttf"),
  logo: read("logo.png"),
};
const opts = { cols: 6, rows: 3, landscape: true, paper: "pliego" as const, showQr: true, priceBox: true, logoUrl: "" };

// 1.671 obras, 4.521 etiquetas (todas las copias), con títulos y códigos largos de verdad.
const items = Array.from({ length: 4521 }, (_, i) => ({
  artist: i % 7 === 0 ? "María Fernanda de los Ángeles Rodríguez-Castellanos" : "Alejandra Rozo",
  title: i % 5 === 0 ? "Un título bastante largo para ver que parte en varias líneas sin cortarse 🎨" : `Encargo ${i}`,
  technique: "Fotografía / Photography",
  dimensions: "54 x 74 cm",
  n: (i % 10) + 1,
  total: 10,
  code: `FDM25-Q1J0QK-01-${String(i).padStart(4, "0")}`,
  qrText: `https://feria-millon.immsai.com/obra/6a${String(i % 1671).padStart(22, "0")}`,
}));

async function main() {
const t0 = Date.now();
const bytes = await buildLabelsPdf(items, opts, assets);
const ms = Date.now() - t0;
const doc = await PDFDocument.load(bytes);
const pages = doc.getPages();
const { width, height } = pages[0].getSize();
console.log(`${pages.length} hojas · ${(bytes.length / 1e6).toFixed(1)} MB · ${ms} ms · hoja ${(width / MM / 10).toFixed(4)} × ${(height / MM / 10).toFixed(4)} cm`);
assert.equal(pages.length, Math.ceil(4521 / 18)); // 252
assert.ok(Math.abs(width - 480 * MM) < 0.001 && Math.abs(height - 330 * MM) < 0.001, `hoja ${width} x ${height} pt`);
assert.ok(pages.every((p) => Math.abs(p.getWidth() - width) < 1e-6 && Math.abs(p.getHeight() - height) < 1e-6));

// Ninguna palabra queda más ancha que su línea.
const reg = await (await PDFDocument.create()).embedStandardFont("Helvetica");
assert.ok(wrap(reg, "FDM25-Q1J0QK-01-0001-MUY-LARGO", 10, 60).every((l) => reg.widthOfTextAtSize(l, 10) <= 60));

if (process.argv[2]) {
  // Muestra corta (2 hojas) para mirarla.
  fs.writeFileSync(process.argv[2], await buildLabelsPdf(items.slice(0, 20), opts, assets));
}
console.log("ok");
}
main().catch((e) => { console.error(e); process.exit(1); });
