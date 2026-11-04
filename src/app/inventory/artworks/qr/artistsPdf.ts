/* Catálogo de artistas en un solo PDF: una tarjeta por artista con su nombre,
   una obra destacada y el QR a su página ("Conozca más obras aquí").
   Varias tarjetas por hoja (con líneas de corte) o una por hoja. */
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { clean, pageSizePt, qrPages, textWidth, wrap, type F, type PdfAssets } from "./labelsPdf";
import type { Paper } from "./labelsHtml";

export type ArtistCard = {
  name: string;
  pavilion?: string;
  count: number;
  qrText: string;
  featured?: { title: string; technique?: string; dimensions?: string };
  /** JPG o PNG de la obra destacada (si no carga, va un recuadro vacío). */
  image?: Uint8Array;
};
export type CardOpts = { cols: number; rows: number; paper: Paper; landscape: boolean };

const INK = rgb(0x11 / 255, 0x11 / 255, 0x11 / 255);
const SOFT = rgb(0x55 / 255, 0x55 / 255, 0x55 / 255);
const BG = rgb(0xe8 / 255, 0xe4 / 255, 0xe0 / 255);
const HOLE = rgb(0xd6 / 255, 0xd0 / 255, 0xcc / 255);
const LINE = rgb(0x33 / 255, 0x33 / 255, 0x33 / 255);

