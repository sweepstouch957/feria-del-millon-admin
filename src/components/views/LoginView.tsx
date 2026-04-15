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
  Link as MuiLink,
  Container,
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
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const FullScreenBlocking = ({ text = "Cargando…" }: { text?: string }) => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000",
      px: 2,
    }}
  >
    <Stack alignItems="center" spacing={3}>
      <CircularProgress sx={{ color: "#22c55e" }} />
      <Typography variant="body2" sx={{ color: "#a1a1aa", fontWeight: 600 }}>
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
        setErrorMsg("Por favor, ingresa tus credenciales completas.");
        return;
      }
      await loginCtx(emailOrPhone.trim(), password);
      // El AuthProvider hace router.replace("/")
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Credenciales incorrectas. Verifica tus datos de acceso.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Gate para evitar “flash” del formulario
  if (isAuthLoading || submitting || isAuthenticated) {
    return (
      <FullScreenBlocking
        text={submitting ? "Autenticando administración…" : "Cargando entorno seguro…"}
      />
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        overflow: "hidden",
        px: 2,
      }}
    >
      {/* Glow Effects */}
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: "40vw",
          height: "40vw",
          background: "rgba(34, 197, 94, 0.08)",
          filter: "blur(120px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "10%",
          right: "20%",
          width: "30vw",
          height: "30vw",
          background: "rgba(255, 255, 255, 0.03)",
          filter: "blur(100px)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="xs" sx={{ position: "relative", zIndex: 10 }}>
        <Card
          sx={{
            background: "rgba(18, 18, 18, 0.6)",
            backdropFilter: "blur(20px)",
            borderRadius: "24px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
            overflow: "hidden",
            transition: "transform 0.3s ease",
            "&:hover": {
              borderColor: "rgba(255, 255, 255, 0.2)",
              transform: "translateY(-4px)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.9), 0 0 40px rgba(34, 197, 94, 0.05)",
            },
          }}
        >
          <CardContent sx={{ p: { xs: 4, sm: 5 } }}>
            <Box
              sx={{
                textAlign: "center",
                mb: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  background: "rgba(255,255,255,1)",
                  p: 2,
                  borderRadius: "16px",
                  mb: 3,
                  boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Image
                  src="/logo.png"
                  alt="Feria del Millón"
                  width={140}
                  height={50}
                  style={{ objectFit: "contain", filter: "invert(0)" }}
                  priority
                />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                Panel Administrativo
              </Typography>
              <Typography variant="body2" sx={{ color: "#a1a1aa", mt: 1, fontWeight: 500 }}>
                Control y gestión centralizada
              </Typography>
            </Box>

            {errorMsg && (
              <Box
                sx={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "12px",
                  p: 2,
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#f87171",
                    boxShadow: "0 0 10px #f87171",
                  }}
                />
                <Typography variant="body2" sx={{ color: "#fca5a5", fontWeight: 600 }}>
                  {errorMsg}
                </Typography>
              </Box>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <TextField
                fullWidth
                margin="normal"
                label="Usuario o Correo"
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="admin@correo.com"
                autoComplete="username"
                required
                variant="outlined"
                InputLabelProps={{
                  sx: { color: "#71717a", fontWeight: 600, "&.Mui-focused": { color: "#22c55e" } },
                }}
                inputProps={{
                  sx: { color: "#fff", fontWeight: 500 },
                }}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    background: "#0a0a0a",
                    borderRadius: "16px",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)", transition: "all 0.3s" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                    "&.Mui-focused fieldset": { borderColor: "rgba(34,197,94,0.5)", borderWidth: "1px" },
                    "&.Mui-focused": {
                      background: "rgba(34, 197, 94, 0.05)",
                      boxShadow: "0 0 0 4px rgba(34,197,94,0.1)",
                    },
                  },
                }}
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
                InputLabelProps={{
                  sx: { color: "#71717a", fontWeight: 600, "&.Mui-focused": { color: "#22c55e" } },
                }}
                inputProps={{
                  sx: { color: "#fff", fontWeight: 500 },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: "#71717a" }} fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="mostrar contraseña"
                        onClick={() => setShowPwd((v) => !v)}
                        edge="end"
                        sx={{ color: "#71717a", "&:hover": { color: "#fff" } }}
                      >
                        {showPwd ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    background: "#0a0a0a",
                    borderRadius: "16px",
                    "& fieldset": { borderColor: "rgba(255,255,255,0.1)", transition: "all 0.3s" },
                    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
                    "&.Mui-focused fieldset": { borderColor: "rgba(34,197,94,0.5)", borderWidth: "1px" },
                    "&.Mui-focused": {
                      background: "rgba(34, 197, 94, 0.05)",
                      boxShadow: "0 0 0 4px rgba(34,197,94,0.1)",
                    },
                  },
                }}
              />

              <Box sx={{ textAlign: "right", mb: 4 }}>
                <MuiLink
                  href="#"
                  variant="caption"
                  sx={{
                    color: "#71717a",
                    fontWeight: 600,
                    textDecoration: "none",
                    "&:hover": { color: "#fff" },
                    transition: "color 0.2s",
                  }}
                >
                  ¿Necesitas acceso?
                </MuiLink>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={!emailOrPhone || !password}
                sx={{
                  py: 1.8,
                  fontWeight: 900,
                  fontSize: "0.95rem",
                  letterSpacing: "0.5px",
                  borderRadius: "14px",
                  color: "#000",
                  textTransform: "none",
                  background: "linear-gradient(to right, #22c55e, #16a34a)",
                  boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    background: "linear-gradient(to right, #16a34a, #15803d)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 25px rgba(34, 197, 94, 0.5)",
                  },
                  "&:disabled": {
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.3)",
                    boxShadow: "none",
                  },
                }}
              >
                Autorizar Ingreso
              </Button>
            </form>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginClient;
