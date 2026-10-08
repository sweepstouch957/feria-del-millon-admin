"use client";

import * as React from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { type Dayjs } from "dayjs";

import { eyebrow } from "@/app/theme";

/* Un rango de fechas con dos extremos opcionales.

   No usa el DateRangePicker de MUI porque ése vive en @mui/x-date-pickers-pro,
   que es de licencia comercial. Son dos DatePicker del paquete libre atados
   entre sí: el "desde" no deja elegir después del "hasta" y al revés, así que
   no hay forma de guardar un rango al revés.

   No monta LocalizationProvider: ya hay uno solo en el layout del panel, y es
   donde debe estar —uno por aplicación, con su idioma y su adaptador. */

export type DateRange = { from: Dayjs | null; to: Dayjs | null };

type Shortcut = { label: string; value: () => DateRange };

export default function DateRangeField({
  label,
  hint,
  value,
  onChange,
  shortcuts = [],
  /** Texto cuando las dos puntas están vacías. */
  emptyText = "Sin límite",
  disabled,
}: {
  label: string;
  hint?: string;
  value: DateRange;
  onChange: (next: DateRange) => void;
  shortcuts?: Shortcut[];
  emptyText?: string;
  disabled?: boolean;
}) {
  const { from, to } = value;

  // En palabras, que es como lo va a leer quien abra la pantalla.
  const summary = React.useMemo(() => {
    const f = (d: Dayjs) => d.format("D [de] MMMM");
    if (from && to) return `Del ${f(from)} al ${f(to)} de ${to.format("YYYY")}`;
    if (from) return `Desde el ${f(from)} de ${from.format("YYYY")}, sin fecha de cierre`;
    if (to) return `Abierta hasta el ${f(to)} de ${to.format("YYYY")}`;
    return emptyText;
  }, [from, to, emptyText]);

  const closed = !!to && to.endOf("day").isBefore(dayjs());

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", p: 2 }}>
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        sx={{ mb: 1.5 }}
      >
        <Typography sx={{ ...eyebrow, fontSize: 9.5, color: "text.secondary" }}>{label}</Typography>
        {(from || to) && (
          <Chip
            size="small"
            variant="outlined"
            color={closed ? "default" : "success"}
            label={closed ? "Cerrada" : "Abierta"}
          />
        )}
      </Stack>

      {hint && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {hint}
        </Typography>
      )}

      <Stack direction="row" flexWrap="wrap" gap={2}>
        <DatePicker
          label="Abre"
          value={from}
          disabled={disabled}
          // El inicio no puede pasarse del final.
          maxDate={to ?? undefined}
          onChange={(next) => onChange({ from: next, to })}
          slotProps={{
            textField: { size: "small", sx: { flex: "1 1 180px" } },
            field: { clearable: true, onClear: () => onChange({ from: null, to }) },
          }}
        />
        <DatePicker
          label="Cierra"
          value={to}
          disabled={disabled}
          minDate={from ?? undefined}
          onChange={(next) => onChange({ from, to: next })}
          slotProps={{
            textField: { size: "small", sx: { flex: "1 1 180px" } },
            field: { clearable: true, onClear: () => onChange({ from, to: null }) },
          }}
        />
      </Stack>

      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ mt: 1.5 }}>
        {shortcuts.map((s) => (
          <Chip
            key={s.label}
            size="small"
            label={s.label}
            onClick={() => onChange(s.value())}
            disabled={disabled}
            sx={{ borderRadius: 0 }}
          />
        ))}
        {(from || to) && (
          <Button
            size="small"
            color="inherit"
            disabled={disabled}
            onClick={() => onChange({ from: null, to: null })}
            sx={{ ml: "auto" }}
          >
            Quitar fechas
          </Button>
        )}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
        {summary}
      </Typography>
    </Box>
  );
}
