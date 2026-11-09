// "Reporte Ventas" con el mismo formato que usa la feria: un bloque por día con
// Taquilla y Cajas por medio de pago, Mercado Pago aparte y el total del día.
// El sistema no distingue Bold de Credibanco: ambos van como "Datáfono".
import { fairDayTotal, type FairDay } from "@features/ingresos/model/income";
import { canExport } from "@/utils/exportsLock";

const PEACH = "FFF8CBAD", BLUE = "FFBDD7EE", PINK = "FFE6CCF0";
const MONEY = '"$" #,##0';

const dayTitle = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "short" }).toUpperCase();

/** Suma varios días en uno (el bloque "Total feria"). */
function sumDays(days: FairDay[]): FairDay {
  const add = (a: Record<string, number>, b: Record<string, number>) => { for (const [k, v] of Object.entries(b)) a[k] = (a[k] || 0) + v; return a; };
  return days.reduce<FairDay>(
    (acc, d) => ({
      day: "total",
      taquilla: add(acc.taquilla, d.taquilla),
      cajas: add(acc.cajas, d.cajas),
      mercadopago: { Entradas: acc.mercadopago.Entradas + d.mercadopago.Entradas, Obras: acc.mercadopago.Obras + d.mercadopago.Obras },
    }),
    { day: "total", taquilla: {}, cajas: {}, mercadopago: { Entradas: 0, Obras: 0 } },
  );
}

export async function downloadFairSalesReport(days: FairDay[], year = new Date().getFullYear()) {
  if (!canExport()) return;
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Panel Feria del Millón";
  wb.created = new Date();
  const ws = wb.addWorksheet("Reporte Ventas", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 18 }, { width: 26 }, { width: 20 }];
  const thin = { style: "thin" as const, color: { argb: "FF000000" } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  let r = 1;

  const block = (title: string, d: FairDay) => {
    ws.mergeCells(r, 1, r, 3);
    Object.assign(ws.getCell(r, 1), { value: `Reporte Ventas ${year}` });
    ws.getCell(r, 1).font = { bold: true, size: 12 };
    ws.getCell(r, 1).alignment = { horizontal: "center" };
    ws.getCell(r, 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PEACH } };
    ws.getCell(r, 1).border = box;
    r++;
    ws.mergeCells(r, 1, r, 2);
    ws.getCell(r, 1).value = title;
    ws.getCell(r, 3).value = "VALOR DE COMPRA";
    for (const c of [1, 3]) {
      ws.getCell(r, c).font = { bold: true };
      ws.getCell(r, c).alignment = { horizontal: "center" };
      ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PEACH } };
      ws.getCell(r, c).border = box;
    }
    r++;

    const group = (name: string, lines: [string, number][], totalLabel: string) => {
      const top = r;
      for (const [label, v] of lines) {
        ws.getCell(r, 2).value = label;
        ws.getCell(r, 3).value = v;
        ws.getCell(r, 3).numFmt = MONEY;
        [2, 3].forEach((c) => (ws.getCell(r, c).border = box));
        r++;
      }
      ws.getCell(r, 2).value = totalLabel;
      ws.getCell(r, 3).value = lines.reduce((s, [, v]) => s + v, 0);
      ws.getCell(r, 3).numFmt = MONEY;
      [2, 3].forEach((c) => {
        ws.getCell(r, c).font = { bold: true };
        ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        ws.getCell(r, c).border = box;
      });
      ws.mergeCells(top, 1, r, 1);
      ws.getCell(top, 1).value = name;
      ws.getCell(top, 1).font = { bold: true };
      ws.getCell(top, 1).alignment = { horizontal: "center", vertical: "middle" };
      ws.getCell(top, 1).border = box;
      r++;
    };

    // Las líneas en cero que no sean las de siempre (p. ej. "Link de pago Bold") no se muestran.
    const lines = (m: Record<string, number>) =>
      Object.entries(m).filter(([k, v]) => v || ["Efectivo", "Datáfono", "Transferencia"].includes(k)) as [string, number][];
    group("Taquilla", lines(d.taquilla), `TOTAL TAQUILLA ${year}`);
    group("Cajas", lines(d.cajas), `TOTAL CAJAS ${year}`);
    group("Mercado Pago", [["Entradas", d.mercadopago.Entradas], ["Obras", d.mercadopago.Obras]], `TOTAL MERCADO PAGO ${year}`);

    ws.mergeCells(r, 1, r, 2);
    ws.getCell(r, 1).value = `Total ${year}`;
    ws.getCell(r, 3).value = fairDayTotal(d);
    ws.getCell(r, 3).numFmt = MONEY;
    for (const c of [1, 3]) {
      ws.getCell(r, c).font = { bold: true };
      ws.getCell(r, c).alignment = c === 1 ? { horizontal: "center" } : {};
      ws.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PINK } };
      ws.getCell(r, c).border = box;
    }
    r += 3;
  };

  for (const d of days) block(dayTitle(d.day), d);
  if (days.length > 1) block("TOTAL FERIA", sumDays(days));

  ws.getCell(r, 1).value = "Datáfono = Bold + Credibanco (el sistema no los distingue). Mercado Pago = entradas y obras pagadas en línea. No incluye barras, merch ni inscripciones.";
  ws.getCell(r, 1).font = { italic: true, size: 9, color: { argb: "FF666666" } };

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_ventas_${days.length === 1 ? days[0].day : new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
