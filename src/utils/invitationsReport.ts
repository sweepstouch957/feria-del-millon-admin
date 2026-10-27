// utils/invitationsReport.ts — Excel de invitaciones con resumen para la organización.
//
// Hoja "Resumen": KPIs, tablas cruzadas (estado, categoría, origen, confirmaciones
// por día) y dos gráficos. Luego una hoja por grupo (confirmados, pendientes,
// declinaron, acompañantes, asistieron, todos) como Tabla de Excel con filtros.
//
// exceljs no escribe gráficos nativos ni tablas dinámicas: los gráficos se
// dibujan en un canvas y van como imagen, y las tablas cruzadas se calculan
// aquí. Las hojas de detalle son Tablas de Excel, así que desde ahí se puede
// insertar una tabla dinámica en un clic (Insertar → Tabla dinámica).
import type { Ticket } from "@services/ticket.service";

type Row = Ticket & { inviteLink?: string; checkIns?: unknown[] };

const C = {
  ink: "FF111111",
  muted: "FF6B6B6B",
  line: "FFE3E3E3",
  head: "FF111111",
  soft: "FFF5F5F2",
  confirmed: "FF2E7D5B",
  pending: "FFE0A526",
  declined: "FF9AA0A6",
  attended: "FF2F6FB0",
  canceled: "FFC0392B",
  companions: "FF7A5BA6",
};
const hex = (argb: string) => `#${argb.slice(2)}`;

const isHost = (t: Row) => !t.inviteParent;
const confirmed = (t: Row) => t.status === "sold" || t.status === "checked_in";
const day = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) : "");
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" }) : "");
const pct = (a: number, b: number) => (b ? a / b : 0);

const STATUS_LABEL: Record<string, string> = {
  invited: "Pendiente",
  sold: "Confirmada",
  checked_in: "Asistió",
  declined: "Declinó",
  canceled: "Anulada",
};

/* ── Gráficos en canvas (PNG) ─────────────────────────────────────────── */

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w * 2;
  c.height = h * 2;
  const g = c.getContext("2d")!;
  g.scale(2, 2);
  g.fillStyle = "#fff";
  g.fillRect(0, 0, w, h);
  g.font = "13px Arial";
  return { c, g };
}

function donutPng(title: string, parts: { label: string; value: number; color: string }[]) {
  const W = 520, H = 300;
  const { c, g } = canvas(W, H);
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  g.fillStyle = "#111"; g.font = "bold 15px Arial"; g.fillText(title, 16, 26);
  const cx = 150, cy = 165, r = 105, ri = 62;
  let a0 = -Math.PI / 2;
  for (const p of parts) {
    const a1 = a0 + (p.value / total) * Math.PI * 2;
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a0, a1); g.closePath();
    g.fillStyle = p.color; g.fill();
    a0 = a1;
  }
  g.beginPath(); g.arc(cx, cy, ri, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill();
  g.fillStyle = "#111"; g.font = "bold 26px Arial"; g.textAlign = "center";
  g.fillText(String(parts.reduce((a, p) => a + p.value, 0)), cx, cy + 6);
  g.font = "12px Arial"; g.fillStyle = "#666"; g.fillText("invitados", cx, cy + 24);
  g.textAlign = "left";
  parts.forEach((p, i) => {
    const y = 90 + i * 30;
    g.fillStyle = p.color; g.fillRect(290, y - 11, 14, 14);
    g.fillStyle = "#111"; g.font = "13px Arial";
    g.fillText(`${p.label}: ${p.value} (${Math.round((p.value / total) * 100)}%)`, 312, y);
  });
  return c.toDataURL("image/png");
}

