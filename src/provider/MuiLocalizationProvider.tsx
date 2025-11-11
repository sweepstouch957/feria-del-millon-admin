"use client";

import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/en"; // 👈 importa el locale que necesites (ej: "es" para español, "en" para inglés)

type Props = React.PropsWithChildren;

export default function MuiLocalizationProvider({ children }: Props) {
  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="en" // 👈 cámbialo a "es" si quieres español
    >
      {children}
    </LocalizationProvider>
  );
}
