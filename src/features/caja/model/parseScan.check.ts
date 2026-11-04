// node --experimental-strip-types src/features/caja/model/parseScan.check.ts
import assert from "node:assert/strict";
import { copyCode, copyUrl, parseScan } from "./parseScan.ts";

const id = "6a8f047389557092824e5797";
assert.deepEqual(parseScan(`https://feriadelmillon.com/obra/${id}`), { kind: "artwork", id });
assert.deepEqual(parseScan(`https://x.vercel.app/obra/${id}?utm=qr`), { kind: "artwork", id });
assert.deepEqual(parseScan(`https://feriadelmillon.com/artista/${id}/`), { kind: "artist", id });
assert.deepEqual(parseScan(` ${id} `), { kind: "artwork", id });
assert.deepEqual(parseScan("FDM25-ABC123"), { kind: "text", q: "FDM25-ABC123" });
assert.deepEqual(parseScan("https://feriadelmillon.com/obra/no-es-id"), { kind: "text", q: "https://feriadelmillon.com/obra/no-es-id" });
// Etiqueta por copia: QR y código llevan el número de la copia; la caja lo recupera.
assert.deepEqual(parseScan(copyUrl("https://feriadelmillon.com", id, 4)), { kind: "artwork", id, copy: 4 });
assert.deepEqual(parseScan(`https://x.com/obra/${id}?utm=qr&c=12`), { kind: "artwork", id, copy: 12 });
assert.deepEqual(parseScan(`https://x.com/obra/${id}?c=0`), { kind: "artwork", id });
assert.equal(copyCode("FDM25-GIGX1G-01-0001", 4), "FDM25-GIGX1G-01-0004");
assert.equal(copyCode("CODIGO-VIEJO", 4), "CODIGO-VIEJO");
assert.equal(copyCode(undefined, 4), undefined);
assert.deepEqual(parseScan("fdm25-gigx1g-01-0004"), { kind: "code", prefix: "FDM25-GIGX1G-01", copy: 4 });
assert.deepEqual(parseScan("FDM25-GIGX1G-01-0000"), { kind: "text", q: "FDM25-GIGX1G-01-0000" });
console.log("parseScan ok");
