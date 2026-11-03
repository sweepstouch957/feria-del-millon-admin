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

export type Paper = "pliego" | "letter";

export type LabelOpts = {
  cols: number;
  rows: number;
  landscape: boolean;
  /** pliego = 48 × 33 cm de la imprenta (18 etiquetas: 6 × 3); letter = carta. */
  paper?: Paper;
  showQr: boolean;
  /** Casilla "Precio:" vacía para escribir a mano. */
  priceBox: boolean;
  logoUrl: string;
};

const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/* Medidas en mm del lado largo (w) y corto (h). Se deja 2 mm de holgura vertical
   para que el navegador no parta la hoja.
   Pliego de la imprenta: 48 × 33 cm, 5 mm de margen → 18 etiquetas de ~78 × 106 mm. */
export const PAPERS: Record<Paper, { w: number; h: number; margin: number; label: string }> = {
  pliego: { w: 480, h: 330, margin: 5, label: "Pliego 48 × 33 cm" },
  letter: { w: 279.4, h: 215.9, margin: 6, label: "Carta" },
};

/** Tamaño de cada etiqueta en mm (para mostrarlo y verificarlo). */
export function labelSize(o: Pick<LabelOpts, "cols" | "rows" | "landscape" | "paper">) {
  const P = PAPERS[o.paper ?? "letter"];
  const pw = (o.landscape ? P.w : P.h) - P.margin * 2;
  const ph = (o.landscape ? P.h : P.w) - P.margin * 2 - 2;
  return { pw, ph, w: pw / o.cols, h: ph / o.rows };
}

