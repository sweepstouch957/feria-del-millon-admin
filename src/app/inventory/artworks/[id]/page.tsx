/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Stack,
  Chip,
  Divider,
  Avatar,
  CircularProgress,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Tooltip,
  Snackbar,
  LinearProgress,
} from "@mui/material";
import {
  ArrowLeft,
  Save as SaveIcon,
  QrCode as QrIcon,
  Edit3 as EditIcon,
  Palette as TechniqueIcon,
  Building2 as PavilionIcon,
  User as ArtistIcon,
  Globe as ChannelIcon,
  BadgeCheck as StatusIcon,
  Wallet as PriceIcon,
  CalendarDays as CalendarIcon,
  UploadCloud as UploadIcon,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useArtworkDetail } from "@/hooks/useArtworkDetail";
import { patchArtwork } from "@services/artworks.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadCampaignImage } from "@services/upload.service";

/* =========================
   Helpers
========================= */
const formatPrice = (price?: number, currency = "COP") =>
  price == null
    ? "—"
    : new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(price);

/** Lee File -> HTMLImageElement */
async function fileToImage(file: File): Promise<HTMLImageElement> {
  const blobURL = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = blobURL;
    });
    return img;
  } finally {
    // se libera más abajo tras usar canvas.toBlob
  }
}

/** Comprime a ~< maxBytes y limita ancho/alto, manteniendo calidad alta */
async function compressImage(
  file: File,
  {
    maxBytes = 1_000_000, // 1MB
    maxWidth = 2000,
    maxHeight = 2000,
    mime = "image/jpeg",
  }: {
    maxBytes?: number;
    maxWidth?: number;
    maxHeight?: number;
    mime?: string;
  } = {}
): Promise<File> {
  if (file.size <= maxBytes) return file;

  const img = await fileToImage(file);
  const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
  const targetW = Math.round(img.width * ratio);
  const targetH = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(img, 0, 0, targetW, targetH);

  // búsqueda binaria de calidad para aproximar maxBytes sin perder mucha calidad
  let qMin = 0.6;
  let qMax = 0.95;
  let bestBlob: Blob | null = null;

  for (let i = 0; i < 7; i++) {
    const q = (qMin + qMax) / 2;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, q)
    );
    if (!blob) break;

    if (blob.size > maxBytes) {
      qMax = q; // demasiado grande → baja calidad
    } else {
      bestBlob = blob; // cabe → intenta mejor calidad
      qMin = q;
    }
  }

  const finalBlob =
    bestBlob ||
    (await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, 0.85)
    ));

  if (!finalBlob) return file;

  return new File(
    [finalBlob],
    file.name.replace(/\.(png|webp|jpeg|jpg)$/i, ".jpg"),
    {
      type: mime,
      lastModified: Date.now(),
    }
  );
}

