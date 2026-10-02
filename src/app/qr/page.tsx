"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Copy, Download, Printer, QrCode as QrIcon } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import PageHeader from "@/components/ui/PageHeader";
import { SHOP_URL } from "@core/constants";
import { eyebrow } from "@/app/theme";

/* Generador de QR para convocatorias: se pega una URL (o se elige un atajo),
   se descarga el PNG para pantalla o el SVG para imprenta —vectorial, no se
   pixela al ampliarlo en un afiche— y se puede imprimir la ficha directo.

   Todo pasa en el navegador: no hay servicio de QR ni enlaces que caduquen. */

const SHORTCUTS: { label: string; url: string; hint: string }[] = [
  { label: "Página de enlaces", url: `${SHOP_URL}/links`, hint: "La del QR impreso" },
  { label: "Convocatoria", url: `${SHOP_URL}/convocatoria`, hint: "Bases y requisitos" },
  { label: "Postular", url: `${SHOP_URL}/convocatoria/aplicar`, hint: "Formulario de la feria" },
  { label: "Catálogo", url: `${SHOP_URL}/catalogo`, hint: "Obras publicadas" },
  { label: "Boletos", url: `${SHOP_URL}/tickets`, hint: "Venta de entradas" },
  {
    label: "Formulario Young Creative",
    url: "https://forms.gle/43f6rhdrgEj45hFh9",
    hint: "Google Forms de la alianza",
  },
];

/** Margen 1 y corrección media: el QR más chico que sigue leyéndose impreso. */
const OPTS = { margin: 1, errorCorrectionLevel: "M" as const };

const slug = (s: string) =>
  s
    .replace(/^https?:\/\//, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "qr";

export default function QrToolPage() {
  // La URL puede llegar por ?url= (desde Personalización, por ejemplo).
  const [url, setUrl] = React.useState(() => {
    if (typeof window === "undefined") return `${SHOP_URL}/links`;
    return new URLSearchParams(window.location.search).get("url") || `${SHOP_URL}/links`;
  });
  const [caption, setCaption] = React.useState("");
  const [size, setSize] = React.useState(1000);
  const [png, setPng] = React.useState("");
  const [error, setError] = React.useState("");

  const clean = url.trim();

  // El PNG se regenera al tipear; es instantáneo y evita un botón "generar".
  React.useEffect(() => {
    let alive = true;
    if (!clean) {
      setPng("");
      setError("");
      return;
    }
    QRCode.toDataURL(clean, { ...OPTS, width: size })
      .then((data) => {
        if (!alive) return;
        setPng(data);
        setError("");
      })
      .catch(() => {
        if (!alive) return;
        setPng("");
        setError("Esa URL no se puede convertir en QR. Revisa que esté completa.");
      });
    return () => {
      alive = false;
    };
  }, [clean, size]);

  const download = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const downloadSvg = async () => {
    try {
      const svg = await QRCode.toString(clean, { ...OPTS, type: "svg" });
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      download(href, `qr-${slug(clean)}.svg`);
      URL.revokeObjectURL(href);
    } catch {
      toast.error("No se pudo generar el SVG");
    }
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: "auto" }}>
      <PageHeader
        crumb="Contenido"
        title="Códigos QR"
        description="Un QR para cualquier enlace de la feria: afiches, flyers de convocatoria o la mesa de inscripción. El PNG sirve para pantalla; el SVG es vectorial, para imprenta."
        actions={[
          {
            label: "Descargar PNG",
            kind: "pri",
            icon: <Download size={14} />,
            disabled: !png,
            onClick: () => download(png, `qr-${slug(clean)}.png`),
          },
          {
            label: "Descargar SVG",
            kind: "sec",
            icon: <Download size={14} />,
            disabled: !clean,
            onClick: downloadSvg,
          },
          {
            label: "Imprimir",
            kind: "sec",
            icon: <Printer size={14} />,
            disabled: !png,
            onClick: () => window.print(),
          },
        ]}
      />

      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: { xs: "1fr", md: "1fr 380px" },
        }}
      >
        {/* Enlace + atajos */}
        <Card className="no-print">
          <CardContent>
            <Stack gap={2.5}>
              <TextField
                label="Enlace al que apunta el QR"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                fullWidth
                size="small"
                placeholder="https://…"
              />

              <Box>
                <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary", mb: 1 }}>
                  Atajos
                </Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  {SHORTCUTS.map((s) => (
                    <Chip
                      key={s.url}
                      label={s.label}
                      title={s.hint}
                      onClick={() => setUrl(s.url)}
                      variant={clean === s.url ? "filled" : "outlined"}
                      color={clean === s.url ? "primary" : "default"}
                    />
                  ))}
                </Stack>
              </Box>

              <TextField
                label="Texto bajo el código (opcional)"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                fullWidth
                size="small"
                placeholder="Young Creative Chevrolet · escanea para postular"
              />

              <Box>
                <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>
                  Tamaño del PNG · {size} px
                </Typography>
                <Slider
                  value={size}
                  onChange={(_, v) => setSize(v as number)}
                  min={300}
                  max={2000}
                  step={100}
                  valueLabelDisplay="auto"
                />
                <Typography variant="caption" color="text.secondary">
                  Para imprimir en grande usa el SVG: no se pixela a ningún tamaño.
                </Typography>
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              <Stack direction="row" gap={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Copy size={14} />}
                  disabled={!clean}
                  onClick={() => {
                    navigator.clipboard?.writeText(clean);
                    toast.success("Enlace copiado");
                  }}
                >
                  Copiar enlace
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  component="a"
                  href={clean || "#"}
                  target="_blank"
                  rel="noopener"
                  disabled={!clean}
                >
                  Abrir enlace
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* La ficha que se imprime */}
        <Card>
          <CardContent>
            <Stack gap={2} alignItems="center" sx={{ py: 1 }}>
              {png ? (
                <img
                  src={png}
                  alt={`QR de ${clean}`}
                  style={{ width: "100%", maxWidth: 300, height: "auto", display: "block" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 300,
                    aspectRatio: "1",
                    display: "grid",
                    placeItems: "center",
                    border: "1px dashed",
                    borderColor: "divider",
                    color: "text.disabled",
                  }}
                >
                  <QrIcon size={40} strokeWidth={1.2} />
                </Box>
              )}

              {caption && (
                <Typography variant="body2" sx={{ textAlign: "center", maxWidth: 300 }}>
                  {caption}
                </Typography>
              )}

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: "center", wordBreak: "break-all" }}
              >
                {clean || "Sin enlace"}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Al imprimir queda sólo la ficha del código, centrada en la hoja. */}
      <style jsx global>{`
        @media print {
          .no-print,
          header,
          aside {
            display: none !important;
          }
          body {
            background: #fff;
          }
        }
      `}</style>
    </Box>
  );
}
