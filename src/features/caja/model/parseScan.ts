// Lo que lee la caja (cámara o teclado) → qué buscar.
// QR de obra:    <tienda>/obra/<id>          (cualquier dominio: hay QR viejos impresos)
// QR de copia:   <tienda>/obra/<id>?c=4      (etiqueta de la copia 4)
// QR de artista: <tienda>/artista/<id>
// Código de copia: FDM25-XXXXXX-01-0004 → obra FDM25-XXXXXX-01, copia 4.
// Lo demás (slug, título, código a medias) va como texto al buscador.

export type ScanTarget =
  | { kind: "artwork"; id: string; copy?: number }
  | { kind: "artist"; id: string }
  | { kind: "code"; prefix: string; copy: number }
  | { kind: "text"; q: string };

const OBJECT_ID = /^[a-f\d]{24}$/i;
const QR_PATH = /\/(obra|artista)\/([a-f\d]{24})(?:[/?#]|$)/i;
const COPY_PARAM = /[?&]c=(\d{1,4})(?:[&#]|$)/;
const COPY_CODE = /^([A-Z0-9]+-[A-Z0-9]+-\d{2})-(\d{4})$/i;

const positive = (s: string) => (Number(s) > 0 ? Number(s) : undefined);

export function parseScan(raw: string): ScanTarget {
  const s = raw.trim();
  const m = s.match(QR_PATH);
  if (m) {
    if (m[1].toLowerCase() !== "obra") return { kind: "artist", id: m[2] };
    const copy = positive(s.match(COPY_PARAM)?.[1] ?? "");
    return copy ? { kind: "artwork", id: m[2], copy } : { kind: "artwork", id: m[2] };
  }
  if (OBJECT_ID.test(s)) return { kind: "artwork", id: s };
  const c = s.match(COPY_CODE);
  if (c && positive(c[2])) return { kind: "code", prefix: c[1].toUpperCase(), copy: Number(c[2]) };
  return { kind: "text", q: s };
}

/**
 * Código impreso en la etiqueta de cada copia: el de la obra con el número de
 * copia al final (FDM25-XXXXXX-01-0001 → …-0004). Sin código de obra, nada.
 */
export function copyCode(tagId: string | undefined, n: number): string | undefined {
  if (!tagId) return undefined;
  const m = tagId.match(/^(.*-\d{2})-\d{4}$/);
  return m ? `${m[1]}-${String(n).padStart(4, "0")}` : tagId;
}

/** QR de la etiqueta de la copia n (la tienda ignora ?c; la caja lo lee). */
export const copyUrl = (base: string, id: string, n: number) => `${base}/obra/${id}?c=${n}`;
