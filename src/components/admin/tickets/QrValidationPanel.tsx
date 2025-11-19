"use client";

import { useState } from "react";
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
} from "@mui/material";
import {
  QrCode2 as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  HighlightOff as HighlightOffIcon,
} from "@mui/icons-material";
import { useMutation } from "@tanstack/react-query";

import { validateQr } from "@services/ticket.service";

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

  const mutation = useMutation({
    mutationFn: () => validateQr({ token: token.trim() }),
    onSuccess: (data) => {
      setLastResult({
        ok: data.ok,
        status: data.status,
        sameDay: data.sameDay,
        shortCode: data.ticket.shortCode,
        eventDay: data.ticket.eventDay,
        scannedAt: data.ticket.scannedAt,
      });
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
  });

  const handleValidate = () => {
    if (!token.trim()) return;
    mutation.mutate();
  };

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
    severity === "success" ? (
      <CheckCircleIcon />
    ) : (
      <HighlightOffIcon />
    );

  return (
    <Card
      sx={{
        borderRadius: 4,
        border: "1px solid",
        borderColor: "divider",
        position: "sticky",
        top: 88,
      }}
    >
      <CardHeader
        avatar={<QrCodeIcon />}
        title="Validación de acceso por QR"
        subheader="Escanea el QR y pega el token para validar la entrada."
      />
      <CardContent>
        <Stack spacing={1.5}>
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
          <Button
            variant="contained"
            startIcon={<QrCodeIcon />}
            onClick={handleValidate}
            disabled={!token.trim() || mutation.isPending}
          >
            Validar acceso
          </Button>

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
                        {new Date(lastResult.eventDay).toISOString().slice(0, 10)}
                      </Typography>
                    )}
                    {lastResult.scannedAt && (
                      <Typography variant="body2">
                        <strong>Último scan:</strong>{" "}
                        {new Date(lastResult.scannedAt).toLocaleString("es-CO")}
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
  );
}
