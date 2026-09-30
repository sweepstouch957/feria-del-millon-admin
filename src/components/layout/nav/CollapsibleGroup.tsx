"use client";

import { Box, Collapse } from "@mui/material";
import NavItem from "./NavItem";
import { LAYOUT_COLORS as C } from "../layoutConfig";

/* Grupo de la lateral: el chevron gira y los hijos cuelgan de un filete.
   Contraída a riel no hay dónde desplegar, así que el grupo navega al primer
   hijo (lo decide quien lo usa, vía onRailClick). */

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  icon: React.ReactNode;
  text: string;
  children: React.ReactNode;
  active?: boolean;
  rail?: boolean;
  onRailClick?: () => void;
};

const CollapsibleGroup = ({
  open,
  setOpen,
  icon,
  text,
  children,
  active,
  rail = false,
  onRailClick,
}: Props) => (
  <Box>
    <NavItem
      rail={rail}
      parentActive={active}
      onClick={() => (rail ? onRailClick?.() : setOpen(!open))}
      icon={icon}
      text={text}
      trailing={
        <Box
          component="svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          sx={{
            width: 12,
            height: 12,
            opacity: 0.6,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform .25s ease",
          }}
        >
          <path d="M9 6l6 6-6 6" />
        </Box>
      }
    />
    {!rail && (
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            ml: 2.25,
            mr: 0,
            mt: "2px",
            mb: 0.75,
            pl: 1.25,
            borderLeft: `1px solid ${C.lineSoft}`,
          }}
        >
          {children}
        </Box>
      </Collapse>
    )}
  </Box>
);

export default CollapsibleGroup;
