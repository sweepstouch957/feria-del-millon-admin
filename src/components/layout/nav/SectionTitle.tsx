"use client";

import { Box, Typography } from "@mui/material";
import { LAYOUT_COLORS as C } from "../layoutConfig";

/* Título de sección de la lateral. Con la lateral contraída el rótulo no cabe,
   así que la separación se marca con un filete. */

type Props = {
  label: string;
  rail?: boolean;
};

const SectionTitle = ({ label, rail = false }: Props) =>
  rail ? (
    <Box sx={{ height: "1px", mx: 1.25, my: 1, backgroundColor: C.line }} />
  ) : (
    <Typography
      component="div"
      sx={{
        px: 1.25,
        pt: 1.75,
        pb: 0.75,
        fontSize: 9,
        fontWeight: 400,
        letterSpacing: "0.26em",
        textTransform: "uppercase",
        color: C.textMuted,
      }}
    >
      {label}
    </Typography>
  );

export default SectionTitle;
