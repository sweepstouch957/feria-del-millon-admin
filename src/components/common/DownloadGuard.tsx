"use client";

import { useEffect } from "react";
import { EXPORTS_ENABLED, canExport } from "@/utils/exportsLock";

/**
 * Bloqueo global de archivos (utils/exportsLock): todo lo que el panel descarga
 * (Excel, CSV, PDF, QR, ZIP) sale por un <a download>. Con las descargas
 * bloqueadas, ese clic no hace nada, sea programático (a.click()) o del usuario.
 */
export default function DownloadGuard() {
  useEffect(() => {
    if (EXPORTS_ENABLED) return;
    const proto = HTMLAnchorElement.prototype;
    const original = proto.click;
    proto.click = function (this: HTMLAnchorElement) {
      if (this.hasAttribute("download")) { canExport(); return; }
      return original.call(this);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[download]");
      if (a) { e.preventDefault(); e.stopPropagation(); canExport(); }
    };
    document.addEventListener("click", onClick, true);
    return () => {
      proto.click = original;
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
