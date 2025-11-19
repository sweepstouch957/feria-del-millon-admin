"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  TextField,
  Typography,
  Modal,
  Fade,
  Backdrop,
} from "@mui/material";
import {
  QrCode2 as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  HighlightOff as HighlightOffIcon,
  CameraAlt as CameraIcon,
} from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";
import { CameraOffIcon } from "lucide-react";

import { validateQr } from "@services/ticket.service";
import { BetterQrScanner } from "./BetterQrScanner";

type ValidationResult = {
  ok: boolean;
  status?: "checked_in" | "already_checked_in";
  sameDay?: boolean;
  shortCode?: string;
  eventDay?: string;
  scannedAt?: string;
  error?: string;
};

export function QrValidationPanel() {
  const [token, setToken] = useState("");
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(true);

  // Overlay de éxito
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Para evitar disparar doble cuando ZXing detecta varias veces el mismo QR
  const lastScannedTokenRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { token: string }) => validateQr(payload),
    onSuccess: (data) => {
      const result: ValidationResult = {
        ok: data.ok,
        status: data.status,
        sameDay: data.sameDay,
        shortCode: data.ticket.shortCode,
        eventDay: data.ticket.eventDay,
        scannedAt: data.ticket.scannedAt,
      };
      setLastResult(result);

      // Éxito "real": check-in registrado y mismo día
      if (result.ok && result.sameDay && result.status === "checked_in") {
        setShowSuccess(true);
      }
    },
    onError: (err: any) => {
      const message =
        err?.response?.data?.error === "invalid_qr"
          ? "QR inválido o manipulado."
          : err?.response?.data?.error === "ticket_not_found"
            ? "No se encontró el boleto."
            : "Error al validar el QR.";
      setLastResult({
        ok: false,
        error: message,
      });
    },
    onSettled: () => {
      // Cuando termina una validación, reseteamos el “último leído”
      lastScannedTokenRef.current = null;
    },
  });

  const handleValidate = () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    mutation.mutate({ token: trimmed });
  };

  const handleScanFromCamera = (scanned: string | null) => {
    if (!scanned) return;
    const trimmed = scanned.trim();

    // Evitamos validar el mismo token mientras una petición está en curso
    if (lastScannedTokenRef.current === trimmed && mutation.isPending) return;
    lastScannedTokenRef.current = trimmed;

    setScannerOpen(false); // cerramos un momento para que no re-dispare
    setToken(trimmed);
    mutation.mutate({ token: trimmed });
  };

  // Control del overlay de éxito (3 segundos y reset)
  useEffect(() => {
    if (!showSuccess) return;

    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }

    successTimerRef.current = setTimeout(() => {
      setShowSuccess(false);
      setLastResult(null);
      setToken("");
      setScannerOpen(true); // reabrimos cámara para el siguiente
    }, 3000);

    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [showSuccess]);

  const severity: "success" | "warning" | "error" =
    lastResult?.ok && lastResult.sameDay
      ? "success"
      : lastResult?.ok && !lastResult.sameDay
        ? "warning"
        : "error";

  const statusLabel = () => {
    if (!lastResult) return "";
    if (!lastResult.ok && lastResult.error) return lastResult.error;

    if (lastResult.status === "already_checked_in") {
      if (lastResult.sameDay) {
        return "El boleto ya fue escaneado hoy.";
      }
      return "El boleto ya fue escaneado y no corresponde al día actual.";
    }

    if (lastResult.status === "checked_in") {
      if (lastResult.sameDay) {
        return "Acceso permitido: boleto válido para hoy ✅";
      }
      return "Boleto válido pero para otro día. Revisa la fecha antes de permitir el acceso.";
    }

    return "Resultado desconocido.";
  };

  const icon =
    severity === "success" ? <CheckCircleIcon /> : <HighlightOffIcon />;

  return (
    <>
      {/* Card principal */}
      <Card
        sx={{
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CardHeader
          avatar={<QrCodeIcon />}
          title="Validación de acceso por QR"
          subheader="Escanea el QR con la cámara o pega el token para validar la entrada."
        />
        <CardContent>
          <Stack spacing={1.5}>
            {/* Campo para pegar token manualmente */}
            <TextField
              label="Token del QR"
              placeholder="Pega aquí el token leído por el escáner"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              fullWidth
              size="small"
              multiline
              minRows={2}
            />

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<QrCodeIcon />}
                onClick={handleValidate}
                disabled={!token.trim() || mutation.isPending}
              >
                Validar acceso
              </Button>

              <Button
                variant={scannerOpen ? "outlined" : "contained"}
                color={scannerOpen ? "secondary" : "primary"}
                startIcon={scannerOpen ? <CameraOffIcon /> : <CameraIcon />}
                onClick={() => setScannerOpen((prev) => !prev)}
              >
                {scannerOpen ? "Pausar cámara" : "Escanear con cámara"}
              </Button>
            </Stack>

            {/* VISOR DE CÁMARA (ZXing) */}
            {scannerOpen && (
              <Box mt={1} display="flex" justifyContent="center">
                <BetterQrScanner
                  active={scannerOpen}
                  onResult={(text) => {
                    if (!text) return;
                    handleScanFromCamera(text);
                  }}
                  onError={(err) => {
                    // si quieres loguear algo
                    // console.warn("[BetterQrScanner error]", err);
                  }}
                />
              </Box>
            )}

            {lastResult && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Alert severity={severity} icon={icon}>
                  {statusLabel()}
                </Alert>

                {lastResult.ok && (
                  <Box mt={1}>
                    <Typography variant="subtitle2" gutterBottom>
                      Detalle del boleto
                    </Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">
                        <strong>Código:</strong> {lastResult.shortCode}
                      </Typography>
                      {lastResult.eventDay && (
                        <Typography variant="body2">
                          <strong>Día del boleto:</strong>{" "}
                          {new Date(lastResult.eventDay)
                            .toISOString()
                            .slice(0, 10)}
                        </Typography>
                      )}
                      {lastResult.scannedAt && (
                        <Typography variant="body2">
                          <strong>Último scan:</strong>{" "}
                          {new Date(
                            lastResult.scannedAt
                          ).toLocaleString("es-CO")}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        <strong>Estado:</strong>{" "}
                        {lastResult.status === "checked_in"
                          ? "Check-in registrado"
                          : lastResult.status === "already_checked_in"
                            ? "Ya escaneado"
                            : "Desconocido"}
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Overlay de éxito (pantalla verde grande) */}
      <Modal
        open={showSuccess}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 300,
          },
        }}
      >
        <Fade in={showSuccess}>
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.6)",
              zIndex: (theme) => theme.zIndex.modal + 1,
            }}
          >
            <Box
              sx={{
                bgcolor: "#022c22",
                color: "#ecfdf5",
                borderRadius: 4,
                px: 4,
                py: 3,
                maxWidth: 420,
                textAlign: "center",
                boxShadow: 8,
                border: "1px solid rgba(16,185,129,0.4)",
              }}
            >
              <CheckCircleIcon
                sx={{ fontSize: 52, color: "#22c55e", mb: 1 }}
              />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Acceso permitido
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Boleto válido para hoy. Puede ingresar ✅
              </Typography>

              {lastResult?.shortCode && (
                <Typography
                  variant="h6"
                  mt={2}
                  sx={{ letterSpacing: 2, fontWeight: 800 }}
                >
                  {lastResult.shortCode}
                </Typography>
              )}

              {lastResult?.eventDay && (
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  Día del boleto:{" "}
                  {new Date(lastResult.eventDay).toISOString().slice(0, 10)}
                </Typography>
              )}

              <Typography
                variant="caption"
                display="block"
                mt={2}
                sx={{ opacity: 0.7 }}
              >
                Este mensaje se cerrará automáticamente.
              </Typography>
            </Box>
          </Box>
        </Fade>
      </Modal>
    </>
  );
}
