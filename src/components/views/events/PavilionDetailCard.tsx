"use client";

import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Button,
} from "@mui/material";

import type { PavilionFormState } from "@hooks/events/usePavilionsManager";

type Props = {
  pavilionForm: PavilionFormState | null;
  onFieldChange: (
    field: keyof PavilionFormState,
    value: string | number | boolean
  ) => void;
  onToggleActive: (active: boolean) => void;
  onSave: () => void;
  isSaving: boolean;
};

export default function PavilionDetailCard({
  pavilionForm,
  onFieldChange,
  onToggleActive,
  onSave,
  isSaving,
}: Props) {
  if (!pavilionForm) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardHeader
          title="Detalle de pabellón"
          subheader="Selecciona un pabellón en la tabla para editarlo"
          sx={{ pb: 1 }}
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Selecciona un pabellón en la tabla de arriba para ver y editar sus
            detalles.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleSaveClick = () => {
    onSave();
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardHeader
        title="Detalle de pabellón"
        subheader="Edita la información del pabellón seleccionado"
        sx={{ pb: 1 }}
      />
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle1" fontWeight={600}>
            {pavilionForm.name}
          </Typography>
          <Chip
            size="small"
            label={pavilionForm.active ? "Activo" : "Inactivo"}
            color={pavilionForm.active ? "success" : "default"}
          />
          <FormControlLabel
            sx={{ ml: "auto" }}
            control={
              <Switch
                checked={!!pavilionForm.active}
                onChange={(e) => {
                  onFieldChange("active", e.target.checked);
                  onToggleActive(e.target.checked);
                }}
              />
            }
            label={
              pavilionForm.active
                ? "Pabellón activo"
                : "Pabellón desactivado"
            }
          />
        </Stack>

        <TextField
          label="Nombre"
          size="small"
          value={pavilionForm.name}
          onChange={(e) => onFieldChange("name", e.target.value)}
          fullWidth
        />
        <TextField
          label="Slug"
          size="small"
          value={pavilionForm.slug}
          onChange={(e) => onFieldChange("slug", e.target.value)}
          fullWidth
        />
        <TextField
          label="Descripción"
          size="small"
          value={pavilionForm.description ?? ""}
          onChange={(e) =>
            onFieldChange("description", e.target.value)
          }
          fullWidth
          multiline
          minRows={3}
        />

        <Stack direction="row" spacing={2}>
          <TextField
            label="Min. precio obra"
            size="small"
            type="number"
            value={pavilionForm.minArtworkPrice ?? ""}
            onChange={(e) =>
              onFieldChange(
                "minArtworkPrice",
                Number(e.target.value) || 0
              )
            }
            fullWidth
          />
          <TextField
            label="Máx. precio obra"
            size="small"
            type="number"
            value={pavilionForm.maxArtworkPrice ?? ""}
            onChange={(e) =>
              onFieldChange(
                "maxArtworkPrice",
                Number(e.target.value) || 0
              )
            }
            fullWidth
          />
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: "flex-end", px: 3, pb: 2 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSaveClick}
          disabled={isSaving}
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </CardActions>
    </Card>
  );
}
