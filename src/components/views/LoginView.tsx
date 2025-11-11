/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Container,
  Alert,
  InputAdornment,
  IconButton,
  Stack,
  CircularProgress,
} from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/provider/authProvider";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

const FullScreenBlocking = ({ text = "Cargando…" }: { text?: string }) => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: (t) =>
        t.palette.mode === "dark" ? "#0b0b0b" : "#f5f5f5",
      px: 2,
    }}
  >
    <Stack alignItems="center" spacing={2}>
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Stack>
  </Box>
);

const LoginClient: React.FC = () => {
  const router = useRouter();
  const { login: loginCtx, isAuthenticated, isAuthLoading } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirige si ya está autenticado
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setSubmitting(true);

      if (!emailOrPhone.trim() || !password) {
        setErrorMsg("Ingresa tus credenciales.");
        return;
      }
      await loginCtx(emailOrPhone.trim(), password);
      // El AuthProvider hace router.replace("/")
    } catch (err: any) {
      // Si el AuthProvider ya maneja onError, esto es por si acaso
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo iniciar sesión. Verifica tus datos.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Gate para evitar “flash” del formulario
  if (isAuthLoading || submitting || isAuthenticated) {
    return (
      <FullScreenBlocking
        text={submitting ? "Iniciando sesión…" : "Cargando…"}
      />
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: (t) =>
          t.palette.mode === "dark" ? "#0b0b0b" : "#f5f5f5",
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            maxWidth: 420,
            mx: "auto",
            p: 2,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            borderRadius: 3,
            border: (t) =>
              t.palette.mode === "dark"
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <CardContent>
            <Box
              sx={{
                textAlign: "center",
                mb: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src="/logo.png"
                alt="SweepsTouch"
                width={200}
                height={64}
                style={{ objectFit: "contain" }}
                priority
              />
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMsg}
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                margin="normal"
                label="Email o teléfono"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="ej. usuario@correo.com o 3471234567"
                autoComplete="username"
                required
              />

              <TextField
                fullWidth
                margin="normal"
                label="Contraseña"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                autoComplete="current-password"
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="mostrar contraseña"
                        onClick={() => setShowPwd((v) => !v)}
                        edge="end"
                      >
                        {showPwd ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ textAlign: "left", mt: 1, mb: 2 }}>
                <Link
                  href="#"
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={!emailOrPhone || !password}
                sx={{
                  mt: 2,
                  py: 1.5,
                  fontWeight: 700,
                  borderRadius: 2,
                  backgroundColor: (t) =>
                    t.palette.mode === "dark"
                      ? t.palette.grey[800]
                      : t.palette.grey[900],
                  "&:hover": {
                    backgroundColor: (t) =>
                      t.palette.mode === "dark"
                        ? t.palette.grey[700]
                        : t.palette.grey[800],
                  },
                }}
              >
                Iniciar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginClient;