/** Descargar archivo (para el QR) */
const downloadFile = (url: string, filename = "qr-obra.png") => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/* =========================
   Page
========================= */
export default function ArtworkDetailPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useArtworkDetail(id);
  const [snackbar, setSnackbar] = useState("");
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const art = data?.doc;
  const copy = data?.copies?.[0];

  const [form, setForm] = useState({
    title: "",
    price: "",
    status: "",
    description: "",
    image: "",
  });

  // Inicializa form con doc
  useEffect(() => {
    if (!art) return;
    setForm({
      title: art.title ?? "",
      price: art.price != null ? String(art.price) : "",
      status: art.status ?? "",
      description: art.description ?? "",
      image: art.image ?? "",
    });
    setLocalPreview(null);
  }, [art?.id]); // eslint-disable-line

  const mutation = useMutation({
    mutationFn: async () => {
      if (!id) return;
      const payload: any = {
        title: form.title || art?.title,
        price: form.price ? Number(form.price) : art?.price,
        description: form.description ?? art?.description,
        status: form.status || art?.status,
        image: form.image || art?.image,
      };
      const res = await patchArtwork(id, payload);
      return res;
    },
    onSuccess: () => {
      setSnackbar("Obra actualizada correctamente");
      // invalida detalle y lista por si viene de un listado
      qc.invalidateQueries({ queryKey: ["artwork-detail", id] });
      qc.invalidateQueries({ queryKey: ["artworks"] });
      refetch();
    },
  });

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Vista previa local inmediata
      const previewURL = URL.createObjectURL(file);
      setLocalPreview(previewURL);

      // Comprimir si > 1MB
      const processed = await compressImage(file, {
        maxBytes: 1_000_000,
        maxWidth: 2200,
        maxHeight: 2200,
        mime: "image/jpeg",
      });

      // Subir a Cloudinary vía backend `/upload`
      const { url /*, public_id*/ } = await uploadCampaignImage(
        processed,
        "feria-del-millon/artworks"
      );

      // Guardar en form y hacer patch automático (opcional)
      setForm((f) => ({ ...f, image: url }));

      // Patch inmediato de la imagen para persistir
      if (id) {
        await patchArtwork(id, { image: url });
        setSnackbar("Imagen actualizada");
        qc.invalidateQueries({ queryKey: ["artwork-detail", id] });
        refetch();
      }
    } catch (e: any) {
      console.error(e);
      setSnackbar(e?.message || "Error al subir la imagen");
    } finally {
      setUploading(false);
      // limpia input para permitir misma selección otra vez
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading)
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <CircularProgress />
      </Box>
    );

  if (isError)
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <Typography color="error">
          Error al cargar: {error?.message ?? "desconocido"}
        </Typography>
      </Box>
    );

  if (!art) return null;

  const displayImage = localPreview || form.image || art.image || "";

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1300, mx: "auto" }}>
      <Button
        startIcon={<ArrowLeft size={16} />}
        variant="text"
        sx={{ mb: 2 }}
        onClick={() => router.push("/inventory/artworks")}
      >
        Volver al listado
      </Button>

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <CardHeader
          title={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h5" fontWeight={800}>
                Gestión de Obra
              </Typography>
              <Chip
                label={
                  art.status === "published"
                    ? "Publicada"
                    : art.status === "draft"
                    ? "Borrador"
                    : "Archivada"
                }
                color={art.status === "published" ? "success" : "default"}
                size="small"
              />
            </Stack>
          }
          subheader={`ID: ${art._id ?? id}`}
        />

        <Divider />

        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={4}
            alignItems="stretch"
          >
            {/* ─────── Imagen + acciones + QR (columna izquierda) ─────── */}
            <Box
              sx={{
                flex: { xs: "1 1 auto", md: "0 0 420px" }, // responsive
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
                bgcolor: "background.default",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box sx={{ position: "relative" }}>
                <Avatar
                  variant="square"
                  src={displayImage}
                  alt={art.title}
                  sx={{
                    width: "100%",
                    height: { xs: 300, md: 460 }, // responsive
                    borderRadius: 0,
                    objectFit: "cover",
                    bgcolor: "background.paper",
                  }}
                />
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    left: 12,
                    justifyContent: "space-between",
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Cambiar imagen">
                      <span>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<UploadIcon size={16} />}
                          onClick={handlePickFile}
                          disabled={uploading}
                          sx={{ boxShadow: "none" }}
                        >
                          {uploading ? "Subiendo…" : "Cambiar imagen"}
                        </Button>
                      </span>
                    </Tooltip>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleFileChange}
                    />
                  </Stack>

                  {art.meta?.qrPublic?.imageUrl && (
                    <Tooltip title="Ver QR">
                      <IconButton
                        size="small"
                        sx={{
                          bgcolor: "white",
                          "&:hover": { bgcolor: "white" },
                          boxShadow: 1,
                        }}
                        onClick={() =>
                          window.open(art.meta?.qrPublic?.imageUrl, "_blank")
                        }
                      >
                        <QrIcon size={18} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>

              {uploading && <LinearProgress />}

              {/* ─────── QR debajo de la imagen (responsive) ─────── */}
              {art.meta?.qrPublic?.imageUrl && (
                <Box
                  sx={{
                    p: 2,
                    borderTop: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                  }}
                >
                  <Stack spacing={1.25}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography fontWeight={700}>QR público</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const url = art?.meta?.qrPublic?.imageUrl;
                            if (!url) return;
                            window.open(url, "_blank");
                          }}
                        >
                          Abrir
                        </Button>

                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const url = art?.meta?.qrPublic?.imageUrl;
                            if (!url) return;
                            const filename = `qr-${
                              art?.slug || art?.id || "obra"
                            }.png`;
                            downloadFile(url, filename);
                          }}
                        >
                          Descargar
                        </Button>
                      </Stack>
                    </Stack>

                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                      <Box
                        component="img"
                        src={art.meta?.qrPublic?.imageUrl}
                        alt="QR público de la obra"
                        sx={{
                          width: "100%",
                          maxWidth: 340, // se adapta en móvil
                          height: "auto",
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      />
                    </Box>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textAlign="center"
                    >
                      Escanéalo para ver la ficha pública
                    </Typography>
                  </Stack>
                </Box>
              )}
            </Box>

            {/* ─────── Info + edición rápida (columna derecha) ─────── */}
            <Box sx={{ flex: 1 }}>
              <Stack spacing={2.5}>
                {/* Título y descripción */}
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h4" fontWeight={900}>
                      {art.title}
                    </Typography>
                    <Tooltip title="Copiar slug">
                      <IconButton
                        size="small"
                        onClick={() =>
                          navigator.clipboard.writeText(art.slug || "")
                        }
                      >
                        <EditIcon size={16} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="body1" color="text.secondary">
                    {art.description || "—"}
                  </Typography>
                </Stack>

                <Divider />

                {/* Ficha técnica */}
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <ArtistIcon size={18} />
                    <Typography fontWeight={600}>
                      {art.artistInfo
                        ? `${art.artistInfo.firstName} ${art.artistInfo.lastName}`
                        : "—"}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <TechniqueIcon size={18} />
                    <Typography color="text.secondary">
                      {art.techniqueInfo?.name ?? "—"}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <PavilionIcon size={18} />
                    <Typography color="text.secondary">
                      {art.pavilionInfo?.name ?? "—"}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <PriceIcon size={18} />
                    <Typography fontWeight={800} variant="h6">
                      {formatPrice(art.price, art.currency || "COP")}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <ChannelIcon size={18} />
                    <Typography>
                      Canal:{" "}
                      <strong>
                        {art.defaultChannel === "event"
                          ? "Evento"
                          : art.defaultChannel ?? "—"}
                      </strong>
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon size={18} />
                    <Typography variant="caption" color="text.secondary">
                      Creado:{" "}
                      {art.createdAt
                        ? new Date(art.createdAt).toLocaleString("es-CO")
                        : "—"}
                    </Typography>
                  </Stack>

                  {copy && (
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mt: 1 }}
                    >
                      <StatusIcon size={18} />
                      <Chip
                        label={`Copia ${copy.number}/${copy.total} (${copy.status})`}
                        color="success"
                        size="small"
                      />
                    </Stack>
                  )}
                </Stack>

                <Divider />

                {/* Edición rápida */}
                <Typography variant="h6" fontWeight={800}>
                  Edición rápida
                </Typography>
                <Stack spacing={2} sx={{ maxWidth: 720 }}>
                  <TextField
                    label="Título"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    fullWidth
                  />

                  <TextField
                    label="Descripción"
                    multiline
                    minRows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    fullWidth
                  />

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Precio (COP)"
                      type="number"
                      value={form.price}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, price: e.target.value }))
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      sx={{ flex: 1 }}
                    />

                    <TextField
                      label="Estado"
                      select
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, status: e.target.value }))
                      }
                      SelectProps={{ native: true }}
                      sx={{ width: { xs: "100%", sm: 220 } }}
                    >
                      <option value="published">Publicado</option>
                      <option value="draft">Borrador</option>
                      <option value="archived">Archivado</option>
                    </TextField>
                  </Stack>

                  <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon size={16} />}
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate()}
                    >
                      {mutation.isPending ? "Guardando…" : "Guardar cambios"}
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={!!snackbar}
        onClose={() => setSnackbar("")}
        autoHideDuration={2500}
        message={snackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      />
    </Box>
  );
}
