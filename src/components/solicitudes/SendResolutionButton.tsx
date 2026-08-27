"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useQueryClient } from "@tanstack/react-query";
import {
  previewResolutionSend,
  sendResolutionToAll,
  type ResolutionSummary,
} from "@/services/applications.service";

/* Enviar la resolución a todos los artistas con decisión tomada.
   Dos pasos a propósito: primero se consulta a cuántos se le va a escribir y
   recién ahí se confirma. Un envío masivo de correos no se deshace. */

export default function SendResolutionButton({
  convocatoria,
}: {
  convocatoria?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ResolutionSummary | null>(null);
  const [result, setResult] = useState<ResolutionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openDialog = async () => {
    setOpen(true);
    setResult(null);
    setError(null);
    setPreview(null);
    setLoading(true);
    try {
      setPreview(await previewResolutionSend(convocatoria));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "No se pudo consultar");
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const out = await sendResolutionToAll(convocatoria);
      setResult(out);
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["application-stats"] });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Falló el envío");
    } finally {
      setLoading(false);
    }
  };

  const nothingToSend = !!preview && preview.total === 0;

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SendIcon />}
        onClick={openDialog}
        sx={{ whiteSpace: "nowrap" }}
      >
        Enviar resolución
      </Button>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 500 }}>Enviar resolución</DialogTitle>

        <DialogContent>
          {loading && !result && (
            <Stack alignItems="center" py={3}>
              <CircularProgress size={26} />
            </Stack>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && preview && !result && (
            <Stack spacing={1.5}>
              {nothingToSend ? (
                <Typography variant="body2">
                  No hay resoluciones pendientes de comunicar. Todos los artistas
                  con decisión ya fueron avisados.
                </Typography>
              ) : (
                <>
                  <Typography variant="body2">
                    Se le va a escribir a <strong>{preview.total}</strong>{" "}
                    {preview.total === 1 ? "artista" : "artistas"}:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    · {preview.accepted} aceptado{preview.accepted === 1 ? "" : "s"}
                    <br />· {preview.rejected} rechazado{preview.rejected === 1 ? "" : "s"}
                  </Typography>
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Los correos salen de inmediato y no se pueden deshacer. Sólo
                    se escribe a quien todavía no fue avisado.
                  </Alert>
                </>
              )}
            </Stack>
          )}

          {result && (
            <Stack spacing={1.5}>
              <Alert severity={result.failed?.length ? "warning" : "success"}>
                Se enviaron {result.sent} de {result.total}.
              </Alert>
              {!!result.failed?.length && (
                <Typography variant="caption" color="text.secondary">
                  {result.failed.length} sin enviar (
                  {result.failed[0]?.reason}
                  {result.failed.length > 1 ? " y otros" : ""}). Podés reintentar:
                  no se reenvía a los ya avisados.
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            {result ? "Cerrar" : "Cancelar"}
          </Button>
          {!result && (
            <Button
              variant="contained"
              onClick={confirm}
              disabled={loading || !preview || nothingToSend}
            >
              Enviar a {preview?.total ?? 0}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
