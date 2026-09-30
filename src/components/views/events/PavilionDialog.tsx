"use client";

import * as React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";

import type { PavilionDoc } from "@services/pavilions.service";
import type { PavilionFormState } from "@hooks/events/usePavilionsManager";
import PavilionPeopleManager from "./PavilionPeopleManager";
import StatusPill from "@components/ui/StatusPill";
import { eyebrow } from "@/app/theme";

/* Todo lo del pabellón en una ventana: sus datos y sus artistas. Antes vivía en
   dos tarjetas debajo de la tabla, y para editar había que buscar dónde había
   quedado la selección. */

type Props = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  pavilion: PavilionDoc | null;
  pavilionForm: PavilionFormState | null;
  onFieldChange: (field: keyof PavilionFormState, value: string | number | boolean) => void;
  onToggleActive: (active: boolean) => void;
  onSave: () => void | Promise<void>;
  isSaving: boolean;
};

export default function PavilionDialog({
  open,
  onClose,
  eventId,
  pavilion,
  pavilionForm,
  onFieldChange,
  onToggleActive,
  onSave,
  isSaving,
}: Props) {
  const [tab, setTab] = React.useState(0);

  // Cada pabellón abre en sus datos, no en la pestaña donde quedó el anterior.
  React.useEffect(() => {
    if (open) setTab(0);
  }, [open, pavilion?.id]);

  if (!pavilionForm) return null;

  const artistCount = pavilion?.artistInfo?.length ?? 0;
  const cashierCount = pavilion?.cashierInfo?.length ?? 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack direction="row" alignItems="flex-start" gap={1.5}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>
              Pabellón
            </Typography>
            <Stack direction="row" alignItems="center" gap={1.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
              <Typography variant="h4" component="span">
                {pavilionForm.name || "Sin nombre"}
              </Typography>
              <StatusPill
                label={pavilionForm.active ? "Activo" : "Inactivo"}
                tone={pavilionForm.active ? "ok" : "mid"}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              /{pavilionForm.slug}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </IconButton>
        </Stack>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1.5 }}>
          <Tab label="Datos" />
          <Tab label={`Artistas${artistCount ? ` · ${artistCount}` : ""}`} />
          <Tab label={`Cajeros${cashierCount ? ` · ${cashierCount}` : ""}`} />
        </Tabs>
      </DialogTitle>

      <DialogContent dividers>
        {tab === 0 ? (
          <Stack gap={2.5} sx={{ pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!pavilionForm.active}
                  onChange={(e) => {
                    onFieldChange("active", e.target.checked);
                    onToggleActive(e.target.checked);
                  }}
                />
              }
              label={pavilionForm.active ? "Pabellón activo" : "Pabellón desactivado"}
            />

            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                label="Nombre"
                size="small"
                fullWidth
                value={pavilionForm.name}
                onChange={(e) => onFieldChange("name", e.target.value)}
              />
              <TextField
                label="Slug"
                size="small"
                fullWidth
                value={pavilionForm.slug}
                onChange={(e) => onFieldChange("slug", e.target.value)}
              />
            </Stack>

            <TextField
              label="Descripción"
              size="small"
              fullWidth
              multiline
              minRows={3}
              value={pavilionForm.description ?? ""}
              onChange={(e) => onFieldChange("description", e.target.value)}
            />

            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField
                label="Min. precio obra"
                size="small"
                type="number"
                fullWidth
                value={pavilionForm.minArtworkPrice ?? ""}
                onChange={(e) => onFieldChange("minArtworkPrice", Number(e.target.value) || 0)}
              />
              <TextField
                label="Máx. precio obra"
                size="small"
                type="number"
                fullWidth
                value={pavilionForm.maxArtworkPrice ?? ""}
                onChange={(e) => onFieldChange("maxArtworkPrice", Number(e.target.value) || 0)}
              />
            </Stack>

            <Box>
              <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary", mb: 1.5 }}>
                Patrocinador del pabellón (opcional)
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <TextField
                  label="Nombre"
                  size="small"
                  fullWidth
                  value={pavilionForm.sponsorName ?? ""}
                  onChange={(e) => onFieldChange("sponsorName", e.target.value)}
                />
                <TextField
                  label="Logo (URL)"
                  size="small"
                  fullWidth
                  value={pavilionForm.sponsorLogo ?? ""}
                  onChange={(e) => onFieldChange("sponsorLogo", e.target.value)}
                />
                <TextField
                  label="Enlace (URL)"
                  size="small"
                  fullWidth
                  value={pavilionForm.sponsorUrl ?? ""}
                  onChange={(e) => onFieldChange("sponsorUrl", e.target.value)}
                />
              </Stack>
            </Box>
          </Stack>
        ) : (
          <Box sx={{ pt: 1 }}>
            <PavilionPeopleManager
              eventId={eventId}
              pavilion={pavilion}
              kind={tab === 1 ? "artists" : "cashiers"}
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cerrar
        </Button>
        {tab === 0 && (
          <Button
            variant="contained"
            color="secondary"
            onClick={() => onSave()}
            disabled={isSaving}
          >
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