function barsPng(title: string, labels: string[], values: number[], color: string, cumulative?: number[]) {
  const W = 720, H = 300;
  const { c, g } = canvas(W, H);
  g.fillStyle = "#111"; g.font = "bold 15px Arial"; g.fillText(title, 16, 26);
  const L = 48, R = 20, T = 48, B = 52;
  const pw = W - L - R, ph = H - T - B;
  const max = Math.max(1, ...values, ...(cumulative || []));
  g.strokeStyle = "#e3e3e3"; g.fillStyle = "#888"; g.font = "11px Arial";
  for (let i = 0; i <= 4; i++) {
    const y = T + ph - (ph * i) / 4;
    g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke();
    g.fillText(String(Math.round((max * i) / 4)), 8, y + 4);
  }
  const n = Math.max(labels.length, 1);
  const bw = Math.min(40, (pw / n) * 0.7);
  labels.forEach((lab, i) => {
    const x = L + (pw / n) * (i + 0.5);
    const h = (values[i] / max) * ph;
    g.fillStyle = color; g.fillRect(x - bw / 2, T + ph - h, bw, h);
    if (values[i]) { g.fillStyle = "#111"; g.textAlign = "center"; g.fillText(String(values[i]), x, T + ph - h - 4); }
    // Fechas: solo algunas etiquetas si son muchas.
    if (n <= 16 || i % Math.ceil(n / 16) === 0) {
      g.save(); g.translate(x, T + ph + 12); g.rotate(-0.5); g.fillStyle = "#666"; g.textAlign = "right"; g.fillText(lab, 0, 0); g.restore();
    }
    g.textAlign = "left";
  });
  if (cumulative?.length) {
    g.strokeStyle = "#111"; g.lineWidth = 2; g.beginPath();
    cumulative.forEach((v, i) => {
      const x = L + (pw / n) * (i + 0.5), y = T + ph - (v / max) * ph;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.stroke();
    g.fillStyle = "#111"; g.fillRect(W - 170, 16, 18, 2); g.fillText("Acumulado", W - 146, 21);
  }
  return c.toDataURL("image/png");
}

/* ── El libro ─────────────────────────────────────────────────────────── */

export async function downloadInvitationsReport(rows: Row[], eventName = "Feria del Millón") {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Panel Feria del Millón";
  wb.created = new Date();

  const hosts = rows.filter(isHost);
  const companions = rows.filter((t) => !isHost(t));
  const n = {
    sent: hosts.length,
    confirmed: hosts.filter(confirmed).length,
    pending: hosts.filter((t) => t.status === "invited").length,
    declined: hosts.filter((t) => t.status === "declined").length,
    canceled: hosts.filter((t) => t.status === "canceled").length,
    attended: rows.filter((t) => t.status === "checked_in").length,
    companions: companions.length,
  };
  // Personas que se esperan: cupos de los titulares confirmados + acompañantes con pase.
  const expected = hosts.filter(confirmed).reduce((a, t) => a + (t.admits ?? 1), 0) + companions.filter((t) => t.status !== "canceled").length;

  /* Resumen */
  const ws = wb.addWorksheet("Resumen", { views: [{ showGridLines: false }] });
  // A y G llevan las etiquetas de las tablas (origen, categoría): más anchas.
  ws.columns = Array.from({ length: 14 }, (_, i) => ({ width: i === 0 ? 26 : i === 6 ? 20 : 13 }));
  ws.mergeCells("A1:N1");
  Object.assign(ws.getCell("A1"), { value: `Invitaciones · ${eventName}` });
  ws.getCell("A1").font = { size: 20, bold: true, color: { argb: C.ink } };
  ws.mergeCells("A2:N2");
  ws.getCell("A2").value = `Generado el ${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" })}`;
  ws.getCell("A2").font = { size: 10, color: { argb: C.muted } };

  // KPIs: tarjetas de 2 columnas.
  const kpis: [string, number | string, string][] = [
    ["Invitados", n.sent, C.ink],
    ["Confirmados", n.confirmed, C.confirmed],
    ["Pendientes", n.pending, C.pending],
    ["Declinaron", n.declined, C.declined],
    ["Acompañantes", n.companions, C.companions],
    ["Asistieron", n.attended, C.attended],
    ["% confirmación", `${Math.round(pct(n.confirmed, n.sent) * 100)}%`, C.confirmed],
  ];
  kpis.forEach(([label, value, color], i) => {
    const col = 1 + i * 2;
    ws.mergeCells(4, col, 4, col + 1);
    ws.mergeCells(5, col, 5, col + 1);
    const l = ws.getCell(4, col), v = ws.getCell(5, col);
    l.value = label.toUpperCase();
    l.font = { size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    l.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    l.alignment = { horizontal: "center", vertical: "middle" };
    v.value = value;
    v.font = { size: 22, bold: true, color: { argb: color } };
    v.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.soft } };
    v.alignment = { horizontal: "center", vertical: "middle" };
  });
  ws.getRow(4).height = 20;
  ws.getRow(5).height = 40;
  ws.mergeCells("A6:N6");
  ws.getCell("A6").value = `Personas esperadas en la feria (titulares confirmados con sus cupos + acompañantes con pase): ${expected}`;
  ws.getCell("A6").font = { size: 11, italic: true, color: { argb: C.muted } };

  /** Tabla de resumen con encabezado negro; devuelve la fila siguiente libre. */
  const block = (top: number, left: number, title: string, head: string[], data: (string | number)[][], pctCols: number[] = []) => {
    ws.getCell(top, left).value = title;
    ws.getCell(top, left).font = { size: 12, bold: true };
    head.forEach((h, j) => {
      const c = ws.getCell(top + 1, left + j);
      c.value = h;
      c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.head } };
      c.alignment = { horizontal: j ? "center" : "left", vertical: "middle", wrapText: true };
    });
    data.forEach((r, i) => {
      r.forEach((v, j) => {
        const c = ws.getCell(top + 2 + i, left + j);
        c.value = v;
        c.border = { bottom: { style: "thin", color: { argb: C.line } } };
        c.alignment = { horizontal: j ? "center" : "left" };
        if (pctCols.includes(j)) c.numFmt = "0%";
        if (i === data.length - 1 && r[0] === "Total") c.font = { bold: true };
      });
    });
    return top + 3 + data.length;
  };

  // Por estado
  const byStatus: (string | number)[][] = [
    ["Confirmados", n.confirmed - hosts.filter((t) => t.status === "checked_in").length, 0],
    ["Asistieron", hosts.filter((t) => t.status === "checked_in").length, 0],
    ["Pendientes", n.pending, 0],
    ["Declinaron", n.declined, 0],
    ["Anuladas", n.canceled, 0],
  ].map(([l, v]) => [l, v, pct(v as number, n.sent)]);
  byStatus.push(["Total", n.sent, 1]);
  let r1 = block(8, 1, "Titulares por estado", ["Estado", "Invitados", "%"], byStatus, [2]);

  // Origen: lista enviada por el panel o enlace público de registro.
  const origins = new Map<string, Row[]>();
  for (const t of hosts) {
    const k = t.inviteLink ? `Enlace /i/${t.inviteLink}` : "Lista (correo personal)";
    origins.set(k, [...(origins.get(k) || []), t]);
  }
  const byOrigin = [...origins.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([k, ts]) => [k, ts.length, ts.filter(confirmed).length, pct(ts.filter(confirmed).length, ts.length)]);
  r1 = block(r1 + 1, 1, "Por origen", ["Origen", "Invitados", "Confirmados", "% conf."], byOrigin, [3]);

  // Por categoría (tabla cruzada)
  const cats = new Map<string, Row[]>();
  for (const t of hosts) {
    const k = t.inviteCategory || "Sin categoría";
    cats.set(k, [...(cats.get(k) || []), t]);
  }
  const catRows = [...cats.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([k, ts]) => {
      const conf = ts.filter(confirmed).length;
      return [k, ts.length, conf, ts.filter((t) => t.status === "invited").length, ts.filter((t) => t.status === "declined").length,
        ts.filter((t) => t.status === "checked_in").length, pct(conf, ts.length)];
    });
  catRows.push(["Total", n.sent, n.confirmed, n.pending, n.declined, hosts.filter((t) => t.status === "checked_in").length, pct(n.confirmed, n.sent)]);
  const r2 = block(8, 7, "Por categoría", ["Categoría", "Invitados", "Confirm.", "Pend.", "Declin.", "Asist.", "% conf."], catRows, [6]);

  // Confirmaciones por día (fecha en que dejó sus datos).
  const perDay = new Map<string, number>();
  for (const t of hosts.filter(confirmed)) {
    const d = day(t.buyer?.dataConsentAt || t.updatedAt);
    if (d) perDay.set(d, (perDay.get(d) || 0) + 1);
  }
  const days = [...perDay.keys()].sort();
  let acc = 0;
  const dayRows = days.map((d) => [d, perDay.get(d)!, (acc += perDay.get(d)!)]);
  const r3 = block(Math.max(r2, r1) + 1, 7, "Confirmaciones por día", ["Fecha", "Confirmaciones", "Acumulado"], dayRows);

  // Gráficos
  const chartTop = Math.max(r1, r3) + 1;
  const donut = wb.addImage({
    base64: donutPng("Estado de las invitaciones", [
      { label: "Confirmados", value: n.confirmed, color: hex(C.confirmed) },
      { label: "Pendientes", value: n.pending, color: hex(C.pending) },
      { label: "Declinaron", value: n.declined, color: hex(C.declined) },
      ...(n.canceled ? [{ label: "Anuladas", value: n.canceled, color: hex(C.canceled) }] : []),
    ]),
    extension: "png",
  });
  ws.addImage(donut, { tl: { col: 0, row: chartTop }, ext: { width: 520, height: 300 } });
  if (days.length) {
    const bars = wb.addImage({
      base64: barsPng("Confirmaciones por día", days.map((d) => d.slice(5)), days.map((d) => perDay.get(d)!), hex(C.confirmed), dayRows.map((r) => r[2] as number)),
      extension: "png",
    });
    ws.addImage(bars, { tl: { col: 6, row: chartTop }, ext: { width: 720, height: 300 } });
  }

  /* Hojas de detalle (Tablas de Excel con filtro) */
  const cols: { header: string; width: number; value: (t: Row) => unknown }[] = [
    { header: "Nombre", width: 28, value: (t) => t.buyer?.name },
    { header: "Correo", width: 32, value: (t) => t.buyer?.email },
    { header: "Estado", width: 13, value: (t) => STATUS_LABEL[t.status] || t.status },
    { header: "Categoría", width: 14, value: (t) => t.inviteCategory },
    { header: "Personas", width: 10, value: (t) => t.admits ?? 1 },
    { header: "Acompañante", width: 26, value: (t) => t.companionName },
    { header: "Invitado por", width: 24, value: (t) => t.inviteHostName },
    { header: "Teléfono", width: 15, value: (t) => t.buyer?.phone },
    { header: "Tipo doc.", width: 10, value: (t) => t.buyer?.documentType },
    { header: "Identificación", width: 16, value: (t) => t.buyer?.documentNumber },
    { header: "Ciudad", width: 14, value: (t) => t.buyer?.city },
    { header: "Dirección", width: 30, value: (t) => t.buyer?.address },
    { header: "Compañía", width: 22, value: (t) => t.buyer?.company },
    { header: "Cargo", width: 20, value: (t) => t.buyer?.position },
    { header: "Origen", width: 18, value: (t) => (t.inviteLink ? `/i/${t.inviteLink}` : "Lista") },
    { header: "Invitado el", width: 16, value: (t) => fmtDate(t.createdAt) },
    { header: "Confirmó el", width: 16, value: (t) => fmtDate(t.buyer?.dataConsentAt) },
    { header: "WhatsApp", width: 10, value: (t) => (t.whatsappSentAt ? "Sí" : "") },
    { header: "Código", width: 11, value: (t) => t.shortCode },
  ];
  const sheet = (name: string, data: Row[], color: string) => {
    const s = wb.addWorksheet(`${name} (${data.length})`, { views: [{ state: "frozen", ySplit: 1 }], properties: { tabColor: { argb: color } } });
    s.columns = cols.map((c) => ({ width: c.width }));
    s.addTable({
      name: name.replace(/\W/g, "") || "Tabla",
      ref: "A1",
      headerRow: true,
      style: { theme: "TableStyleMedium15", showRowStripes: true },
      columns: cols.map((c) => ({ name: c.header, filterButton: true })),
      // Teléfonos y documentos como texto: Excel no les quita ceros.
      rows: (data.length ? data : [{} as Row]).map((t) => cols.map((c) => { const v = c.value(t); return v == null ? "" : typeof v === "number" ? v : String(v); })),
    });
  };
  sheet("Confirmados", hosts.filter(confirmed), C.confirmed);
  sheet("Pendientes", hosts.filter((t) => t.status === "invited"), C.pending);
  sheet("Declinaron", hosts.filter((t) => t.status === "declined"), C.declined);
  sheet("Acompañantes", companions, C.companions);
  sheet("Asistieron", rows.filter((t) => t.status === "checked_in"), C.attended);
  sheet("Todos", rows, C.ink);

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `invitaciones_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
