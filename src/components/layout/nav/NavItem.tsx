"use client";

import { Box, Tooltip } from "@mui/material";
import { LAYOUT_COLORS as C } from "../layoutConfig";

/* Ítem de la lateral. Activo = rótulo en papel, fondo apenas levantado y un
   filete de acento pegado al borde izquierdo (no un bloque de color). */

type NavItemProps = {
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  text: string;
  trailing?: React.ReactNode;
  /** Sub-ítem dentro de un grupo abierto. */
  inset?: boolean;
  /** Lateral contraída: solo el icono, centrado, con el rótulo en el tooltip. */
  rail?: boolean;
  /** Algún hijo del grupo está activo: el padre se aclara sin marcarse. */
  parentActive?: boolean;
};

const NavItem = ({
  active,
  onClick,
  icon,
  text,
  trailing,
  inset = false,
  rail = false,
  parentActive = false,
}: NavItemProps) => {
  const button = (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      title={rail ? undefined : text}
      sx={{
        width: "100%",
        height: inset ? 30 : 34,
        display: "flex",
        alignItems: "center",
        justifyContent: rail ? "center" : "flex-start",
        gap: 1.4,
        px: rail ? 0 : 1.25,
        border: 0,
        background: active ? C.selected : "transparent",
        boxShadow: active ? `inset 2px 0 0 ${C.accent}` : "none",
        color: active || parentActive ? C.text : C.text2,
        cursor: "pointer",
        textAlign: "left",
        font: "inherit",
        fontSize: inset ? 13 : 13.5,
        fontWeight: active ? 400 : 300,
        letterSpacing: "0.01em",
        transition: "background-color .25s ease, color .25s ease",
        "&:hover": { color: C.text, backgroundColor: active ? C.selected : C.hover },
        "& svg": { flex: "0 0 auto", width: 16, height: 16 },
      }}
    >
      {icon}
      {!rail && (
        <Box
          component="span"
          sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {text}
        </Box>
      )}
      {!rail && trailing}
    </Box>
  );

  return rail ? (
    <Tooltip title={text} placement="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
};

export default NavItem;
