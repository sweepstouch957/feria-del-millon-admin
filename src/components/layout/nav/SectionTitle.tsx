"use client";

import { Box, Typography } from "@mui/material";
import { LAYOUT_COLORS as C } from "../layoutConfig";

type Props = {
  label: string;
};

const SectionTitle = ({ label }: Props) => (
  <Box sx={{ px: 2.25, py: 1, mt: 1 }}>
    <Typography
      variant="overline"
      sx={{
        color: C.textMuted,
        letterSpacing: 1.2,
        fontWeight: 800,
        fontSize: 11,
      }}
    >
      {label}
    </Typography>
  </Box>
);

export default SectionTitle;
