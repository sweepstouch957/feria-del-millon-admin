"use client";

import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from "@mui/material";
import {
  Upload,
  Loader2,
  Image as ImgIcon,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import {
  createArtwork,
  patchArtwork,
  type CreateArtworkInput,
  type PatchArtworkDto,
} from "@services/artworks.service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadCampaignImage } from "@services/upload.service";
import { ArtworkRow } from "@/hooks/useArtworksCursor";

const CURRENT_YEAR = new Date().getFullYear();

const FormSchema = z.object({
  title: z.string().min(2, "El título es requerido"),
  price: z
    .union([z.coerce.number().int().min(0, "Precio inválido"), z.nan()])
    .optional()
    .transform((v) => (Number.isNaN(v) ? undefined : v)),
  currency: z.string().default("COP").optional(),
  image: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: z.string().optional(),
  year: z
    .union([
      z.coerce.number().int().min(1800).max(CURRENT_YEAR),
      z.nan(),
      z.string().length(0),
    ])
    .optional()
    .transform((v) =>
      typeof v === "number" && !Number.isNaN(v) ? v : undefined
    ),
  stock: z
    .union([z.coerce.number().int().min(0), z.nan()])
    .optional()
    .transform((v) => (Number.isNaN(v) ? undefined : v)),
  dimensions: z.string().optional(),
  technique: z.string().min(1, "Selecciona una técnica"),
  pavilion: z.string().optional(),
  tagId: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

export default function CreateEditArtworkModal({
  open,
  onOpenChange,
  eventId,
  artistId,
  editingId,
  currentRows,
  techniqueOptions,
  pavilionOptions,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string;
  artistId: string;
  editingId: string | null;
  currentRows: ArtworkRow[];
  techniqueOptions: Array<{ value: string; label: string }>;
  pavilionOptions: Array<{ value: string; label: string }>;
  onDone: () => void;
}) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema) as Resolver<FormValues>,
    defaultValues: {
      title: "",
      currency: "COP",
      technique: "",
      price: undefined,
      year: undefined,
      stock: undefined,
      image: "",
      description: "",
      dimensions: "",
      pavilion: "",
      tagId: "",
    } as Partial<FormValues>,
  });

  const imageUrl = watch("image");

  useEffect(() => {
    if (!editingId) {
      reset({
        title: "",
        price: undefined,
        currency: "COP",
        image: "",
        description: "",
        year: undefined,
        stock: undefined,
        dimensions: "",
        technique: "",
        pavilion: "",
        tagId: "",
      });
      return;
    }

    const row = (currentRows || []).find((r) => r.id === editingId);
    if (!row) return;

    setValue("title", row.title || "");
    setValue("price", (row.price as any) ?? undefined);
    setValue("currency", row.currency || "COP");
    setValue("description", row.description || "");
    setValue("year", (row.year as any) ?? undefined);
    setValue("stock", (row.stock as any) ?? undefined);
    setValue("dimensions", (row as any)?.dimensionsText || "");
    setValue(
      "technique",
      ((row as any)?.techniqueInfo?._id || (row as any)?.technique || "") as any
    );
    setValue(
      "pavilion",
      ((row as any)?.pavilionInfo?._id || (row as any)?.pavilion || "") as any
    );
    setValue("tagId", (row as any)?.tagId || "");
    setValue("image", row.image || "");
  }, [editingId, currentRows, reset, setValue]);

  const mCreate = useMutation({
    mutationFn: async (payload: CreateArtworkInput) => createArtwork(payload),
    onSuccess: () => {
      toast.success("Obra creada ✨");
      qc.invalidateQueries({ queryKey: ["artworks"] });
      onDone();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error || "Error creando la obra");
    },
  });

  const mPatch = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: PatchArtworkDto;
    }) => patchArtwork(id, payload),
    onSuccess: (resp) => {
      toast.success("Obra actualizada ✅");
      qc.invalidateQueries({ queryKey: ["artworks"] });
      qc.invalidateQueries({ queryKey: ["artwork-detail", resp.doc.id] });
      onDone();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.error || "Error actualizando la obra");
    },
  });

  const onSubmit = handleSubmit(async (form) => {
    const baseSlug = slugify(form.title);

    if (editingId) {
      const payload: PatchArtworkDto = {
        title: form.title,
        slug: baseSlug,
        description: form.description,
        price: form.price,
        currency: form.currency || "COP",
        stock: form.stock,
        image: form.image,
        event: eventId,
        pavilion: form.pavilion || null,
        technique: form.technique,
        tags: form.tagId ? [form.tagId] : undefined,
        status: "published",
      };
      await mPatch.mutateAsync({ id: editingId, payload });
      return;
    }

    const createPayload: CreateArtworkInput = {
      event: eventId,
      artist: artistId,
      pavilion: form.pavilion || null,
      technique: form.technique,
      title: form.title,
      slug: baseSlug,
      year: form.year,
      description: form.description,
      price: form.price,
      currency: form.currency || "COP",
      stock: form.stock,
      image: form.image,
      tags: form.tagId ? [form.tagId] : undefined,
      status: "published",
    };
    await mCreate.mutateAsync(createPayload);
  });

  const onUploadFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("folder", "artworks");
      const res = await fetch("/upload", { method: "POST", body: form });
      const json = await res.json();
      if (json?.url) {
        setValue("image", json.url);
        return;
      }
      throw new Error("fallback");
    } catch {
      try {
        const r = await uploadCampaignImage(file!, "artworks");
        setValue("image", (r as any)?.url);
      } catch {
        toast.error("No se pudo subir la imagen");
      }
    }
  };

  const closingDisabled =
    isSubmitting || mCreate.isPending || mPatch.isPending;

  const handleClose = (
    _event: object,
    reason: "backdropClick" | "escapeKeyDown"
  ) => {
    if (closingDisabled) return;
    if (reason === "backdropClick" || reason === "escapeKeyDown") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {editingId ? "Editar obra" : "Crear obra"}
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "75vh" }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Completa los campos para{" "}
          {editingId ? "actualizar" : "publicar"} tu obra.
        </Typography>

        <Box
          component="form"
          noValidate
          onSubmit={onSubmit}
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
            gap: 2,
          }}
        >
          {/* Columna izquierda */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="Título *"
              size="small"
              fullWidth
              {...register("title")}
              error={!!errors.title}
              helperText={errors.title?.message}
            />
            <TextField
              label="Precio (COP)"
              size="small"
              type="number"
              fullWidth
              {...register("price")}
            />

            <TextField
              select
              SelectProps={{ native: true }}
              label="Técnica *"
              size="small"
              fullWidth
              {...register("technique")}
              error={!!errors.technique}
              helperText={errors.technique?.message}
            >
              <option value="">Selecciona técnica</option>
              {techniqueOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </TextField>

            <TextField
              select
              SelectProps={{ native: true }}
              label="Pabellón"
              size="small"
              fullWidth
              {...register("pavilion")}
            >
              <option value="">Sin pabellón</option>
              {pavilionOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </TextField>

            <TextField
              label="Año"
              size="small"
              type="number"
              fullWidth
              {...register("year")}
            />
            <TextField
              label="Stock"
              size="small"
              type="number"
              fullWidth
              {...register("stock")}
            />

            <TextField
              label="Descripción"
              size="small"
              fullWidth
              multiline
              minRows={3}
              {...register("description")}
              sx={{ gridColumn: { xs: "1 / 2", md: "1 / 3" } }}
            />

            <TextField
              label="Dimensiones"
              size="small"
              fullWidth
              {...register("dimensions")}
            />
            <TextField
              label="Tag ID"
              size="small"
              fullWidth
              {...register("tagId")}
            />
          </Box>

          {/* Columna derecha: Imagen */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box
              sx={{
                width: "100%",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
                aspectRatio: "4 / 3",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <ImgIcon className="w-6 h-6" />
                  Vista previa (pega URL o sube archivo)
                </Box>
              )}
            </Box>

            <TextField
              label="URL de la imagen"
              size="small"
              fullWidth
              {...register("image")}
              placeholder="https://…"
            />

            <Box>
              <input
                id="file-input"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => onUploadFile(e.target.files?.[0])}
              />
              <label htmlFor="file-input">
                <Button
                  component="span"
                  variant="outlined"
                  size="small"
                  startIcon={<Upload className="w-4 h-4" />}
                >
                  Subir imagen
                </Button>
              </label>
            </Box>
          </Box>

          {/* Botones */}
          <DialogActions
            sx={{
              gridColumn: { xs: "1 / 2", md: "1 / 3" },
              justifyContent: "flex-end",
              mt: 1,
              p: 0,
            }}
          >
            <Button
              onClick={() => !closingDisabled && onOpenChange(false)}
              disabled={closingDisabled}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={closingDisabled}
              startIcon={
                (isSubmitting || mCreate.isPending || mPatch.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )
              }
            >
              {editingId ? "Guardar cambios" : "Crear obra"}
            </Button>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
