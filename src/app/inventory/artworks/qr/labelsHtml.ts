/* Etiquetas "¡FELICIDADES!" para imprimir: documento HTML aparte (va en un
   iframe), con páginas de tamaño fijo en mm. Así lo que se ve en la vista
   previa es exactamente lo que sale en el PDF, sin el layout del panel. */

export type LabelItem = {
  artist: string;
  title: string;
  technique?: string;
  dimensions?: string;
  n: number;
  total: number;
  code?: string;
  qr?: string; // data URL
};

export type LabelOpts = {
  cols: number;
  rows: number;
  landscape: boolean;
  showQr: boolean;
  /** Casilla "Precio:" vacía para escribir a mano. */
  priceBox: boolean;
  logoUrl: string;
};

const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Carta, margen 6 mm. Se deja 2 mm de holgura vertical para que el navegador no parta la hoja.
const PAGE = { w: 279.4, h: 215.9, margin: 6 };

export function buildLabelsHtml(items: LabelItem[], o: LabelOpts) {
  const cols = Math.max(1, Math.min(8, o.cols));
  const rows = Math.max(1, Math.min(8, o.rows));
  const pw = (o.landscape ? PAGE.w : PAGE.h) - PAGE.margin * 2;
  const ph = (o.landscape ? PAGE.h : PAGE.w) - PAGE.margin * 2 - 2;
  const per = cols * rows;
  // Todo escala con el ancho de la etiqueta (referencia: 45 mm, la del año pasado).
  const k = Math.min(pw / cols / 45, ph / rows / 66);
  const mm = (v: number) => `${(v * k).toFixed(2)}mm`;

  const label = (it: LabelItem) => `
    <div class="l">
      <div class="h">¡FELICIDADES!</div>
      <div class="s">Acabas de comprar un</div>
      <img class="logo" src="${esc(o.logoUrl)}" alt="" />
      <div class="a">${esc(it.artist)}</div>
      <div class="t">${esc(it.title)}</div>
      ${it.technique ? `<div class="d">Técnica: ${esc(it.technique)}</div>` : ""}
      ${it.dimensions ? `<div class="d">Dimensiones: ${esc(it.dimensions)}</div>` : ""}
      <div class="row"><span class="d">Serie: ${it.n} / ${it.total}</span><span class="c">${esc(it.code || "SIN CÓDIGO")}</span></div>
      <div class="foot">
        ${o.showQr && it.qr ? `<img class="qr" src="${it.qr}" alt="" />` : ""}
        ${o.priceBox ? `<div class="p">Precio:</div>` : ""}
      </div>
    </div>`;

  const pages: string[] = [];
  for (let i = 0; i < items.length; i += per)
    pages.push(`<section class="page">${items.slice(i, i + per).map(label).join("")}</section>`);

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Saira+Condensed:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @page { size: letter ${o.landscape ? "landscape" : "portrait"}; margin: ${PAGE.margin}mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: "Saira Condensed", "Arial Narrow", sans-serif; color: #111; background: #8d8a86; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: ${pw}mm; height: ${ph}mm; display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); grid-template-rows: repeat(${rows}, minmax(0, 1fr));
          border-left: .3mm solid #333; border-top: .3mm solid #333; background: #E8E4E0; break-after: page; overflow: hidden; margin: 0 auto 6mm; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
  .page:last-child { break-after: auto; }
  .l { border-right: .3mm solid #333; border-bottom: .3mm solid #333; padding: ${mm(2.6)} ${mm(3.4)}; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
  .l > * { flex-shrink: 0; }
  .h { font-family: Anton, Impact, sans-serif; font-size: ${mm(6)}; line-height: 1; text-align: center; letter-spacing: .01em; }
  .s { text-align: center; font-size: ${mm(3.3)}; margin-top: ${mm(.6)}; }
  .logo { display: block; width: ${mm(15)}; margin: ${mm(1)} auto ${mm(1.4)}; mix-blend-mode: multiply; }
  .a { font-size: ${mm(4)}; font-weight: 500; margin-bottom: ${mm(.8)}; }
  .t, .d { font-size: ${mm(2.55)}; line-height: 1.2; }
  .t { overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .row { display: flex; justify-content: space-between; align-items: baseline; gap: ${mm(2)}; }
  .row .d { white-space: nowrap; }
  .c { font-size: ${mm(3.9)}; font-weight: 500; white-space: nowrap; letter-spacing: .02em; }
  .foot { margin-top: auto; display: flex; align-items: flex-end; gap: ${mm(2)}; }
  .qr { width: ${mm(12.5)}; height: ${mm(12.5)}; mix-blend-mode: multiply; }
  .p { flex: 1; background: #D6D0CC; border-radius: ${mm(1)}; font-size: ${mm(2.2)}; font-weight: 600; padding: ${mm(1)} ${mm(2)}; }
  @media print { body { background: none; } .page { margin: 0; box-shadow: none; } }
</style></head><body>${pages.join("") || '<p style="color:#fff;padding:20px">No hay obras con estos filtros.</p>'}</body></html>`;
}
