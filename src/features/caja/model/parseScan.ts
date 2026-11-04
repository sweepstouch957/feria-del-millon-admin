// Lo que lee la caja (cámara o teclado) → qué buscar.
// QR de obra:    <tienda>/obra/<id>     (cualquier dominio: hay QR viejos impresos)
// QR de artista: <tienda>/artista/<id>
// Lo demás (código de etiqueta FDM25-…, slug, título) va como texto al buscador.

export type ScanTarget =
  | { kind: "artwork"; id: string }
  | { kind: "artist"; id: string }
  | { kind: "text"; q: string };

const OBJECT_ID = /^[a-f\d]{24}$/i;
const QR_PATH = /\/(obra|artista)\/([a-f\d]{24})(?:[/?#]|$)/i;

export function parseScan(raw: string): ScanTarget {
  const s = raw.trim();
  const m = s.match(QR_PATH);
  if (m) return { kind: m[1].toLowerCase() === "obra" ? "artwork" : "artist", id: m[2] };
  if (OBJECT_ID.test(s)) return { kind: "artwork", id: s };
  return { kind: "text", q: s };
}
