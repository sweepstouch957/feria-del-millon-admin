"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs, { type Dayjs } from "dayjs";

import {
  updateConvocatoria,
  type Convocatoria,
  type ConvocatoriaRequirements,
  type ConvocatoriaStatus,
} from "@services/events.service";
import { listTechniques } from "@services/techniques.service";
import DateRangeField from "@components/common/DateRangeField";
import { eyebrow } from "@/app/theme";

/* Configurar una convocatoria.

   Lo que se cambia acá lo lee el formulario de postulación del sitio: el
   estado decide si se puede postular, las fechas salen en la página, y los
   requisitos (cuántas imágenes, qué documentos, el rango de precio) son
   literalmente los campos que el artista va a tener que llenar. Por eso cada
   cosa dice qué efecto tiene afuera y no sólo cómo se llama. */

const STATUSES: { value: ConvocatoriaStatus; label: string; help: string }[] = [
  { value: "draft", label: "Borrador", help: "No se ve en el sitio. Para dejarla lista sin abrirla." },
  { value: "open", label: "Abierta", help: "Los artistas pueden pagar y postularse." },
  { value: "selection", label: "En selección", help: "Ya no se reciben proyectos; curaduría está revisando." },
  { value: "closed", label: "Cerrada", help: "No se reciben proyectos y el sitio lo dice." },
  { value: "finalized", label: "Finalizada", help: "Resoluciones enviadas; queda como historia." },
  { value: "archived", label: "Archivada", help: "Fuera de todas las vistas." },
];

/** Documentos que se le pueden pedir al artista en la postulación. */
const DOCUMENTS: { key: keyof NonNullable<ConvocatoriaRequirements["documents"]>; label: string }[] = [
  { key: "cv", label: "Hoja de vida" },
  { key: "profilePhoto", label: "Foto de perfil" },
  { key: "bio", label: "Biografía" },
  { key: "projectReview", label: "Reseña del proyecto" },
  { key: "montage", label: "Imagen de montaje" },
  { key: "detail", label: "Imagen de detalle" },
];

type Form = {
  name: string;
  description: string;
  status: ConvocatoriaStatus;
  range: { from: Dayjs | null; to: Dayjs | null };
  fee: number | "";
  currency: string;
  maxArtworksPerArtist: number | "";
  maxImages: number | "";
  priceMin: number | "";
  priceMax: number | "";
  documents: Record<string, boolean>;
  allowedTechniqueIds: string[];
  termsUrl: string;
  websiteUrl: string;
};

const toForm = (c: Convocatoria): Form => ({
  name: c.name ?? "",
  description: c.description ?? "",
  status: c.status,
  range: {
    from: c.startDate ? dayjs(c.startDate) : null,
    to: c.endDate ? dayjs(c.endDate) : null,
  },
  fee: typeof c.fee === "number" ? c.fee : "",
  currency: c.currency || "COP",
  maxArtworksPerArtist: c.maxArtworksPerArtist ?? "",
  maxImages: c.requirements?.maxImages ?? "",
  priceMin: c.requirements?.priceMin ?? "",
  priceMax: c.requirements?.priceMax ?? "",
  documents: Object.fromEntries(
    DOCUMENTS.map((d) => [d.key, !!c.requirements?.documents?.[d.key]])
  ),
  allowedTechniqueIds: c.allowedTechniqueIds ?? [],
  termsUrl: c.termsUrl ?? "",
  websiteUrl: c.websiteUrl ?? "",
});

const num = (v: number | "") => (v === "" ? undefined : Number(v));

