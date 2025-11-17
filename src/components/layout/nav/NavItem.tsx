"use client";

import { Box, ListItemText } from "@mui/material";
import { LAYOUT_COLORS as C } from "../layoutConfig";

type NavItemProps = {
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  text: string;
  trailing?: React.ReactNode;
  inset?: boolean;
};

const NavItem = ({
  active,
  onClick,
  icon,
  text,
  trailing,
  inset = false,
}: NavItemProps) => (
  <Box
    onClick={onClick}
    sx={{
      mx: 1,
      px: 1.25,
      py: 1,
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      borderRadius: 1.25,
      cursor: "pointer",
      color: C.text,
      position: "relative",
      ...(inset && { ml: 3, mr: 1 }),
      ...(active && {
        backgroundColor: C.selected,
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 8,
          bottom: 8,
          width: 3,
          borderRadius: 2,
          backgroundColor: C.accentLine,
        },
      }),
      "&:hover": { backgroundColor: C.hover },
    }}
  >
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1,
        display: "grid",
        placeItems: "center",
        color: "inherit",
        opacity: 0.95,
      }}
    >
      {icon}
    </Box>
    <ListItemText
      primaryTypographyProps={{
        sx: {
          fontSize: 14.5,
          fontWeight: active ? 700 : 500,
          color: active ? C.text : C.text2,
          letterSpacing: 0.2,
        },
      }}
      primary={text}
    />
    {trailing}
  </Box>
);

export default NavItem;
