"use client";

import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Portal, Typography } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import dynamic from "next/dynamic";
import { FDM } from "@/app/theme";

// La librería de lectura pesa: se baja solo cuando abren la cámara.
const BetterQrScanner = dynamic(
  () => import("@/components/admin/tickets/BetterQrScanner").then((m) => m.BetterQrScanner),
  { ssr: false },
);

const fade = keyframes`from{opacity:0}to{opacity:1}`;
const logoIn = keyframes`
  0%{opacity:0;transform:scale(.7) translateY(14px);filter:blur(6px)}
  40%{opacity:1;transform:scale(1.04) translateY(0);filter:blur(0)}
  60%{transform:scale(1)}
  100%{opacity:1;transform:scale(1)}`;
const pulse = keyframes`0%,100%{transform:scale(1);opacity:.35}50%{transform:scale(1.25);opacity:0}`;
const sweep = keyframes`0%{top:8%}50%{top:90%}100%{top:8%}`;

// ponytail: el diseño muestra el logo 1,8 s; aquí 1,1 s y la cámara ya va
// encendiendo detrás, para que la cajera no espere.
const INTRO_MS = 1100;

const corner = (pos: Record<string, number>, sides: string[]) => ({
  position: "absolute", width: 34, height: 34, ...pos,
  ...Object.fromEntries(sides.map((s) => [`border${s}`, `3px solid ${FDM.green}`])),
  [`border${sides.join("")}Radius`]: 10,
}) as const;

/** Lector a pantalla completa: fondo difuminado → logo animado → visor. Toma la primera lectura y cierra. */
export function ScanDialog({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}) {
  const handled = useRef(false);
  const [intro, setIntro] = useState(true);
  const [camError, setCamError] = useState<string | null>(null);
  // Ref: el padre pasa una función nueva en cada render y eso reiniciaba la intro.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    handled.current = false;
    setIntro(true);
    setCamError(null);
    const t = window.setTimeout(() => setIntro(false), INTRO_MS);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", esc);
    return () => { window.clearTimeout(t); window.removeEventListener("keydown", esc); };
  }, [open]);

  if (!open) return null;

  return (
    <Portal>
      <Box
        role="dialog"
        aria-modal="true"
        aria-label="Escanear obra"
        sx={(t) => ({
          position: "fixed", inset: 0, zIndex: t.zIndex.modal + 1,
          bgcolor: t.palette.mode === "dark" ? "rgba(11,11,10,.6)" : "rgba(239,238,232,.7)",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          display: "grid", placeItems: "center",
          animation: `${fade} .35s ease both`,
          "& .fdm-logo": { filter: t.palette.mode === "dark" ? "invert(1) brightness(1.1)" : "none" },
        })}
      >
        {/* Logo de entrada (se va cuando aparece el visor). */}
        {intro && (
          <Box sx={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: "22px", p: 3 }}>
            <Box sx={{ position: "relative", display: "grid", placeItems: "center" }}>
              <Box sx={(t) => ({
                position: "absolute", width: 260, height: 260, borderRadius: "50%",
                border: `1.5px solid ${t.palette.mode === "dark" ? "rgba(245,244,239,.5)" : "rgba(11,11,10,.5)"}`,
                animation: `${pulse} 1.6s ease-out infinite`,
              })} />
              <Box component="img" className="fdm-logo" src="/logo-m.png" alt="Feria del Millón"
                sx={{ width: "min(300px,70vw)", height: "auto", animation: `${logoIn} 1.1s cubic-bezier(.2,.8,.2,1) both` }} />
            </Box>
            <Typography sx={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 500, animation: `${fade} .6s .5s ease both` }}>
              Abriendo cámara…
            </Typography>
          </Box>
        )}

        {/* Visor: montado desde el inicio (la cámara enciende durante el logo), visible después. */}
        <Box sx={{
          width: "min(92vw,520px)", display: "flex", flexDirection: "column", gap: 2,
          opacity: intro ? 0 : 1, pointerEvents: intro ? "none" : "auto",
          transition: "opacity .4s ease",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box component="img" className="fdm-logo" src="/logo-m.png" alt="" sx={{ height: 28 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 500 }}>Escanear obra</Typography>
            </Box>
            <IconButton aria-label="Cerrar" onClick={onClose}
              sx={{ width: 44, height: 44, border: 1, borderColor: "divider", bgcolor: "background.paper", fontSize: 22, lineHeight: 1 }}>
              ×
            </IconButton>
          </Box>
          <Box sx={{ position: "relative", aspectRatio: "3 / 4", maxHeight: "70vh", borderRadius: "24px", overflow: "hidden", bgcolor: "#000", boxShadow: "0 30px 80px -20px rgba(0,0,0,.7)" }}>
            <Box sx={{ position: "absolute", inset: 0 }}>
              <BetterQrScanner
                active={open}
                onResult={(text) => {
                  if (handled.current || !text) return;
                  handled.current = true;
                  onScan(text);
                }}
                onError={(e: any) => {
                  // "No encontró QR en este cuadro" llega todo el tiempo: solo se muestran fallas de cámara.
                  if (e?.name === "NotAllowedError" || e?.message === "No se encontraron cámaras")
                    setCamError("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
                }}
              />
            </Box>
            {camError && (
              <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "rgba(245,244,239,.75)", fontSize: 14, textAlign: "center", p: 3 }}>
                {camError}
              </Box>
            )}
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <Box sx={{ position: "relative", width: "62%", aspectRatio: "1" }}>
                <Box sx={corner({ top: 0, left: 0 }, ["Top", "Left"])} />
                <Box sx={corner({ top: 0, right: 0 }, ["Top", "Right"])} />
                <Box sx={corner({ bottom: 0, left: 0 }, ["Bottom", "Left"])} />
                <Box sx={corner({ bottom: 0, right: 0 }, ["Bottom", "Right"])} />
                <Box sx={{
                  position: "absolute", left: "6%", right: "6%", height: 2,
                  background: `linear-gradient(90deg,transparent,${FDM.green},transparent)`,
                  boxShadow: `0 0 14px ${FDM.green}`, animation: `${sweep} 2.2s ease-in-out infinite`,
                }} />
              </Box>
            </Box>
          </Box>
          <Typography sx={{ textAlign: "center", fontSize: 13, color: "text.secondary" }}>
            Apunta al código QR de la etiqueta de la obra
          </Typography>
        </Box>
      </Box>
    </Portal>
  );
}
