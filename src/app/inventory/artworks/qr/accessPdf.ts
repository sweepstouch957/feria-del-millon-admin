/* PDF de accesos: una tarjeta por persona con un QR que entra directo al
   panel (enlace reutilizable hasta que vence) y, de respaldo, su correo y clave. */
import { PDFDocument, rgb, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { clean, qrPages, textWidth, wrap, MM, type F, type PdfAssets } from "./labelsPdf";

export type AccessCard = { name: string; email: string; password: string; url: string; expiresAt: string };

const INK = rgb(0x11 / 255, 0x11 / 255, 0x11 / 255);
const SOFT = rgb(0x55 / 255, 0x55 / 255, 0x55 / 255);
const GREEN = rgb(0x3f / 255, 0xa4 / 255, 0x6e / 255);
const BOX = rgb(0xf2 / 255, 0xf0 / 255, 0xec / 255);
const CUT = rgb(0.75, 0.75, 0.75);

export async function buildAccessPdf(cards: AccessCard[], assets: PdfAssets, host: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("Accesos al panel · Feria del Millón");
  const mk = async (bytes: Uint8Array): Promise<F> => {
    const font = await doc.embedFont(bytes, { subset: true });
    return { font, chars: new Set(font.getCharacterSet()) };
  };
  const [anton, reg, semi] = await Promise.all([mk(assets.anton), mk(assets.regular), mk(assets.semibold)]);
  const logo: PDFImage | null = assets.logo ? await doc.embedPng(assets.logo) : null;
  const qrs = await qrPages(doc, cards.map((c) => c.url));

  // Carta vertical, 2 × 2 tarjetas con líneas de corte (QR grande, se lee rápido).
  const PW = 215.9 * MM, PH = 279.4 * MM, M = 8 * MM;
  const cols = 2, rows = 2;
  const W = (PW - M * 2) / cols, H = (PH - M * 2) / rows;
  const pad = 6 * MM;

  const center = (page: PDFPage, f: F, s: string, size: number, x: number, w: number, y: number, color = INK) => {
    const t = clean(f, s);
    page.drawText(t, { x: x + (w - textWidth(f.font, t, size)) / 2, y, size, font: f.font, color });
  };

  const draw = (page: PDFPage, c: AccessCard, x0: number, yTop: number) => {
    const IW = W - pad * 2;
    let y = yTop - pad;
    if (logo) {
      const lh = 8 * MM, lw = (lh * logo.width) / logo.height;
      page.drawImage(logo, { x: x0 + (W - lw) / 2, y: y - lh, width: lw, height: lh });
      y -= lh + 2.5 * MM;
    }
    center(page, semi, "ACCESO AL PANEL", 7.5, x0, W, y - 7, GREEN);
    y -= 7 + 3 * MM;
    // Nombre: hasta 2 líneas, se achica si no cabe.
    let size = 15;
    let ls = wrap(anton.font, clean(anton, c.name.toUpperCase()), size, IW);
    while (ls.length > 2 && size > 9) ls = wrap(anton.font, clean(anton, c.name.toUpperCase()), (size -= 1), IW);
    for (const l of ls.slice(0, 2)) { center(page, anton, l, size, x0, W, y - size * 0.85); y -= size * 1.1; }
    y -= 2 * MM;

    // Pie de abajo hacia arriba: credenciales en recuadro + aviso.
    let b = yTop - H + pad;
    center(page, reg, `Personal · vence el ${new Date(c.expiresAt).toLocaleDateString("es-CO")}`, 6.5, x0, W, b, SOFT);
    b += 6.5 + 2 * MM;
    const boxH = 15 * MM;
    page.drawRectangle({ x: x0 + pad, y: b, width: IW, height: boxH, color: BOX });
    const rowsTxt: [string, string][] = [["Correo", c.email], ["Clave", c.password]];
    rowsTxt.forEach(([k, v], i) => {
      const ty = b + boxH - (i + 1) * 6.2 * MM + 1.5 * MM;
      page.drawText(k.toUpperCase(), { x: x0 + pad + 3 * MM, y: ty, size: 6.5, font: semi.font, color: SOFT });
      const val = clean(reg, v);
      let vs = 9.5;
      const maxW = IW - 20 * MM;
      while (textWidth(reg.font, val, vs) > maxW && vs > 6) vs -= 0.5;
      page.drawText(val, { x: x0 + pad + 17 * MM, y: ty, size: vs, font: reg.font, color: INK });
    });
    b += boxH + 2 * MM;
    center(page, reg, host, 7, x0, W, b, SOFT);
    b += 7 + 1.5 * MM;
    center(page, semi, "Escanea para entrar sin escribir la clave", 8, x0, W, b, INK);
    b += 8 + 2 * MM;

    const qr = qrs.get(c.url);
    const qs = Math.max(0, Math.min(IW * 0.9, y - b));
    if (qr) page.drawPage(qr, { x: x0 + (W - qs) / 2, y: b + (y - b - qs) / 2, width: qs, height: qs });
  };

  for (let i = 0; i < cards.length; i += cols * rows) {
    const page = doc.addPage([PW, PH]);
    cards.slice(i, i + cols * rows).forEach((c, j) => draw(page, c, M + (j % cols) * W, PH - M - Math.floor(j / cols) * H));
    for (let c = 0; c <= cols; c++)
      page.drawLine({ start: { x: M + c * W, y: PH - M }, end: { x: M + c * W, y: M }, thickness: 0.4, color: CUT, dashArray: [3, 3] });
    for (let r = 0; r <= rows; r++)
      page.drawLine({ start: { x: M, y: PH - M - r * H }, end: { x: PW - M, y: PH - M - r * H }, thickness: 0.4, color: CUT, dashArray: [3, 3] });
  }
  return doc.save();
}
