/* PDF de etiquetas con la hoja EXACTA (48 × 33 cm = 1360,63 × 935,43 pt).
   "Guardar como PDF" del navegador redondea el papel (salía 48,01 × 32,99 cm) y la
   imprenta lo necesita exacto (Photoshop lo abre con esa medida). Mismo diseño
   que la vista previa (labelsHtml.ts): datos → QR → serie → precio → línea.
   El QR va en vectorial y una sola vez por obra (las copias lo reusan). */
import {
  PDFDocument, rgb, pushGraphicsState, popGraphicsState, setFillingRgbColor, rectangle, fill,
  type PDFEmbeddedPage, type PDFFont, type PDFImage, type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { PAPERS, type LabelItem, type LabelOpts } from "./labelsHtml";

export const MM = 72 / 25.4;

export type PdfAssets = {
  anton: Uint8Array;
  regular: Uint8Array;
  medium: Uint8Array;
  semibold: Uint8Array;
  /** Source Sans 3 (catálogo de artistas, una por hoja). */
  sans?: Uint8Array;
  sansBold?: Uint8Array;
  /** JPG de la portada diseñada del catálogo de artistas (fondo menta parejo). */
  coverImage?: Uint8Array;
  /** PNG del logo con fondo transparente (opcional). */
  logo?: Uint8Array;
};

/** En el PDF el QR se dibuja desde su texto (vectorial); no hace falta la imagen. */
export type PdfLabel = Omit<LabelItem, "qr"> & { qrText?: string; /** Reemplaza "Serie: n / total" (catálogo). */ serieText?: string };

/** Tamaño de página en puntos: exacto, sin redondeos. */
export function pageSizePt(o: Pick<LabelOpts, "landscape" | "paper">) {
  const P = PAPERS[o.paper ?? "letter"];
  return {
    w: (o.landscape ? P.w : P.h) * MM,
    h: (o.landscape ? P.h : P.w) * MM,
    margin: P.margin * MM,
  };
}

const INK = rgb(0x11 / 255, 0x11 / 255, 0x11 / 255);
const PAPER_BG = rgb(0xe8 / 255, 0xe4 / 255, 0xe0 / 255);
const LINE = rgb(0x33 / 255, 0x33 / 255, 0x33 / 255);
const BOX = rgb(0xd6 / 255, 0xd0 / 255, 0xcc / 255);
const RULE = rgb(0x88 / 255, 0x88 / 255, 0x88 / 255);

export type F = { font: PDFFont; chars: Set<number> };
/** Quita lo que la fuente no tiene (emojis, símbolos raros): si no, pdf-lib falla. */
export const clean =(f: F, s: string) =>
  Array.from(String(s ?? "")).filter((c) => f.chars.has(c.codePointAt(0)!) || c === " ").join("");

/* Medir texto con fontkit es lo lento (4.500 etiquetas × varias líneas × varios
   tamaños): el ancho a tamaño 1 se calcula una vez por fuente y texto, y se escala. */
const widthCache = new WeakMap<PDFFont, Map<string, number>>();
export function textWidth(f: PDFFont, s: string, size: number) {
  let m = widthCache.get(f);
  if (!m) widthCache.set(f, (m = new Map()));
  let w = m.get(s);
  if (w === undefined) m.set(s, (w = f.widthOfTextAtSize(s, 1)));
  return w * size;
}

/** Alto de ascendente y total de la fuente, a tamaño 1 (una vez por fuente). */
const metricsCache = new WeakMap<PDFFont, { asc: number; full: number }>();
function metrics(f: PDFFont) {
  let m = metricsCache.get(f);
  if (!m) metricsCache.set(f, (m = { asc: f.heightAtSize(1, { descender: false }), full: f.heightAtSize(1) }));
  return m;
}

/** Parte el texto en líneas que caben en `maxW`; una palabra larga se corta por letras. */
export function wrap(f: PDFFont, text: string, size: number, maxW: number): string[] {
  const width = (s: string) => textWidth(f, s, size);
  const lines: string[] = [];
  let line = "";
  for (let word of text.split(/\s+/).filter(Boolean)) {
    const cand = line ? `${line} ${word}` : word;
    if (width(cand) <= maxW) { line = cand; continue; }
    if (line) lines.push(line);
    while (word.length > 1 && width(word) > maxW) {
      let i = word.length - 1;
      while (i > 1 && width(word.slice(0, i)) > maxW) i--;
      lines.push(word.slice(0, i));
      word = word.slice(i);
    }
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** QR como página vectorial reutilizable: una por obra, se dibuja en cada copia. */
export async function qrPages(doc: PDFDocument, texts: string[]) {
  const scratch = await PDFDocument.create();
  for (const text of texts) {
    const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const page = scratch.addPage([n + 2, n + 2]); // 1 módulo de margen
    // Operadores PDF directos (un rectángulo por tramo negro de cada fila y un solo
    // relleno): 4× más rápido que pasar por drawRectangle/drawSvgPath.
    const ops = [pushGraphicsState(), setFillingRgbColor(0, 0, 0)];
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!qr.modules.get(r, c)) { c++; continue; }
        let run = 1;
        while (c + run < n && qr.modules.get(r, c + run)) run++;
        ops.push(rectangle(1 + c, n - r, run, 1));
        c += run;
      }
    }
    ops.push(fill(), popGraphicsState());
    page.pushOperators(...ops);
  }
  const embedded = texts.length ? await doc.embedPages(scratch.getPages()) : [];
  return new Map<string, PDFEmbeddedPage>(texts.map((t, i) => [t, embedded[i]]));
}

