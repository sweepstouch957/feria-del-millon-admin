"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, Stack, Typography, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/provider/authProvider";
import { FDM, eyebrow } from "@/app/theme";

/* ──────────────────────────────────────────────────────────────
   Acceso al panel — mismo sistema editorial que el sitio público:
   panel oscuro con el manifiesto a la izquierda, formulario a la
   derecha. La lógica de autenticación no cambió.
   ────────────────────────────────────────────────────────────── */

const line = "rgba(11,11,10,0.16)";
const dim = "rgba(11,11,10,0.6)";

const FullScreenBlocking = ({ text = "Cargando…" }: { text?: string }) => (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: FDM.panel,
      px: 2,
    }}
  >
    <Stack alignItems="center" spacing={2.5}>
      <CircularProgress size={26} sx={{ color: FDM.green }} />
      <Typography sx={{ ...eyebrow, fontSize: 10, color: "rgba(245,244,239,0.65)" }}>
        {text}
      </Typography>
    </Stack>
  </Box>
);

const PUNTOS = [
  "Curaduría y resolución de postulaciones",
  "Catálogo, pabellones y técnicas",
  "Ventas, cartera y entregas",
];

const LoginClient: React.FC = () => {
  const router = useRouter();
  const { login: loginCtx, isAuthenticated, isAuthLoading } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capsOn, setCapsOn] = useState(false);

  const firstRef = useRef<HTMLInputElement | null>(null);

  // Redirige si ya está autenticado
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, isAuthLoading, router]);

  useEffect(() => {
    const t = window.setTimeout(() => firstRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, []);

  // Bloq Mayús: la causa nº1 de "mi contraseña no funciona".
  const onPassKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const on = e.getModifierState?.("CapsLock");
    if (typeof on === "boolean" && on !== capsOn) setCapsOn(on);
  };

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

  // Gate para evitar "flash" del formulario
  if (isAuthLoading || submitting || isAuthenticated) {
    return (
      <FullScreenBlocking
        text={submitting ? "Autenticando…" : "Cargando entorno seguro"}
      />
    );
  }

  const fieldSx = {
    width: "100%",
    mt: 1,
    py: 1.4,
    background: "transparent",
    color: FDM.ink,
    border: 0,
    borderBottom: `1px solid ${line}`,
    fontFamily: "var(--font-jost), Jost, system-ui, sans-serif",
    fontSize: 17,
    outline: "none",
    transition: "border-color .3s ease",
    "&:focus": { borderBottomColor: FDM.green },
    "&::placeholder": { color: "rgba(11,11,10,0.38)" },
  } as const;

  const labelSx = { ...eyebrow, fontSize: 9.5, color: dim } as const;

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "stretch",
        background: FDM.paper,
        color: FDM.ink,
      }}
    >
      {/* ══ Panel oscuro ═══════════════════════════════════ */}
      <Box
        sx={{
          flex: "1 1 400px",
          minWidth: "min(100%,320px)",
          background: FDM.panel,
          color: FDM.onDark,
          display: "flex",
          flexDirection: "column",
          gap: "clamp(20px,2.4vw,32px)",
          p: "clamp(24px,2.8vw,44px)",
          // En móvil el formulario va primero: a un login se entra, no se lee.
          order: { xs: 2, md: 1 },
        }}
      >
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
          <Typography
            component="h1"
            sx={{
              fontWeight: 300,
              fontSize: "clamp(30px,3.6vw,52px)",
              lineHeight: 1.05,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            <Box component="span" sx={{ display: "block" }}>Panel de</Box>
            <Box component="span" sx={{ display: "block" }}>la</Box>
            <Box component="span" sx={{ display: "block", color: FDM.green }}>feria</Box>
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {PUNTOS.map((t, i) => (
              <Box
                key={t}
                sx={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 1.5,
                  py: 1.1,
                  borderTop: "1px solid rgba(245,244,239,0.16)",
                  borderBottom: i === PUNTOS.length - 1 ? "1px solid rgba(245,244,239,0.16)" : undefined,
                  fontSize: 14.5,
                  color: "rgba(245,244,239,0.88)",
                }}
              >
                <Box component="span" sx={{ fontSize: 9.5, letterSpacing: "0.2em", color: FDM.green }}>
                  0{i + 1}
                </Box>
                {t}
              </Box>
            ))}
          </Box>
        </Box>

        <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "rgba(245,244,239,0.6)" }}>
          Feria del Millón · Acceso restringido
        </Typography>
      </Box>

      {/* ══ Formulario ═════════════════════════════════════ */}
      <Box
        sx={{
          flex: "1 1 520px",
          minWidth: "min(100%,320px)",
          display: "flex",
          flexDirection: "column",
          p: "clamp(20px,2.4vw,36px)",
          order: { xs: 1, md: 2 },
        }}
      >
        <Box sx={{ pb: "clamp(16px,1.8vw,24px)", borderBottom: `1px solid ${line}` }}>
          <Typography sx={{ ...eyebrow, fontSize: 10, color: dim }}>
            Administración
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: "clamp(16px,2vw,30px)",
          }}
        >
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column" }}
          >
            <Typography
              component="h2"
              sx={{
                fontWeight: 300,
                fontSize: "clamp(26px,2.6vw,36px)",
                lineHeight: 1.1,
                letterSpacing: "0.02em",
                mb: 0.75,
              }}
            >
              Ingresar
            </Typography>
            <Typography sx={{ fontSize: 14.5, lineHeight: 1.6, color: dim }}>
              Acceso para el equipo de la feria.
            </Typography>

            <Typography component="label" htmlFor="adm-user" sx={{ ...labelSx, mt: 3, display: "block" }}>
              Correo o teléfono
            </Typography>
            <Box
              component="input"
              id="adm-user"
              ref={firstRef}
              value={emailOrPhone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmailOrPhone(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!errorMsg}
              sx={fieldSx}
            />

            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mt: 2.5 }}>
              <Typography component="label" htmlFor="adm-pass" sx={labelSx}>
                Contraseña
              </Typography>
              <Box
                component="button"
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                sx={{
                  background: "transparent",
                  border: 0,
                  p: 0,
                  cursor: "pointer",
                  color: FDM.green,
                  ...eyebrow,
                  fontSize: 9.5,
                  letterSpacing: "0.16em",
                  "&:hover": { opacity: 0.7 },
                }}
              >
                {showPwd ? "Ocultar" : "Ver"}
              </Box>
            </Stack>
            <Box
              component="input"
              id="adm-pass"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              onKeyUp={onPassKey}
              onKeyDown={onPassKey}
              onBlur={() => setCapsOn(false)}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errorMsg}
              sx={fieldSx}
            />

            {capsOn && (
              <Typography role="status" sx={{ ...eyebrow, fontSize: 9.5, color: FDM.amber, mt: 1 }}>
                Bloq Mayús activado
              </Typography>
            )}

            {errorMsg && (
              <Box
                role="alert"
                sx={{
                  mt: 2.5,
                  px: 1.75,
                  py: 1.5,
                  borderLeft: `2px solid ${FDM.terracotta}`,
                  background: "rgba(180,71,42,0.07)",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {errorMsg}
              </Box>
            )}

            <Box
              component="button"
              type="submit"
              disabled={submitting}
              sx={{
                mt: 3,
                width: "100%",
                height: 54,
                borderRadius: 999,
                cursor: submitting ? "wait" : "pointer",
                border: `1px solid ${FDM.ink}`,
                background: FDM.ink,
                color: FDM.paper,
                ...eyebrow,
                fontSize: 11,
                letterSpacing: "0.18em",
                transition: "all .3s ease",
                "&:hover": { background: FDM.green, borderColor: FDM.green, color: FDM.ink },
              }}
            >
              Ingresar
            </Box>
          </Box>
        </Box>

        <Stack
          direction="row"
          flexWrap="wrap"
          justifyContent="space-between"
          sx={{ gap: 2, pt: 1.75, borderTop: `1px solid ${line}` }}
        >
          <Typography sx={{ ...eyebrow, fontSize: 9.5, color: dim }}>
            © Feria del Millón · Oficina para la Cultura SAS
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
};

export default LoginClient;
