"use client";

import { useRef, useState } from "react";
import { Box, Button, CircularProgress, IconButton, Typography } from "@mui/material";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { uploadCampaignImage } from "@services/upload.service";

/**
 * Foto opcional del comprobante de transferencia. En el celular abre la
 * cámara trasera; sube a Cloudinary y devuelve la URL.
 */
export function ReceiptInput({
  value,
  onChange,
  onUploading,
}: {
  value: string;
  onChange: (url: string) => void;
  onUploading: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    onUploading(true);
    try {
      const { url } = await uploadCampaignImage(file, "comprobantes");
      onChange(url);
    } catch {
      toast.error("No se pudo subir la foto. Puedes cobrar sin ella.");
    } finally {
      setBusy(false);
      onUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Box>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void upload(e.target.files?.[0])}
      />
      {value ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            component="a"
            href={value}
            target="_blank"
            rel="noreferrer"
            sx={{ width: 64, height: 64, flexShrink: 0, backgroundImage: `url(${value})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid", borderColor: "divider" }}
          />
          <Typography variant="body2" sx={{ flex: 1 }}>Comprobante adjunto</Typography>
          <IconButton aria-label="Quitar comprobante" onClick={() => onChange("")}>
            <X size={18} />
          </IconButton>
        </Box>
      ) : (
        <Button
          variant="outlined"
          fullWidth
          startIcon={busy ? <CircularProgress size={16} /> : <Camera size={18} />}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          sx={{ py: 1.25, textTransform: "none" }}
        >
          {busy ? "Subiendo foto…" : "Foto del comprobante (opcional)"}
        </Button>
      )}
    </Box>
  );
}
