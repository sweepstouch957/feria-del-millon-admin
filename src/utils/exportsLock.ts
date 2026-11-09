// Bloqueo hasta nuevo aviso: solo métricas generales en pantalla.
//  - EXPORTS_ENABLED: descargas de datos (Excel/CSV). QR, etiquetas PDF y pases no cuentan.
//  - SALES_DETAIL_ENABLED: listas y reportes de ventas al detalle (pedidos, compradores, líneas).
// Para volver a permitirlo: true y redesplegar.
export const EXPORTS_ENABLED = false;
export const SALES_DETAIL_ENABLED = false;

/** true si se puede exportar; si no, avisa y devuelve false. */
export function canExport(): boolean {
  if (EXPORTS_ENABLED) return true;
  if (typeof window !== "undefined") window.alert("La descarga de información está deshabilitada.");
  return false;
}