export async function buildArtistsPdf(
  cards: ArtistCard[],
  o: CardOpts,
  assets: PdfAssets,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("Catálogo de artistas · Feria del Millón");
  const mk = async (bytes: Uint8Array): Promise<F> => {
    const font = await doc.embedFont(bytes, { subset: true });
    return { font, chars: new Set(font.getCharacterSet()) };
  };
  const [anton, reg] = await Promise.all([mk(assets.anton), mk(assets.regular)]);
  const logo: PDFImage | null = assets.logo ? await doc.embedPng(assets.logo) : null;
  const qrs = await qrPages(doc, [...new Set(cards.map((c) => c.qrText))]);

  const P = pageSizePt(o);
  const cols = Math.max(1, o.cols), rows = Math.max(1, o.rows);
  const gridW = P.w - P.margin * 2, gridH = P.h - P.margin * 2;
  const W = gridW / cols, H = gridH / rows;
  const u = Math.min(W, H) / 100;
  const pad = 5 * u;
  const wide = W / H > 1.25; // tarjeta apaisada: obra a la izquierda, datos a la derecha

  const embedImage = async (b?: Uint8Array) => {
    if (!b || b.length < 4) return null;
    try {
      if (b[0] === 0xff && b[1] === 0xd8) return await doc.embedJpg(b);
      if (b[0] === 0x89 && b[1] === 0x50) return await doc.embedPng(b);
    } catch { /* imagen dañada: recuadro vacío */ }
    return null;
  };

  /** Texto centrado en [x, x+w]; devuelve el y de la siguiente línea. */
  const lines = (page: PDFPage, f: PDFFont, ls: string[], size: number, x: number, w: number, top: number, color = INK, lh = 1.15) => {
    for (const l of ls) {
      page.drawText(l, { x: x + (w - textWidth(f, l, size)) / 2, y: top - size * 0.8, size, font: f, color });
      top -= size * lh;
    }
    return top;
  };
  /** Achica hasta que quepa en `max` líneas. */
  const fit = (f: F, s: string, size: number, w: number, max: number) => {
    const t = clean(f, s);
    let ls = wrap(f.font, t, size, w);
    while (ls.length > max && size > 4) ls = wrap(f.font, t, (size *= 0.92), w);
    return { ls: ls.slice(0, max), size };
  };

  const drawCard = async (page: PDFPage, c: ArtistCard, x0: number, yTop: number) => {
    const img = await embedImage(c.image);
    const caption = c.featured
      ? [c.featured.title, [c.featured.technique, c.featured.dimensions].filter(Boolean).join(" · ")].filter(Boolean).join(" — ")
      : "";

    // Obra destacada encajada (sin recortar) en el recuadro.
    const drawArt = (x: number, top: number, w: number, h: number) => {
      const cap = caption ? fit(reg, caption, 3 * u, w, 2) : { ls: [], size: 0 };
      const capH = cap.ls.length * cap.size * 1.15 + (cap.ls.length ? 1.5 * u : 0);
      const boxH = Math.max(0, h - capH);
      if (img) {
        const k = Math.min(w / img.width, boxH / img.height);
        const iw = img.width * k, ih = img.height * k;
        page.drawImage(img, { x: x + (w - iw) / 2, y: top - boxH + (boxH - ih) / 2, width: iw, height: ih });
      } else {
        page.drawRectangle({ x, y: top - boxH, width: w, height: boxH, color: HOLE });
      }
      lines(page, reg.font, cap.ls, cap.size, x, w, top - boxH - 1.5 * u, SOFT);
    };

    const head = (x: number, top: number, w: number, nameSize: number) => {
      if (logo) {
        const lw = Math.min(w * 0.4, 22 * u), lh = (lw * logo.height) / logo.width;
        page.drawImage(logo, { x: x + (w - lw) / 2, y: top - lh, width: lw, height: lh });
        top -= lh + 2.5 * u;
      }
      const n = fit(anton, c.name.toUpperCase(), nameSize, w, 2);
      top = lines(page, anton.font, n.ls, n.size, x, w, top, INK, 1.12);
      if (c.pavilion) top = lines(page, reg.font, fit(reg, c.pavilion, 3.4 * u, w, 1).ls, 3.4 * u, x, w, top - 0.8 * u, SOFT);
      return top;
    };

    const foot = (x: number, w: number, bottom: number, qrSize: number, stacked: boolean) => {
      const qr = qrs.get(c.qrText);
      const hl = "CONOZCA MÁS OBRAS AQUÍ";
      const sub = `Escanee el código y vea ${c.count === 1 ? "su obra" : `sus ${c.count} obras`}`;
      if (stacked) {
        // QR arriba, textos debajo, todo centrado.
        const hs = fit(anton, hl, 6 * u, w, 1), ss = fit(reg, sub, 3.2 * u, w, 2);
        const textH = hs.ls.length * hs.size * 1.12 + 1 * u + ss.ls.length * ss.size * 1.15;
        let t = bottom + textH;
        t = lines(page, anton.font, hs.ls, hs.size, x, w, t, INK, 1.12);
        lines(page, reg.font, ss.ls, ss.size, x, w, t - 1 * u, SOFT);
        if (qr) page.drawPage(qr, { x: x + (w - qrSize) / 2, y: bottom + textH + 2 * u, width: qrSize, height: qrSize });
        return bottom + textH + 2 * u + qrSize;
      }
      // QR a la izquierda, textos a la derecha.
      if (qr) page.drawPage(qr, { x, y: bottom, width: qrSize, height: qrSize });
      const tx = x + qrSize + 3 * u, tw = w - qrSize - 3 * u;
      const hs = fit(anton, hl, 6 * u, tw, 2), ss = fit(reg, sub, 3.2 * u, tw, 3);
      const textH = hs.ls.length * hs.size * 1.12 + 1 * u + ss.ls.length * ss.size * 1.15;
      let t = bottom + (qrSize + textH) / 2;
      const left = (f: PDFFont, ls: string[], size: number, color = INK, lh = 1.15) => {
        for (const l of ls) { page.drawText(l, { x: tx, y: t - size * 0.8, size, font: f, color }); t -= size * lh; }
      };
      left(anton.font, hs.ls, hs.size, INK, 1.12);
      t -= 1 * u;
      left(reg.font, ss.ls, ss.size, SOFT);
      return bottom + qrSize;
    };

    const IW = W - pad * 2;
    if (wide) {
      const artW = (W - pad * 3) * 0.6, colW = W - pad * 3 - artW, colX = x0 + pad * 2 + artW;
      drawArt(x0 + pad, yTop - pad, artW, H - pad * 2);
      const top = head(colX, yTop - pad, colW, 9 * u);
      const qrSize = Math.max(0, Math.min(colW * 0.75, top - (yTop - H + pad) - 24 * u));
      foot(colX, colW, yTop - H + pad, qrSize, true);
    } else {
      const top = head(x0 + pad, yTop - pad, IW, 9 * u);
      const qrSize = Math.min(24 * u, IW * 0.35);
      const footTop = foot(x0 + pad, IW, yTop - H + pad, qrSize, false);
      drawArt(x0 + pad, top - 2.5 * u, IW, top - 2.5 * u - footTop - 3 * u);
    }
  };

  const per = cols * rows;
  const total = Math.ceil(cards.length / per);
  for (let i = 0; i < cards.length; i += per) {
    const page = doc.addPage([P.w, P.h]);
    page.drawRectangle({ x: P.margin, y: P.h - P.margin - gridH, width: gridW, height: gridH, color: BG });
    const chunk = cards.slice(i, i + per);
    for (const [j, c] of chunk.entries()) {
      await drawCard(page, c, P.margin + (j % cols) * W, P.h - P.margin - Math.floor(j / cols) * H);
    }
    // Líneas de corte (con una por hoja queda solo el marco).
    const t = 0.3 * (72 / 25.4);
    for (let c = 0; c <= cols; c++)
      page.drawLine({ start: { x: P.margin + c * W, y: P.h - P.margin }, end: { x: P.margin + c * W, y: P.h - P.margin - gridH }, thickness: t, color: LINE });
    for (let r = 0; r <= rows; r++)
      page.drawLine({ start: { x: P.margin, y: P.h - P.margin - r * H }, end: { x: P.margin + gridW, y: P.h - P.margin - r * H }, thickness: t, color: LINE });
    onProgress?.(i / per + 1, total);
    await new Promise((ok) => setTimeout(ok, 0));
  }
  return doc.save({ useObjectStreams: false });
}
