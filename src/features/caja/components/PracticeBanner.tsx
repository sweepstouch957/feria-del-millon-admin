"use client";

import { Alert, Box } from "@mui/material";
import { GraduationCap } from "lucide-react";
import { headerHeight } from "@/components/layout/layoutConfig";
import { useCajaAccess } from "../hooks/useCajaAccess";

/** Franja fija mientras la cuenta está en capacitación: nada de lo que haga se guarda. */
export function PracticeBanner() {
  const { practice } = useCajaAccess();
  if (!practice) return null;
  return (
    <Alert
      severity="warning"
      icon={<GraduationCap size={22} />}
      // Pegada bajo la cabecera fija (con top 0 quedaba escondida detrás de ella).
      sx={{ mb: 2, position: "sticky", top: headerHeight, zIndex: 2, alignItems: "center", fontSize: { xs: 13.5, sm: 15 }, py: { xs: 0.25, sm: 0.75 } }}
    >
      <strong>MODO PRÁCTICA.</strong> Puedes vender, emitir y validar para aprender: nada se cobra ni se guarda.
      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}> Las obras y fotos son las reales de la feria. Coordinación lo apaga cuando abra la feria.</Box>
    </Alert>
  );
}
