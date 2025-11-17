"use client";

import { ListItem, Collapse } from "@mui/material";
import NavItem from "./NavItem";
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { LAYOUT_COLORS as C } from "../layoutConfig";

type Props = {
  open: boolean;
  setOpen: (v: boolean) => void;
  icon: React.ReactNode;
  text: string;
  children: React.ReactNode;
  active?: boolean;
};

const CollapsibleGroup = ({
  open,
  setOpen,
  icon,
  text,
  children,
  active,
}: Props) => (
  <ListItem disablePadding sx={{ display: "block" }}>
    <NavItem
      active={active}
      onClick={() => setOpen(!open)}
      icon={icon}
      text={text}
      trailing={
        open ? (
          <ExpandLessIcon sx={{ color: C.text2, fontSize: 20 }} />
        ) : (
          <ExpandMoreIcon sx={{ color: C.text2, fontSize: 20 }} />
        )
      }
    />
    <Collapse in={open} timeout="auto" unmountOnExit>
      {children}
    </Collapse>
  </ListItem>
);

export default CollapsibleGroup;
