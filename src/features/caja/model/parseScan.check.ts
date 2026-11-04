// node --experimental-strip-types src/features/caja/model/parseScan.check.ts
import assert from "node:assert/strict";
import { parseScan } from "./parseScan.ts";

const id = "6a8f047389557092824e5797";
assert.deepEqual(parseScan(`https://feriadelmillon.com/obra/${id}`), { kind: "artwork", id });
assert.deepEqual(parseScan(`https://x.vercel.app/obra/${id}?utm=qr`), { kind: "artwork", id });
assert.deepEqual(parseScan(`https://feriadelmillon.com/artista/${id}/`), { kind: "artist", id });
assert.deepEqual(parseScan(` ${id} `), { kind: "artwork", id });
assert.deepEqual(parseScan("FDM25-ABC123"), { kind: "text", q: "FDM25-ABC123" });
assert.deepEqual(parseScan("https://feriadelmillon.com/obra/no-es-id"), { kind: "text", q: "https://feriadelmillon.com/obra/no-es-id" });
console.log("parseScan ok");
