"use client";

import * as React from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import { createEvent, type EventStatus } from "@/services/events.service";
import { createPavilion } from "@/services/pavilions.service";

/* Diálogos de alta de edición y de pabellón.
   El slug se propone solo a partir del nombre: es un campo obligatorio del
   modelo que nadie quiere escribir a mano, y equivocarlo rompe URLs. */

function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const STATUSES: { value: EventStatus; label: string }[] = [
  { value: "draft", label: "Borrador" },
  { value: "active", label: "Activo" },
  { value: "finalizado", label: "Finalizado" },
  { value: "archived", label: "Archivado" },
];

export function CreateEventDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [validFrom, setValidFrom] = React.useState("");
  const [validTo, setValidTo] = React.useState("");
  const [status, setStatus] = React.useState<EventStatus>("draft");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName(""); setSlug(""); setSlugTouched(false);
      setValidFrom(""); setValidTo(""); setStatus("draft");
      setError(null);
    }
  }, [open]);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Ponele un nombre a la edición.");
    if (!effectiveSlug) return setError("El slug no puede quedar vacío.");
    if (!validFrom || !validTo) return setError("Indicá las fechas de inicio y cierre.");
    // El modelo rechaza validFrom >= validTo; mejor avisar acá que recibir un 400.
    if (new Date(validFrom) >= new Date(validTo))
      return setError("La fecha de inicio debe ser anterior a la de cierre.");

    try {
      setSaving(true);
      const ev = await createEvent({
        name: name.trim(),
        slug: effectiveSlug,
        validFrom: new Date(validFrom).toISOString(),
        validTo: new Date(validTo).toISOString(),
        status,
      });
      onCreated(ev.id);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "No se pudo crear la edición");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Nueva edición</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Feria del Millón 2027"
            autoFocus
            fullWidth
          />
          <TextField
            label="Slug"
            value={effectiveSlug}
            onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
            helperText="Se usa en las URLs. Se propone solo desde el nombre."
            fullWidth
          />
          <Stack direction="row" flexWrap="wrap" spacing={2}>
            <TextField
              label="Inicio"
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 140 }}
            />
            <TextField
              label="Cierre"
              type="date"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1, minWidth: 140 }}
            />
          </Stack>
          <TextField
            select
            label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatus)}
            helperText="Empezá en borrador si todavía no querés que se vea."
            fullWidth
          >
            {STATUSES.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          disableElevation
          onClick={submit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={13} color="inherit" /> : undefined}
        >
          Crear edición
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function CreatePavilionDialog({
  open,
  eventId,
  eventName,
  onClose,
  onCreated,
}: {
  open: boolean;
  eventId: string;
  eventName?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName(""); setSlug(""); setSlugTouched(false);
      setMinPrice(""); setMaxPrice(""); setError(null);
    }
  }, [open]);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const submit = async () => {
    setError(null);
    if (!eventId) return setError("Elegí una edición primero.");
    if (!name.trim()) return setError("Ponele un nombre al pabellón.");
    if (!effectiveSlug) return setError("El slug no puede quedar vacío.");
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    if (min != null && max != null && min > max)
      return setError("El precio mínimo no puede superar al máximo.");

    try {
      setSaving(true);
      await createPavilion(eventId, {
        name: name.trim(),
        slug: effectiveSlug,
        minArtworkPrice: min,
        maxArtworkPrice: max,
        active: true,
      });
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "No se pudo crear el pabellón");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Nuevo pabellón</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {eventName && (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Se crea dentro de <strong>{eventName}</strong>.
            </Alert>
          )}

          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="1K Art Show"
            autoFocus
            fullWidth
          />
          <TextField
            label="Slug"
            value={effectiveSlug}
            onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
            helperText="Único dentro de la edición."
            fullWidth
          />
          <Stack direction="row" flexWrap="wrap" spacing={2}>
            <TextField
              label="Precio mínimo"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              sx={{ flex: 1, minWidth: 130 }}
            />
            <TextField
              label="Precio máximo"
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              sx={{ flex: 1, minWidth: 130 }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button
          variant="contained"
          disableElevation
          onClick={submit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={13} color="inherit" /> : undefined}
        >
          Crear pabellón
        </Button>
      </DialogActions>
    </Dialog>
  );
}
