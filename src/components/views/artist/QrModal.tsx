"use client";

import { useMemo } from "react";
import Image from "next/image";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
} from "@mui/material";
import { Download, ExternalLink, X, QrCode } from "lucide-react";
import { useArtworkDetail } from "@hooks/useArtworkDetail";

export default function QRModal({
  artworkId,
  open,
  onClose,
}: {
  artworkId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const enabled = Boolean(open && artworkId);
  const { data, isFetching } = useArtworkDetail(
    enabled ? artworkId! : undefined
  );

  const { qrImg, qrTarget, title } = useMemo(() => {
    const doc: any = data?.doc;
    const qr = doc?.meta?.qrPublic || {};
    return {
      qrImg: qr.imageUrl as string | undefined,
      qrTarget: qr.target as string | undefined,
      title: (doc?.title as string) || "QR",
    };
  }, [data]);

  const downloadQr = async () => {
    if (!qrImg) return;
    const resp = await fetch(qrImg);
    const blob = await resp.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-qr.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pr: 5,
        }}
      >
        <QrCode className="w-4 h-4" />
        Código QR
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ ml: "auto" }}
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isFetching ? (
          <Box
            sx={{
              py: 6,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Cargando QR…
            </Typography>
          </Box>
        ) : qrImg ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                width: "100%",
                position: "relative",
                borderRadius: 3,
                bgcolor: "grey.50",
                border: "1px solid",
                borderColor: "grey.200",
                overflow: "hidden",
                aspectRatio: "1 / 1",
              }}
            >
              <Image
                src={qrImg}
                alt="QR"
                fill
                sizes="320px"
                style={{
                  objectFit: "contain",
                  padding: 16,
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              py: 6,
              textAlign: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No se encontró un QR para esta obra.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {qrImg && (
          <Button
            variant="outlined"
            size="small"
            onClick={downloadQr}
            startIcon={<Download className="w-4 h-4" />}
          >
            Descargar QR
          </Button>
        )}
        {qrImg && qrTarget && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.open(qrTarget, "_blank")}
            startIcon={<ExternalLink className="w-4 h-4" />}
          >
            Abrir destino
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