export function buildLabelsHtml(items: LabelItem[], o: LabelOpts) {
  const cols = Math.max(1, Math.min(8, o.cols));
  const rows = Math.max(1, Math.min(8, o.rows));
  const PAGE = PAPERS[o.paper ?? "letter"];
  const pageCss = o.paper === "pliego"
    ? (o.landscape ? `${PAGE.w}mm ${PAGE.h}mm` : `${PAGE.h}mm ${PAGE.w}mm`)
    : `letter ${o.landscape ? "landscape" : "portrait"}`;
  const pw = (o.landscape ? PAGE.w : PAGE.h) - PAGE.margin * 2;
  const ph = (o.landscape ? PAGE.h : PAGE.w) - PAGE.margin * 2 - 2;
  const per = cols * rows;
  // Todo escala con el ancho de la etiqueta (referencia: 45 mm, la del año pasado).
  const k = Math.min(pw / cols / 45, ph / rows / 66);
  const mm = (v: number) => `${(v * k).toFixed(2)}mm`;
  // Texto que se achica solo (--f, ver fit() abajo) si la etiqueta no alcanza.
  const fm = (v: number) => `calc(${(v * k).toFixed(2)}mm * var(--f, 1))`;

  // Cada QR va una sola vez (como clase CSS) y las copias de la misma obra lo reusan:
  // con 4.500 etiquetas, repetir la imagen en cada una inflaba el documento.
  const qrClass = new Map<string, number>();
  for (const it of items) if (it.qr && !qrClass.has(it.qr)) qrClass.set(it.qr, qrClass.size);
  const qrCss = [...qrClass].map(([src, i]) => `.q${i}{background-image:url("${src.replace(/"/g, "%22")}")}`).join("\n");

  const label = (it: LabelItem) => `
    <div class="l">
      <div class="h">¡FELICIDADES!</div>
      <div class="s">Acabas de comprar un</div>
      <img class="logo" src="${esc(o.logoUrl)}" alt="" />
      <div class="a">${esc(it.artist)}</div>
      <div class="t">${esc(it.title)}</div>
      ${it.technique ? `<div class="d">Técnica: ${esc(it.technique)}</div>` : ""}
      ${it.dimensions ? `<div class="d">Dimensiones: ${esc(it.dimensions)}</div>` : ""}
      <div class="qrbox">${it.qr ? `<div class="qr q${qrClass.get(it.qr)}" role="img" aria-label="QR"></div>` : ""}</div>
      <div class="row"><span class="d">Serie: ${it.n} / ${it.total}</span><span class="c">${esc(it.code || "SIN CÓDIGO")}</span></div>
      <div class="p">Precio:</div>
      <div class="rule"></div>
    </div>`;

  const pages: string[] = [];
  for (let i = 0; i < items.length; i += per)
    pages.push(`<section class="page">${items.slice(i, i + per).map(label).join("")}</section>`);

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Saira+Condensed:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  @page { size: ${pageCss}; margin: ${PAGE.margin}mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: "Saira Condensed", "Arial Narrow", sans-serif; color: #111; background: #8d8a86; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: ${pw}mm; height: ${ph}mm; display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); grid-template-rows: repeat(${rows}, minmax(0, 1fr));
          border-left: .3mm solid #333; border-top: .3mm solid #333; background: #E8E4E0; break-after: page; overflow: hidden; margin: 0 auto 6mm; box-shadow: 0 2px 10px rgba(0,0,0,.25); }
  .page:last-child { break-after: auto; }
  .l { border-right: .3mm solid #333; border-bottom: .3mm solid #333; padding: ${mm(2.6)} ${mm(3.4)}; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
  .l > * { flex-shrink: 0; }
  .h { font-family: Anton, Impact, sans-serif; font-size: ${fm(6)}; line-height: 1; text-align: center; letter-spacing: .01em; }
  .s { text-align: center; font-size: ${fm(3.3)}; margin-top: ${fm(.6)}; }
  .logo { display: block; width: ${fm(13)}; margin: ${fm(1)} auto ${fm(1.2)}; mix-blend-mode: multiply; }
  /* Nada se corta: nombre, título y datos parten línea; el código baja a su propia
     línea si no cabe al lado de la serie. Si aun así no alcanza, fit() achica la letra. */
  .a { font-size: ${fm(4)}; font-weight: 500; margin-bottom: ${fm(.8)}; overflow-wrap: anywhere; }
  .t, .d { font-size: ${fm(2.55)}; line-height: 1.2; overflow-wrap: anywhere; }
  /* Como la del año pasado, con el QR arriba de la serie (es lo más importante):
     datos → QR (se queda con el alto libre, mínimo ~16 de 66) → serie y código →
     casilla de precio para la rebaja a mano → línea. */
  .l > .qrbox { flex: 1 1 0; min-height: ${mm(16)}; display: flex; align-items: center; justify-content: center; padding: ${mm(1.2)} 0 ${mm(.8)}; }
  .qr { display: block; height: 100%; max-width: 100%; aspect-ratio: 1 / 1; background: center / contain no-repeat; mix-blend-mode: multiply; }
${qrCss}
  .row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; column-gap: ${fm(2)}; row-gap: ${fm(.3)}; }
  .row .d { white-space: nowrap; }
  .c { font-size: ${fm(3.6)}; font-weight: 500; letter-spacing: .02em; overflow-wrap: anywhere; max-width: 100%; }
  .p { background: #D6D0CC; border-radius: ${mm(1)}; font-size: ${fm(2.2)}; font-weight: 600; padding: ${fm(1.1)} ${mm(2)}; margin-top: ${fm(1.2)}; }
  .rule { border-top: .25mm solid #888; margin-top: ${fm(1.6)}; }
  @media print { body { background: none; } .page { margin: 0; box-shadow: none; } }
</style></head><body>${pages.join("") || '<p style="color:#fff;padding:20px">No hay obras con estos filtros.</p>'}
<script>
  /* Si una etiqueta no alcanza (título largo, código en dos líneas), se le achica
     la letra de a poco hasta que todo quepa: nada se corta y el QR conserva su mínimo. */
  window.fit = function () {
    var all = Array.prototype.slice.call(document.querySelectorAll(".l"));
    all.forEach(function (l) { l.style.removeProperty("--f"); });
    // Una sola medición para todas; solo se corrigen las que se pasan (pocas).
    var over = all.filter(function (l) { return l.scrollHeight > l.clientHeight + 1; });
    over.forEach(function (l) {
      var f = 1;
      while (l.scrollHeight > l.clientHeight + 1 && f > 0.55) {
        f -= 0.04;
        l.style.setProperty("--f", f.toFixed(2));
      }
    });
  };
  window.fit();
  window.addEventListener("load", window.fit);
  if (document.fonts) document.fonts.ready.then(window.fit);
</script></body></html>`;
}
