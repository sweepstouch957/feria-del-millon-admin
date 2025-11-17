"use client";

import React, { useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Typography,
  alpha,
  Collapse,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Dashboard as DashboardIcon,
  Collections as CollectionsIcon,
  GroupOutlined as UsersIcon,
  Event as EventsIcon,
  ConfirmationNumberOutlined as TicketsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountCircle as AccountIcon,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./ui/LanguageSwitcher";
import ProfileMenu from "./ui/ProfileMenu";
import { useAuth } from "@/provider/authProvider";
import { NotebookIcon, Paintbrush2, ShoppingBag } from "lucide-react";

/** Paleta gris sobria */
const C = {
  bgStart: "#0E0E0E",
  bgEnd: "#151515",
  text: "#EDEDED",
  text2: "#AFAFAF",
  textMuted: "#787878",
  line: "rgba(255,255,255,0.06)",
  hover: "rgba(255,255,255,0.06)",
  selected: "rgba(255,255,255,0.08)",
  accentLine: "#9E9E9E",
};

const drawerWidth = 280;

/* -------------------------------------------------------
   Pequeños componentes reutilizables
--------------------------------------------------------*/
const SectionTitle = ({ label }: { label: string }) => (
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

const NavItem = ({
  active,
  onClick,
  icon,
  text,
  trailing,
  inset = false,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  text: string;
  trailing?: React.ReactNode;
  inset?: boolean;
}) => (
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

const CollapsibleGroup = ({
  open,
  setOpen,
  icon,
  text,
  children,
  active,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  icon: React.ReactNode;
  text: string;
  children: React.ReactNode;
  active?: boolean;
}) => (
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

const SearchBox = ({ placeholder }: { placeholder: string }) => (
  <Box
    sx={{
      position: "relative",
      borderRadius: 999,
      backgroundColor: alpha("#000", 0.04),
      "&:hover": { backgroundColor: alpha("#000", 0.06) },
      width: "100%",
      maxWidth: 460,
      border: "1px solid rgba(0,0,0,0.06)",
    }}
  >
    <Box
      sx={{
        px: 1.5,
        height: "100%",
        position: "absolute",
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <SearchIcon sx={{ color: "#9e9e9e" }} />
    </Box>
    <InputBase
      placeholder={placeholder}
      sx={{
        width: "100%",
        "& .MuiInputBase-input": { padding: "10px 14px 10px 40px" },
      }}
    />
  </Box>
);

/* -------------------------------------------------------
   Layout principal
--------------------------------------------------------*/
interface MergedLayoutProps {
  children: React.ReactNode;
}

const MergedLayout: React.FC<MergedLayoutProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { t } = useTranslation();
  const { isAuthenticated, isAuthLoading, user } = useAuth();

  // títulos dinámicos
  const title = useMemo(() => {
    const map: Record<string, string> = {
      "/": t("navigation.dashboard"),
      "/inventory": "Inventario",
      "/inventory/artworks": "Artes",
      "/artists": t("navigation.artists"),
      "/users": t("navigation.users"),
      "/cashiers": t("navigation.cashiers"),
      "/events": t("navigation.events"),
      "/tickets": t("navigation.tickets"),
      "/account": t("navigation.myAccount"),
    };
    return map[pathname] ?? "Feria del Millón";
  }, [pathname, t]);

  // Secciones abiertas por ruta actual
  const [mobileOpen, setMobileOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(
    pathname.startsWith("/inventory")
  );

  const [opsOpen, setOpsOpen] = useState(
    pathname.startsWith("/events") || pathname.startsWith("/tickets")
  );

  const handleDrawerToggle = () => setMobileOpen((v) => !v);

  // Config de navegación (menos código, más control)
  const inventoryItems = [
    {
      label: "Artes",
      icon: <Paintbrush2 />,
      href: "/inventory/artworks",
    },
  ];

  const DrawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
        color: C.text,
      }}
    >
      {/* Brand */}
      <Toolbar sx={{ minHeight: 76, px: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 120, height: 28, position: "relative" }}>
            <Image
              src="/fdm-logo.png"
              alt="Feria del Millón"
              fill
              sizes="120px"
              priority
              style={{
                objectFit: "contain",
                filter: "invert(1) brightness(1.2)",
              }}
              onError={(e) => {
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent)
                  parent.innerHTML =
                    '<span style="font-weight:900;color:#EDEDED">Feria del Millón</span>';
              }}
            />
          </Box>
        </Box>
      </Toolbar>

      <Divider sx={{ borderColor: C.line }} />

      {/* LIBRARY / INVENTARIO */}
      <SectionTitle label="Inventario" />
      <List sx={{ py: 0 }}>
        <ListItem disablePadding sx={{ display: "block" }}>
          <NavItem
            active={pathname === "/"}
            onClick={() => router.push("/")}
            icon={<DashboardIcon />}
            text={t("navigation.dashboard")}
          />
        </ListItem>

        <CollapsibleGroup
          open={inventoryOpen}
          setOpen={setInventoryOpen}
          icon={<CollectionsIcon />}
          text="Inventario"
          active={pathname.startsWith("/inventory")}
        >
          {inventoryItems.map((it) => (
            <NavItem
              key={it.href}
              inset
              active={pathname === it.href}
              onClick={() => router.push(it.href)}
              icon={it.icon}
              text={it.label}
            />
          ))}
        </CollapsibleGroup>
      </List>

      <SectionTitle label={t("navigation.users")} />
      <List sx={{ py: 0 }}>
        <NavItem
          active={pathname === "/users"}
          onClick={() => router.push("/users")}
          icon={<UsersIcon sx={{ fontSize: 18 }} />}
          text={t("navigation.users")}
        />
      </List>

      {/* OPERATIONS */}
      <SectionTitle label={t("navigation.operations")} />
      <List sx={{ py: 0 }}>
        <CollapsibleGroup
          open={opsOpen}
          setOpen={setOpsOpen}
          icon={<EventsIcon />}
          text={t("navigation.operations")}
        >
          <NavItem
            inset
            active={pathname === "/events"}
            onClick={() => router.push("/events")}
            icon={<EventsIcon sx={{ fontSize: 18 }} />}
            text={t("navigation.events")}
          />
          <NavItem
            inset
            active={pathname === "/tickets"}
            onClick={() => router.push("/tickets")}
            icon={<TicketsIcon sx={{ fontSize: 18 }} />}
            text={t("navigation.tickets")}
          />
          {/* 🆕 Pedidos */}
          <NavItem
            inset
            active={pathname === "/orders"}
            onClick={() => router.push("/orders")}
            icon={<ShoppingBag />} // puedes cambiar por ShoppingCartIcon
            text={t("navigation.orders")}
          />
          {/* 🆕 Reservaciones */}
          <NavItem
            inset
            active={pathname === "/reservations"}
            onClick={() => router.push("/reservations")}
            icon={<NotebookIcon />} // puedes cambiar por EventAvailableIcon
            text={t("navigation.reservations")}
          />
        </CollapsibleGroup>
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Divider sx={{ borderColor: C.line, mt: 1 }} />
      <Box sx={{ px: 2.25, py: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: C.textMuted,
            letterSpacing: 1.2,
            fontWeight: 800,
            fontSize: 11,
          }}
        >
          {t("navigation.account")}
        </Typography>
      </Box>
      <List sx={{ py: 0, mb: 1 }}>
        <ListItem disablePadding sx={{ display: "block" }}>
          <NavItem
            active={pathname === "/account"}
            onClick={() => router.push("/account")}
            icon={<AccountIcon />}
            text={t("navigation.myAccount")}
          />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      {/* APP BAR */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: "#FFFFFF",
          color: "#424242",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Toolbar sx={{ minHeight: 76 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 900,
              mr: 2,
              display: { xs: "none", sm: "block" },
            }}
          >
            {title}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
            <SearchBox placeholder={t("common.search")} />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <LanguageSwitcher />
            {!isAuthLoading && isAuthenticated && <ProfileMenu />}
          </Box>
        </Toolbar>
      </AppBar>

      {/* DRAWER */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
              color: C.text,
              borderRight: `1px solid ${C.line}`,
            },
          }}
        >
          {DrawerContent}
        </Drawer>

        {/* Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              background: `linear-gradient(180deg, ${C.bgStart} 0%, ${C.bgEnd} 100%)`,
              color: C.text,
              borderRight: `1px solid ${C.line}`,
            },
          }}
          open
        >
          {DrawerContent}
        </Drawer>
      </Box>

      {/* MAIN */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: "76px",
          backgroundColor: "#F5F5F5",
          minHeight: "calc(100vh - 76px)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MergedLayout;