/** `onProgress(hecha, total)` por hoja; entre hojas se suelta el hilo para que la página no se congele. */
export async function buildLabelsPdf(
  items: PdfLabel[],
  o: LabelOpts,
  assets: PdfAssets,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("Etiquetas Feria del Millón");
  const mk = async (bytes: Uint8Array): Promise<F> => {
    const font = await doc.embedFont(bytes, { subset: true });
    return { font, chars: new Set(font.getCharacterSet()) };
  };
  const [anton, reg, med, semi] = await Promise.all([mk(assets.anton), mk(assets.regular), mk(assets.medium), mk(assets.semibold)]);
  const logo: PDFImage | null = assets.logo ? await doc.embedPng(assets.logo) : null;
  const qrs = await qrPages(doc, [...new Set(items.map((i) => i.qrText).filter(Boolean) as string[])]);

  const cols = Math.max(1, Math.min(8, o.cols));
  const rows = Math.max(1, Math.min(8, o.rows));
  const P = pageSizePt(o);
  const gridW = P.w - P.margin * 2;
  const gridH = P.h - P.margin * 2;
  const W = gridW / cols;
  const H = gridH / rows;
  // Misma escala que la vista previa: etiqueta de referencia 45 × 66 unidades.
  const u = Math.min(W / 45, H / 66);
  const per = cols * rows;
  const border = 0.3 * MM;

  const drawLabel = (page: PDFPage, it: PdfLabel, x0: number, yTop: number) => {
    const padX = 3.4 * u, padY = 2.6 * u;
    const IW = W - padX * 2;
    const qrMin = 16 * u;

    // Medidas del texto con la letra a escala f (se achica hasta que el QR quepa con su mínimo).
    const measure = (f: number) => {
      const hSize = Math.min(6 * u * f, (IW / Math.max(1, textWidth(anton.font, "¡FELICIDADES!", 1))) * 0.98);
      const sSize = 3.3 * u * f;
      const logoW = 13 * u * f;
      const logoH = logo ? (logoW * logo.height) / logo.width : 0;
      const aSize = 4 * u * f, tSize = 2.55 * u * f, cSize = 3.6 * u * f, pSize = 2.2 * u * f;
      const artist = wrap(med.font, clean(med, it.artist), aSize, IW);
      const details = [
        ...wrap(reg.font, clean(reg, it.title), tSize, IW),
        ...(it.technique ? wrap(reg.font, clean(reg, `Técnica: ${it.technique}`), tSize, IW) : []),
        ...(it.dimensions ? wrap(reg.font, clean(reg, `Dimensiones: ${it.dimensions}`), tSize, IW) : []),
      ];
      const serie = clean(reg, it.serieText ?? `Serie: ${it.n} / ${it.total}`);
      const code = clean(med, it.code || "SIN CÓDIGO");
      const sameLine = textWidth(reg.font, serie, tSize) + 2 * u * f + textWidth(med.font, code, cSize) <= IW;
      const codeLines = sameLine ? [code] : wrap(med.font, code, cSize, IW);
      const rowH = sameLine ? cSize * 1.2 : tSize * 1.2 + 0.3 * u * f + codeLines.length * cSize * 1.2;
      const boxH = pSize * 1.2 + 2.2 * u * f;
      const text =
        hSize + 0.6 * u * f + sSize * 1.2 + (1 * u * f + logoH + 1.2 * u * f) +
        artist.length * aSize * 1.2 + 0.8 * u * f + details.length * tSize * 1.2 +
        rowH + 1.2 * u * f + boxH + 1.6 * u * f;
      const qrArea = H - padY * 2 - text - 2 * u; // 2u = aire arriba/abajo del QR
      return { f, hSize, sSize, logoW, logoH, aSize, tSize, cSize, pSize, artist, details, serie, code, sameLine, codeLines, rowH, boxH, qrArea };
    };
    let m = measure(1);
    for (let f = 0.96; m.qrArea < qrMin && f > 0.55; f -= 0.04) m = measure(f);
    const fu = m.f * u;

    // Línea de texto: `top` es el borde superior de la línea; devuelve el siguiente top.
    const line = (fnt: PDFFont, s: string, size: number, top: number, lh = 1.2, align: "left" | "center" | "right" = "left") => {
      const w = align === "left" ? 0 : textWidth(fnt, s, size);
      const x = align === "center" ? x0 + (W - w) / 2 : align === "right" ? x0 + W - padX - w : x0 + padX;
      const { asc, full } = metrics(fnt);
      page.drawText(s, { x, y: top - (lh * size - full * size) / 2 - asc * size, size, font: fnt, color: INK });
      return top - lh * size;
    };

    let y = yTop - padY;
    y = line(anton.font, "¡FELICIDADES!", m.hSize, y, 1, "center");
    y -= 0.6 * fu;
    y = line(reg.font, "Acabas de comprar un", m.sSize, y, 1.2, "center");
    y -= 1 * fu;
    if (logo) page.drawImage(logo, { x: x0 + (W - m.logoW) / 2, y: y - m.logoH, width: m.logoW, height: m.logoH });
    y -= m.logoH + 1.2 * fu;
    for (const l of m.artist) y = line(med.font, l, m.aSize, y);
    y -= 0.8 * fu;
    for (const l of m.details) y = line(reg.font, l, m.tSize, y);

    // De abajo hacia arriba: línea, precio, serie; el QR al centro del espacio que sobra.
    let b = yTop - H + padY;
    page.drawLine({ start: { x: x0 + padX, y: b }, end: { x: x0 + W - padX, y: b }, thickness: 0.25 * MM, color: RULE });
    b += 1.6 * fu;
    const r = 1 * u;
    const bw = IW, bh = m.boxH, bx = x0 + padX;
    page.drawSvgPath(
      `M ${r} 0 H ${bw - r} Q ${bw} 0 ${bw} ${r} V ${bh - r} Q ${bw} ${bh} ${bw - r} ${bh} H ${r} Q 0 ${bh} 0 ${bh - r} V ${r} Q 0 0 ${r} 0 Z`,
      { x: bx, y: b + bh, color: BOX, borderWidth: 0 },
    );
    // "Precio:" centrado en la casilla (altura de mayúscula ≈ 0,7 del tamaño).
    page.drawText("Precio:", { x: bx + 2 * u, y: b + (bh - m.pSize * 0.7) / 2, size: m.pSize, font: semi.font, color: INK });
    b += bh + 1.2 * fu;
    const rowTop = b + m.rowH;
    if (m.sameLine) {
      line(reg.font, m.serie, m.tSize, rowTop - (m.cSize - m.tSize) * 0.85, 1.2, "left");
      line(med.font, m.code, m.cSize, rowTop, 1.2, "right");
    } else {
      let t = line(reg.font, m.serie, m.tSize, rowTop);
      t -= 0.3 * fu;
      for (const l of m.codeLines) t = line(med.font, l, m.cSize, t);
    }

    const qr = it.qrText ? qrs.get(it.qrText) : undefined;
    if (qr) {
      const areaTop = y - 1.2 * u, areaBottom = rowTop + 0.8 * u;
      const size = Math.max(0, Math.min(areaTop - areaBottom, IW));
      page.drawPage(qr, { x: x0 + (W - size) / 2, y: areaBottom + (areaTop - areaBottom - size) / 2, width: size, height: size });
    }
  };

  const totalPages = Math.ceil(items.length / per);
  for (let i = 0; i < items.length; i += per) {
    const page = doc.addPage([P.w, P.h]);
    const chunk = items.slice(i, i + per);
    // Fondo y marco de la grilla (como la vista previa).
    page.drawRectangle({ x: P.margin, y: P.h - P.margin - gridH, width: gridW, height: gridH, color: PAPER_BG });
    chunk.forEach((it, j) => {
      const c = j % cols, r = Math.floor(j / cols);
      drawLabel(page, it, P.margin + c * W, P.h - P.margin - r * H);
    });
    for (let c = 0; c <= cols; c++)
      page.drawLine({ start: { x: P.margin + c * W, y: P.h - P.margin }, end: { x: P.margin + c * W, y: P.h - P.margin - gridH }, thickness: border, color: LINE });
    for (let r = 0; r <= rows; r++)
      page.drawLine({ start: { x: P.margin, y: P.h - P.margin - r * H }, end: { x: P.margin + gridW, y: P.h - P.margin - r * H }, thickness: border, color: LINE });
    onProgress?.(i / per + 1, totalPages);
    await new Promise((ok) => setTimeout(ok, 0));
  }
  // Sin object streams: guardar es ~3× más rápido y el archivo lo abre igual cualquier programa.
  return doc.save({ useObjectStreams: false });
}
