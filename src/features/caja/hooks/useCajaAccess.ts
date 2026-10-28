"use client";

import { useAuth } from "@/provider/authProvider";

/**
 * Qué puede hacer quien está en caja.
 * - practice: capacitación; el servidor rechaza escrituras y aquí se simulan.
 * - canLayaway: apartar con abono y cobrar cartera (jefe de caja o admin).
 */
export function useCajaAccess() {
  const { user } = useAuth();
  const r = user?.roles ?? {};
  return {
    practice: !!user?.practiceMode,
    canLayaway: !!(r.superuser || r.staff || r.jefeCaja),
    // Volver a habilitar un QR usado: mismos roles que exige tickets-svc (la cajera no).
    canReactivateQr: !!(r.superuser || r.staff || r.curador || r.taquilla),
  };
}
