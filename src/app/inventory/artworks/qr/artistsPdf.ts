/* Catálogo de artistas en un solo PDF: una tarjeta por artista con su nombre,
   una obra destacada y el QR a su página ("Conozca más obras aquí").
   Varias tarjetas por hoja (con líneas de corte) o una por hoja. */
import {
  PDFDocument, rgb, pushGraphicsState, popGraphicsState, rectangle, clip, endPath,
  type PDFFont, type PDFImage, type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { clean, pageSizePt, qrPages, textWidth, wrap, type F, type PdfAssets } from "./labelsPdf";
import type { Paper } from "./labelsHtml";

export type ArtistCard = {
  name: string;
  pavilion?: string;
  count: number;
  qrText: string;
  featured?: { title: string; technique?: string; dimensions?: string; /** Ya formateado ("$ 2.500.000 COP"). */ price?: string };
  /** JPG o PNG de la obra destacada (si no carga, va un recuadro vacío). */
  image?: Uint8Array;
};
export type CardOpts = {
  cols: number; rows: number; paper: Paper; landscape: boolean;
  /** Portada: primera hoja con el logo, título y un mosaico de obras. */
  cover?: { event: string; pavilion?: string; artists: number; works: number };
};

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
  doc.setTitle(`Catálogo de artistas${o.cover?.pavilion ? ` · ${o.cover.pavilion}` : ""} · Feria del Millón`);
  const mk = async (bytes: Uint8Array): Promise<F> => {
    const font = await doc.embedFont(bytes, { subset: true });
    return { font, chars: new Set(font.getCharacterSet()) };
  };
  const [anton, reg, med, semi] = await Promise.all([mk(assets.anton), mk(assets.regular), mk(assets.medium), mk(assets.semibold)]);
  const logo: PDFImage | null = assets.logo ? await doc.embedPng(assets.logo) : null;
  const qrs = await qrPages(doc, [...new Set(cards.map((c) => c.qrText))]);

  const P = pageSizePt(o);
  const cols = Math.max(1, o.cols), rows = Math.max(1, o.rows);
  const gridW = P.w - P.margin * 2, gridH = P.h - P.margin * 2;
  const W = gridW / cols, H = gridH / rows;
  const u = Math.min(W, H) / 100;
  const pad = 5 * u;
  const wide = W / H > 1.25; // tarjeta apaisada: obra a la izquierda, datos a la derecha

  // Una vez por imagen: la portada y la tarjeta usan la misma.
  const embedded = new Map<Uint8Array, PDFImage | null>();
  const embedImage = async (b?: Uint8Array) => {
    if (!b || b.length < 4) return null;
    if (embedded.has(b)) return embedded.get(b)!;
    let img: PDFImage | null = null;
    try {
      if (b[0] === 0xff && b[1] === 0xd8) img = await doc.embedJpg(b);
      else if (b[0] === 0x89 && b[1] === 0x50) img = await doc.embedPng(b);
    } catch { /* imagen dañada: recuadro vacío */ }
    embedded.set(b, img);
    return img;
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

    // Obra destacada encajada (sin recortar) en el recuadro; debajo, ficha y precio.
    const drawArt = (x: number, top: number, w: number, h: number) => {
      const cap = caption ? fit(reg, caption, 3 * u, w, 2) : { ls: [], size: 0 };
      const price = c.featured?.price ? fit(semi, c.featured.price, 4.6 * u, w, 1) : { ls: [], size: 0 };
      const capH = cap.ls.length * cap.size * 1.15 + (cap.ls.length ? 1.5 * u : 0) + (price.ls.length ? price.size * 1.2 + 0.6 * u : 0);
      const boxH = Math.max(0, h - capH);
      if (img) {
        const k = Math.min(w / img.width, boxH / img.height);
        const iw = img.width * k, ih = img.height * k;
        page.drawImage(img, { x: x + (w - iw) / 2, y: top - boxH + (boxH - ih) / 2, width: iw, height: ih });
      } else {
        page.drawRectangle({ x, y: top - boxH, width: w, height: boxH, color: HOLE });
      }
      const t = lines(page, reg.font, cap.ls, cap.size, x, w, top - boxH - 1.5 * u, SOFT);
      lines(page, semi.font, price.ls, price.size, x, w, t - 0.6 * u, INK);
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

    const foot = (x: number, w: number, bottom: number, qrSize: number) => {
      const qr = qrs.get(c.qrText);
      const hl = "CONOZCA MÁS OBRAS AQUÍ";
      const sub = `Escanee el código y vea ${c.count === 1 ? "su obra" : `sus ${c.count} obras`}`;
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
      // QR justo debajo del nombre (no pegado abajo) y los textos debajo del QR.
      const top = head(colX, yTop - pad, colW, 9 * u) - 3 * u;
      const qrSize = Math.max(0, Math.min(colW * 0.75, top - (yTop - H + pad) - 16 * u));
      const qr = qrs.get(c.qrText);
      if (qr) page.drawPage(qr, { x: colX + (colW - qrSize) / 2, y: top - qrSize, width: qrSize, height: qrSize });
      const hs = fit(anton, "CONOZCA MÁS OBRAS AQUÍ", 6 * u, colW, 1);
      const sub = fit(reg, `Escanee el código y vea ${c.count === 1 ? "su obra" : `sus ${c.count} obras`}`, 3.2 * u, colW, 2);
      const t = lines(page, anton.font, hs.ls, hs.size, colX, colW, top - qrSize - 2 * u, INK, 1.12);
      lines(page, reg.font, sub.ls, sub.size, colX, colW, t - 1 * u, SOFT);
    } else {
      const top = head(x0 + pad, yTop - pad, IW, 9 * u);
      const qrSize = Math.min(24 * u, IW * 0.35);
      const footTop = foot(x0 + pad, IW, yTop - H + pad, qrSize);
      drawArt(x0 + pad, top - 2.5 * u, IW, top - 2.5 * u - footTop - 3 * u);
    }
  };

  // ── Portada: logo grande, título y mosaico con obras de los artistas ──
  if (o.cover) {
    const page = doc.addPage([P.w, P.h]);
    page.drawRectangle({ x: 0, y: 0, width: P.w, height: P.h, color: BG });
    const U = Math.min(P.w, P.h) / 100;
    const m = 7 * U;
    const leftW = P.w * 0.44 - m;
    let y = P.h - m;
    if (logo) {
      const lw = Math.min(leftW * 0.6, 32 * U), lh = Math.min((lw * logo.height) / logo.width, 22 * U);
      page.drawImage(logo, { x: m, y: y - lh, width: (lh * logo.width) / logo.height, height: lh });
      y -= lh + 5 * U;
    }
    const left = (f: F, s: string, size: number, color = INK, max = 3, lh = 1.08) => {
      const r = fit(f, s, size, leftW, max);
      for (const l of r.ls) { page.drawText(l, { x: m, y: y - r.size * 0.8, size: r.size, font: f.font, color }); y -= r.size * lh; }
    };
    // Título en dos líneas del mismo tamaño, el mayor que quepa en el ancho.
    const tSize = Math.min(13 * U, leftW / Math.max(textWidth(anton.font, "CATÁLOGO", 1), textWidth(anton.font, "DE ARTISTAS", 1)));
    left(anton, "CATÁLOGO", tSize, INK, 1, 1.02);
    left(anton, "DE ARTISTAS", tSize, INK, 1, 1.02);
    y -= 2 * U;
    page.drawRectangle({ x: m, y: y - 0.6 * U, width: 18 * U, height: 0.9 * U, color: INK });
    y -= 5 * U;
    left(med, o.cover.event, 4.6 * U, INK, 2, 1.2);
    if (o.cover.pavilion) { y -= 1 * U; left(semi, o.cover.pavilion.toUpperCase(), 5.4 * U, INK, 2, 1.2); }
    y -= 1.5 * U;
    left(reg, `${o.cover.artists} artistas · ${o.cover.works} obras`, 3.8 * U, SOFT, 1, 1.2);
    // Pie: cómo se usa.
    const foot = fit(reg, "Escanee el código QR de cada artista para ver y comprar todas sus obras.", 3.2 * U, leftW, 2);
    let fy = m + foot.ls.length * foot.size * 1.2;
    for (const l of foot.ls) { page.drawText(l, { x: m, y: fy - foot.size * 0.8, size: foot.size, font: reg.font, color: SOFT }); fy -= foot.size * 1.2; }

    // Mosaico 3 × 2 a la derecha, recortado a cada casilla (como fotos de catálogo).
    const pics: PDFImage[] = [];
    for (const c of cards) {
      if (pics.length >= 6) break;
      const img = await embedImage(c.image);
      if (img) pics.push(img);
    }
    const gx = P.w * 0.47, gw = P.w - gx - m, gh = P.h - m * 2, gap = 1.6 * U;
    const mc = 3, mr = 2;
    const cw = (gw - gap * (mc - 1)) / mc, ch = (gh - gap * (mr - 1)) / mr;
    for (let i = 0; i < mc * mr; i++) {
      const cx = gx + (i % mc) * (cw + gap), cy = P.h - m - Math.floor(i / mc) * (ch + gap) - ch;
      const img = pics[i % Math.max(1, pics.length)];
      if (!img) { page.drawRectangle({ x: cx, y: cy, width: cw, height: ch, color: HOLE }); continue; }
      const k = Math.max(cw / img.width, ch / img.height);
      const iw = img.width * k, ih = img.height * k;
      page.pushOperators(pushGraphicsState(), rectangle(cx, cy, cw, ch), clip(), endPath());
      page.drawImage(img, { x: cx + (cw - iw) / 2, y: cy + (ch - ih) / 2, width: iw, height: ih });
      page.pushOperators(popGraphicsState());
    }
  }

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
