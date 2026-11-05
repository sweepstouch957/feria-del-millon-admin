/* Catálogo de artistas en un solo PDF: una tarjeta por artista con su nombre,
   una obra destacada y el QR a su página ("Conozca más obras aquí").
   Varias tarjetas por hoja (con líneas de corte) o una por hoja. */
import {
  PDFDocument, rgb, degrees, pushGraphicsState, popGraphicsState, rectangle, clip, endPath,
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
  const sans = assets.sans ? await mk(assets.sans) : reg;
  const sansBold = assets.sansBold ? await mk(assets.sansBold) : semi;
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
      // Diseño acordado (hoja apaisada): medidas en % del alto (h) y ancho (w) de la tarjeta.
      const h = H / 100, w = W / 100;
      const at = (pctFromTop: number) => yTop - pctFromTop * h; // y de una línea base
      const mid = (f: PDFFont, s: string, size: number, cx: number, baseline: number, color = INK) =>
        page.drawText(s, { x: cx - textWidth(f, s, size) / 2, y: baseline, size, font: f, color });
      /** Achica hasta que quepa en el ancho. */
      const shrink = (f: PDFFont, s: string, size: number, maxW: number) => Math.min(size, (size * maxW) / Math.max(1, textWidth(f, s, size)));

      // Izquierda: obra (sin recortar) y, pegados debajo, ficha y precio; todo centrado en el alto.
      const artCx = x0 + 30.7 * w, artMaxW = 44 * w;
      const capSize = 1.5 * h, priceSize = 4.3 * h;
      const cap = caption ? fit(sans, caption, capSize, artMaxW, 2) : { ls: [] as string[], size: capSize };
      const price = c.featured?.price ? clean(sans, c.featured.price) : "";
      const below = (cap.ls.length ? 2.9 * h + (cap.ls.length - 1) * cap.size * 1.2 : 0) + (price ? 5.5 * h : 0) + 1 * h;
      const areaTop = 5.7, areaBottom = 92.8; // % desde arriba
      const maxH = (areaBottom - areaTop) * h - below;
      let iw = artMaxW * 0.82, ih = maxH;
      if (img) {
        const k = Math.min(artMaxW / img.width, maxH / img.height);
        iw = img.width * k; ih = img.height * k;
      }
      const imgTop = at(areaTop) - ((areaBottom - areaTop) * h - ih - below) / 2;
      if (img) page.drawImage(img, { x: artCx - iw / 2, y: imgTop - ih, width: iw, height: ih });
      else page.drawRectangle({ x: artCx - iw / 2, y: imgTop - ih, width: iw, height: ih, color: HOLE });
      // Líneas base: ficha 2,9 h bajo la obra; precio 5,5 h bajo la última línea de ficha.
      let base = imgTop - ih;
      cap.ls.forEach((l, i) => { base = imgTop - ih - 2.9 * h - i * cap.size * 1.2; mid(sans.font, l, cap.size, artCx, base, SOFT); });
      if (price) mid(sans.font, price, shrink(sans.font, price, priceSize, artMaxW), artCx, base - 5.5 * h, INK);

      // Derecha, abajo: nombre en dos líneas, pabellón, QR y llamado.
      const cx = x0 + 85.5 * w, colW = 2 * (W - 85.5 * w) - 4 * w;
      const subBase = at(90.3), headBase = at(87.9), qrSize = 17 * h, qrBottom = at(82.3);
      const qr = qrs.get(c.qrText);
      const sub = clean(sans, `Escanee el código y vea ${c.count === 1 ? "su obra" : `sus ${c.count} obras`}`);
      mid(sans.font, sub, shrink(sans.font, sub, 1.3 * h, colW), cx, subBase, SOFT);
      const hl = clean(sans, "CONOZCA MÁS OBRAS AQUÍ");
      mid(sans.font, hl, shrink(sans.font, hl, 2.3 * h, colW), cx, headBase, INK);
      if (qr) page.drawPage(qr, { x: cx - qrSize / 2, y: qrBottom, width: qrSize, height: qrSize });
      let nb = qrBottom + qrSize + 2.6 * h;
      if (c.pavilion) {
        const pv = clean(sans, c.pavilion);
        mid(sans.font, pv, shrink(sans.font, pv, 1.2 * h, colW), cx, nb, SOFT);
        nb += 2.2 * h;
      } else nb += 0.2 * h;
      // Nombre partido en dos líneas parejas (nombre / apellidos).
      const words = clean(sans, c.name.toUpperCase()).split(/\s+/).filter(Boolean);
      let nameLs = [words.join(" ")];
      if (words.length > 1) {
        let best = 1, bestW = Infinity;
        for (let k = 1; k < words.length; k++) {
          const m = Math.max(textWidth(sans.font, words.slice(0, k).join(" "), 1), textWidth(sans.font, words.slice(k).join(" "), 1));
          if (m < bestW) { bestW = m; best = k; }
        }
        nameLs = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
      }
      const ns = Math.min(3.6 * h, ...nameLs.map((l) => shrink(sans.font, l, 3.6 * h, colW)));
      for (const l of [...nameLs].reverse()) { mid(sans.font, l, ns, cx, nb, INK); nb += ns * 1.03; }
    } else {
      const top = head(x0 + pad, yTop - pad, IW, 9 * u);
      const qrSize = Math.min(24 * u, IW * 0.35);
      const footTop = foot(x0 + pad, IW, yTop - H + pad, qrSize);
      drawArt(x0 + pad, top - 2.5 * u, IW, top - 2.5 * u - footTop - 3 * u);
    }
  };

  // ── Portada diseñada (imagen): mismo tamaño de hoja que el resto. Se ajusta al
  // ancho y lo que sobra arriba/abajo se rellena con su mismo fondo menta. ──
  const coverImg = o.cover && assets.coverImage ? await embedImage(assets.coverImage) : null;
  if (o.cover && coverImg) {
    const page = doc.addPage([P.w, P.h]);
    page.drawRectangle({ x: 0, y: 0, width: P.w, height: P.h, color: rgb(0xba / 255, 0xe1 / 255, 0xd6 / 255) });
    const k = Math.min(P.w / coverImg.width, P.h / coverImg.height);
    const iw = coverImg.width * k, ih = coverImg.height * k;
    page.drawImage(coverImg, { x: (P.w - iw) / 2, y: (P.h - ih) / 2, width: iw, height: ih });
  }

  // ── Portada generada (si no hay imagen): logo grande, título y mosaico con obras ──
  if (o.cover && !coverImg) {
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

  // ── Índice tras la portada: "ARTISTAS" y la lista nombre + obra destacada ──
  if (o.cover) {
    const U = Math.min(P.w, P.h) / 100;
    const mL = 11 * U, mR = 8 * U, top = P.h - 12 * U, bottom = 12 * U;
    const listX = mL + 9 * U, listW = P.w - listX - mR;
    const ncol = P.w > P.h ? 4 : 3, colW = listW / ncol, gutter = 2 * U;
    const nameSize = 1.85 * U, workSize = 1.65 * U, gap = 1.1 * U;
    const event = o.cover.event;
    const newPage = () => {
      const page = doc.addPage([P.w, P.h]);
      page.drawRectangle({ x: 0, y: 0, width: P.w, height: P.h, color: BG });
      page.drawText(clean(anton, "ARTISTAS"), { x: mL, y: top - 6 * U * 0.8, size: 6 * U, font: anton.font, color: INK });
      page.drawText(clean(sans, event), { x: mL + 1.4 * U, y: top - 6 * U - 2.4 * U, size: 1.9 * U, font: sans.font, color: INK });
      const foot = clean(sans, `- ${event} -`);
      page.drawText(foot, { x: P.w - mR - textWidth(sans.font, foot, 1.8 * U), y: bottom - 6 * U, size: 1.8 * U, font: sans.font, color: INK });
      return page;
    };
    const entries = cards.map((c) => ({
      name: wrap(sansBold.font, clean(sansBold, c.name), nameSize, colW - gutter).slice(0, 3),
      work: c.featured?.title ? clean(sans, c.featured.title) : "",
    }));
    let page = newPage();
    const listTop = top - 13 * U;
    let y = listTop;
    const label = clean(sansBold, "FDM");
    page.drawText(label, { x: mL + 5 * U, y: listTop, size: 2 * U, font: sansBold.font, color: INK, rotate: degrees(-90) });
    for (let i = 0; i < entries.length; i += ncol) {
      const row = entries.slice(i, i + ncol);
      const rowH = Math.max(...row.map((e) => e.name.length * nameSize * 1.1 + (e.work ? workSize * 1.25 : 0))) + gap;
      if (y - rowH < bottom) {
        page = newPage();
        y = listTop;
        page.drawText(label, { x: mL + 5 * U, y: listTop, size: 2 * U, font: sansBold.font, color: INK, rotate: degrees(-90) });
      }
      row.forEach((e, j) => {
        const x = listX + j * colW;
        let t = y;
        for (const l of e.name) { page.drawText(l, { x, y: t - nameSize * 0.8, size: nameSize, font: sansBold.font, color: INK }); t -= nameSize * 1.1; }
        if (e.work) {
          // Una línea: se corta con "…" si no cabe.
          let w = e.work;
          while (w.length > 1 && textWidth(sans.font, w, workSize) > colW - gutter) w = w.slice(0, -2).trimEnd() + "…";
          page.drawText(w, { x, y: t - workSize * 0.8, size: workSize, font: sans.font, color: SOFT });
        }
      });
      y -= rowH;
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
