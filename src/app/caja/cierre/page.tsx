import { MySalesPage } from "@features/caja/components/MySalesPage";

// Abierto aun con el bloqueo: cada cajera ve su propio cierre (sin descargar: EXPORTS_ENABLED).
export default function Page() {
  return <MySalesPage />;
}
