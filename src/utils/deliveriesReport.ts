import type { DeliveryArtist } from "@services/orders.service";
import { canExport } from "@/utils/exportsLock";

/* Excel de "Entregas de artistas": una hoja con el resumen por artista (con
   fila de total) y otra con cada obra. Exporta lo que está en pantalla, así
   que respeta los filtros (p. ej. solo los que ya entregaron todo). */

const STATUS: Record<string, string> = { delivered: "Entregada", pending: "Por entregar", returned: "Devuelta" };
const day = (iso?: string | null) => (iso ? new Date(iso) : null);

export async function downloadDeliveriesReport(rows: DeliveryArtist[], label: string) {
  if (!canExport()) return;
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Panel Feria del Millón";
  wb.created = new Date();
  const money = '"$"#,##0';
  const date = "dd/mm/yyyy";
  const head = (ws: import("exceljs").Worksheet) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECEAE3" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  const a = wb.addWorksheet("Artistas");
  a.columns = [
    { header: "Artista", key: "name", width: 32 },
    { header: "Correo", key: "email", width: 30 },
    { header: "Teléfono", key: "phone", width: 16 },
    { header: "Obras vendidas", key: "sold", width: 15 },
    { header: "Entregadas", key: "delivered", width: 12 },
    { header: "Por entregar", key: "pending", width: 13 },
    { header: "Devueltas", key: "returned", width: 11 },
    { header: "Total vendido (COP)", key: "soldAmount", width: 20, style: { numFmt: money } },
    { header: "Valor entregado (COP)", key: "deliveredAmount", width: 21, style: { numFmt: money } },
    { header: "Valor por entregar (COP)", key: "pendingAmount", width: 23, style: { numFmt: money } },
    { header: "Estado", key: "state", width: 16 },
    { header: "Última entrega", key: "last", width: 15, style: { numFmt: date } },
  ];
  head(a);
  for (const r of rows) {
    a.addRow({ ...r, state: r.pending === 0 ? "Entregó todo" : `Le faltan ${r.pending}`, last: day(r.lastDeliveredAt) });
  }
  const sum = (k: "sold" | "delivered" | "pending" | "returned" | "soldAmount" | "deliveredAmount" | "pendingAmount") => rows.reduce((t, r) => t + (r[k] || 0), 0);
  const total = a.addRow({
    name: `TOTAL · ${rows.length} ${rows.length === 1 ? "artista" : "artistas"} (${label})`,
    sold: sum("sold"), delivered: sum("delivered"), pending: sum("pending"), returned: sum("returned"),
    soldAmount: sum("soldAmount"), deliveredAmount: sum("deliveredAmount"), pendingAmount: sum("pendingAmount"),
  });
  total.font = { bold: true };
  total.eachCell((c) => (c.border = { top: { style: "thin" } }));

  const o = wb.addWorksheet("Obras");
  o.columns = [
    { header: "Artista", key: "artist", width: 32 },
    { header: "Obra", key: "title", width: 36 },
    { header: "Cantidad", key: "qty", width: 10 },
    { header: "Valor (COP)", key: "amount", width: 16, style: { numFmt: money } },
    { header: "Pedido", key: "code", width: 12 },
    { header: "Vendida", key: "soldAt", width: 13, style: { numFmt: date } },
    { header: "Comprador", key: "buyer", width: 28 },
    { header: "Teléfono comprador", key: "buyerPhone", width: 19 },
    { header: "Estado", key: "status", width: 14 },
    { header: "Entregada el", key: "deliveredAt", width: 14, style: { numFmt: date } },
  ];
  head(o);
  for (const r of rows) {
    for (const i of r.items) {
      o.addRow({ artist: r.name, title: i.title, qty: i.qty, amount: i.amount, code: i.code, soldAt: day(i.soldAt), buyer: i.buyer, buyerPhone: i.buyerPhone, status: STATUS[i.status] || i.status, deliveredAt: day(i.deliveredAt) });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `entregas_artistas_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