export default function ConvocatoriaDialog({
  open,
  onClose,
  convocatoria,
  siblings,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  convocatoria: Convocatoria | null;
  /** Si se abre sin una feria de contexto (Solicitudes), se puede elegir cuál. */
  siblings?: Convocatoria[];
  onPick?: (c: Convocatoria) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState<Form | null>(null);

  // Lo guardado manda: al abrir (o al cambiar de convocatoria) se reescribe.
  React.useEffect(() => {
    if (open && convocatoria) setForm(toForm(convocatoria));
  }, [open, convocatoria?._id]);

  const { data: techniques = [] } = useQuery({
    queryKey: ["techniques"],
    queryFn: () => listTechniques(),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = useMutation({
    mutationFn: async () => {
      if (!convocatoria || !form) throw new Error("Nada que guardar");
      return updateConvocatoria(convocatoria._id, {
        name: form.name.trim(),
        description: form.description.trim(),
        status: form.status,
        startDate: form.range.from?.startOf("day").toISOString(),
        endDate: form.range.to?.endOf("day").toISOString(),
        fee: num(form.fee),
        currency: form.currency || "COP",
        maxArtworksPerArtist: num(form.maxArtworksPerArtist),
        allowedTechniqueIds: form.allowedTechniqueIds,
        requirements: {
          maxImages: num(form.maxImages),
          priceMin: num(form.priceMin),
          priceMax: num(form.priceMax),
          documents: form.documents,
        },
        termsUrl: form.termsUrl.trim(),
        websiteUrl: form.websiteUrl.trim(),
      } as any);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["convocatorias"] });
      onClose();
    },
  });

  if (!form || !convocatoria) return null;

  const status = STATUSES.find((s) => s.value === form.status);
  // Las fechas son obligatorias en el modelo; sin ellas no se puede guardar.
  const missingDates = !form.range.from || !form.range.to;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>
          Convocatoria
        </Typography>
        <Typography variant="h4" component="div" sx={{ mt: 0.5 }}>
          {convocatoria.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Esto es lo que ve y llena el artista cuando se postula.
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack gap={3} sx={{ pt: 1 }}>
          {save.isError && (
            <Alert severity="error">
              {(save.error as any)?.response?.data?.error || "No se pudo guardar."}
            </Alert>
          )}

          {siblings && siblings.length > 1 && onPick && (
            <TextField
              select
              size="small"
              label="Convocatoria"
              value={convocatoria._id}
              onChange={(e) => {
                const next = siblings.find((c) => c._id === e.target.value);
                if (next) onPick(next);
              }}
              fullWidth
              helperText="Hay varias ediciones: elige cuál estás configurando."
            >
              {siblings.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {/* ── Estado ─────────────────────────────────────────────────── */}
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <TextField
              select
              size="small"
              label="Estado"
              value={form.status}
              onChange={(e) => set("status", e.target.value as ConvocatoriaStatus)}
              helperText={status?.help}
              sx={{ flex: "1 1 260px" }}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Nombre"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              sx={{ flex: "1 1 260px" }}
            />
          </Stack>

          <TextField
            size="small"
            label="Descripción"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            multiline
            minRows={2}
            fullWidth
            helperText="Sale en la página de la convocatoria."
          />

          {/* ── Fechas ─────────────────────────────────────────────────── */}
          <DateRangeField
            label="Recepción de proyectos"
            hint="Entre estas fechas los artistas pueden postularse. Salen publicadas en el sitio."
            emptyText="Sin fechas: hay que ponerlas para poder guardar."
            value={form.range}
            onChange={(range) => set("range", range)}
            shortcuts={[
              { label: "Un mes desde hoy", value: () => ({ from: dayjs(), to: dayjs().add(1, "month") }) },
              { label: "Dos meses", value: () => ({ from: dayjs(), to: dayjs().add(2, "month") }) },
            ]}
          />

          {/* ── Inscripción ────────────────────────────────────────────── */}
          <Divider />
          <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>
            Inscripción
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <TextField
              size="small"
              type="number"
              label="Valor"
              value={form.fee}
              onChange={(e) => set("fee", e.target.value === "" ? "" : Number(e.target.value))}
              helperText="Lo que paga el artista para postularse."
              sx={{ flex: "1 1 160px" }}
            />
            <TextField
              size="small"
              label="Moneda"
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              sx={{ flex: "0 1 110px" }}
            />
            <TextField
              size="small"
              type="number"
              label="Obras por artista"
              value={form.maxArtworksPerArtist}
              onChange={(e) =>
                set("maxArtworksPerArtist", e.target.value === "" ? "" : Number(e.target.value))
              }
              helperText="Cuántas puede presentar cada uno."
              sx={{ flex: "1 1 160px" }}
            />
          </Stack>

          {/* ── Requisitos ─────────────────────────────────────────────── */}
          <Divider />
          <Box>
            <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>
              Requisitos de la postulación
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Son los campos que el formulario le va a pedir al artista. Cambian cada año.
            </Typography>
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={2}>
            <TextField
              size="small"
              type="number"
              label="Imágenes por postulación"
              value={form.maxImages}
              onChange={(e) => set("maxImages", e.target.value === "" ? "" : Number(e.target.value))}
              sx={{ flex: "1 1 180px" }}
            />
            <TextField
              size="small"
              type="number"
              label="Precio mínimo de obra"
              value={form.priceMin}
              onChange={(e) => set("priceMin", e.target.value === "" ? "" : Number(e.target.value))}
              sx={{ flex: "1 1 180px" }}
            />
            <TextField
              size="small"
              type="number"
              label="Precio máximo de obra"
              value={form.priceMax}
              onChange={(e) => set("priceMax", e.target.value === "" ? "" : Number(e.target.value))}
              sx={{ flex: "1 1 180px" }}
            />
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Documentos que se le piden
            </Typography>
            <Stack direction="row" flexWrap="wrap" sx={{ mt: 0.5 }}>
              {DOCUMENTS.map((d) => (
                <FormControlLabel
                  key={d.key}
                  sx={{ minWidth: 190 }}
                  control={
                    <Checkbox
                      size="small"
                      checked={!!form.documents[d.key]}
                      onChange={(e) =>
                        set("documents", { ...form.documents, [d.key]: e.target.checked })
                      }
                    />
                  }
                  label={<Typography variant="body2">{d.label}</Typography>}
                />
              ))}
            </Stack>
          </Box>

          {/* ── Técnicas ───────────────────────────────────────────────── */}
          <TextField
            select
            size="small"
            label="Técnicas que se aceptan"
            value={form.allowedTechniqueIds}
            onChange={(e) =>
              set(
                "allowedTechniqueIds",
                typeof e.target.value === "string"
                  ? (e.target.value as string).split(",")
                  : (e.target.value as unknown as string[])
              )
            }
            fullWidth
            helperText="Vacío = todas las técnicas."
            slotProps={{
              select: {
                multiple: true,
                renderValue: (selected) => (
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {(selected as string[]).map((id) => (
                      <Chip
                        key={id}
                        size="small"
                        label={techniques.find((t: any) => (t.id || t._id) === id)?.name ?? id}
                      />
                    ))}
                  </Stack>
                ),
              },
            }}
          >
            {techniques.map((t: any) => (
              <MenuItem key={t.id || t._id} value={t.id || t._id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>

          {/* ── Enlaces ────────────────────────────────────────────────── */}
          <Stack direction="row" flexWrap="wrap" gap={2}>
            <TextField
              size="small"
              label="Términos y condiciones (URL)"
              value={form.termsUrl}
              onChange={(e) => set("termsUrl", e.target.value)}
              sx={{ flex: "1 1 260px" }}
            />
            <TextField
              size="small"
              label="Sitio de la convocatoria (URL)"
              value={form.websiteUrl}
              onChange={(e) => set("websiteUrl", e.target.value)}
              sx={{ flex: "1 1 260px" }}
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={() => save.mutate()}
          disabled={save.isPending || missingDates || !form.name.trim()}
        >
          {save.isPending ? "Guardando…" : "Guardar convocatoria"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
