"use client";

import { Alert } from "@mui/material";
import { GraduationCap } from "lucide-react";
import { useCajaAccess } from "../hooks/useCajaAccess";

/** Franja fija mientras la cuenta está en capacitación: nada de lo que haga se guarda. */
export function PracticeBanner() {
  const { practice } = useCajaAccess();
  if (!practice) return null;
  return (
    <Alert
      severity="warning"
      icon={<GraduationCap size={22} />}
      sx={{ mb: 2, position: "sticky", top: 0, zIndex: 2, alignItems: "center", fontSize: 15 }}
    >
      <strong>MODO PRÁCTICA.</strong> Puedes vender, emitir y validar para aprender: nada se cobra ni se guarda.
      Las obras y fotos son las reales de la feria. Coordinación lo apaga cuando abra la feria.
    </Alert>
  );
}
