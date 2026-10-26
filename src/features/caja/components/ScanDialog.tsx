"use client";

import { useEffect, useRef } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, useMediaQuery, useTheme } from "@mui/material";
import dynamic from "next/dynamic";

// La librería de lectura pesa: se baja solo cuando abren la cámara.
const BetterQrScanner = dynamic(
  () => import("@/components/admin/tickets/BetterQrScanner").then((m) => m.BetterQrScanner),
  { ssr: false },
);

/** Cámara a pantalla completa en el celular; toma la primera lectura y cierra. */
export function ScanDialog({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
}) {
  const fullScreen = useMediaQuery(useTheme().breakpoints.down("sm"));
  const handled = useRef(false);
  useEffect(() => {
    if (open) handled.current = false;
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="xs">
      <DialogTitle>Escanear QR</DialogTitle>
      <DialogContent>
        <Box sx={{ aspectRatio: "1", bgcolor: "black", overflow: "hidden" }}>
          {open && (
            <BetterQrScanner
              active={open}
              onResult={(text) => {
                if (handled.current || !text) return;
                handled.current = true;
                onScan(text);
              }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
          Apunta al QR de la etiqueta de la obra o al QR del artista.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="large">Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
}
