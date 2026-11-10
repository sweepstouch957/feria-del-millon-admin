// Interruptores del panel. En true todo funciona normal.
//  - EXPORTS_ENABLED: cualquier archivo (Excel, CSV, PDF, QR, ZIP); DownloadGuard lo aplica en todo el panel.
//  - SALES_DETAIL_ENABLED: listas y reportes de ventas al detalle (pedidos, compradores, líneas, cierre, taquilla).
export const EXPORTS_ENABLED = true;
export const SALES_DETAIL_ENABLED = true;

/** true si se puede exportar; si no, avisa y devuelve false. */
export function canExport(): boolean {
  if (EXPORTS_ENABLED) return true;
  if (typeof window !== "undefined") window.alert("Ocurrió un error al generar el archivo. Intenta de nuevo más tarde.");
  return false;
}
