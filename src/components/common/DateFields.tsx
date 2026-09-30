"use client";

import * as React from "react";
import dayjs, { type Dayjs } from "dayjs";
import { DatePicker, DateTimePicker } from "@mui/x-date-pickers";

/* ──────────────────────────────────────────────────────────────────────
   Campos de fecha del panel: el DatePicker / DateTimePicker de MUI con la
   misma API de texto que tenían los <input type="date|datetime-local">:

     DateField      → "YYYY-MM-DD"        ("" = vacío)
     DateTimeField  → "YYYY-MM-DDTHH:mm"  (hora local, "" = vacío)

   Así cada página cambia el componente sin tocar su lógica. En escritorio
   abre un popover; en el teléfono, el selector de pantalla completa.
   ────────────────────────────────────────────────────────────────────── */

type Common = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  size?: "small" | "medium";
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  helperText?: React.ReactNode;
  error?: boolean;
  /** Mismo formato que `value`. */
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
};

const parse = (v?: string): Dayjs | null => {
  if (!v) return null;
  const d = dayjs(v);
  return d.isValid() ? d : null;
};

const fieldProps = (p: Common) => ({
  field: { clearable: !p.required },
  textField: {
    size: p.size ?? "small",
    fullWidth: p.fullWidth ?? true,
    required: p.required,
    helperText: p.helperText,
    error: p.error,
    placeholder: p.placeholder,
  },
  actionBar: { actions: ["clear", "today", "accept"] as ("clear" | "today" | "accept")[] },
});

export function DateField(p: Common) {
  return (
    <DatePicker
      label={p.label}
      value={parse(p.value)}
      onChange={(d) => p.onChange(d && d.isValid() ? d.format("YYYY-MM-DD") : "")}
      disabled={p.disabled}
      minDate={parse(p.minDate) ?? undefined}
      maxDate={parse(p.maxDate) ?? undefined}
      format="DD/MM/YYYY"
      slotProps={fieldProps(p)}
    />
  );
}

export function DateTimeField(p: Common) {
  return (
    <DateTimePicker
      label={p.label}
      value={parse(p.value)}
      onChange={(d) => p.onChange(d && d.isValid() ? d.format("YYYY-MM-DDTHH:mm") : "")}
      disabled={p.disabled}
      minDateTime={parse(p.minDate) ?? undefined}
      maxDateTime={parse(p.maxDate) ?? undefined}
      format="DD/MM/YYYY hh:mm A"
      ampm
      slotProps={fieldProps(p)}
    />
  );
}
