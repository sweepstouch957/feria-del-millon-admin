"use client";

import React, { useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  Tooltip,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import { useThemeMode } from "@/provider/ThemeModeProvider";
import { useAuth } from "@/provider/authProvider";

import SearchBox from "./nav/SearchBox";
import SidebarContent from "./nav/SidebarContent";
import { drawerWidth } from "./layoutConfig";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import ProfileMenu from "../ui/ProfileMenu";

/* ──── Animated Sun/Moon Toggle ──── */
const ThemeToggleButton = () => {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === "dark";

  return (
    <Tooltip title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} arrow>
      <IconButton
        onClick={toggleMode}
        sx={{
          width: 42,
          height: 42,
          borderRadius: "12px",
          position: "relative",
          overflow: "hidden",
          border: (t) =>
            t.palette.mode === "dark"
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid rgba(0,0,0,0.08)",
          backgroundColor: (t) =>
            t.palette.mode === "dark"
              ? "rgba(255,255,255,0.05)"
              : "rgba(0,0,0,0.03)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "scale(1.08)",
            backgroundColor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(74,222,128,0.15)"
                : "rgba(34,197,94,0.1)",
            borderColor: (t) =>
              t.palette.mode === "dark"
                ? "rgba(74,222,128,0.3)"
                : "rgba(34,197,94,0.3)",
            boxShadow: (t) =>
              t.palette.mode === "dark"
                ? "0 0 20px rgba(74,222,128,0.15)"
                : "0 0 20px rgba(34,197,94,0.1)",
          },
        }}
      >
        {/* Sun icon */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: isDark ? 0 : 1,
            transform: isDark ? "rotate(90deg) scale(0)" : "rotate(0) scale(1)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        </Box>
        {/* Moon icon */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            opacity: isDark ? 1 : 0,
            transform: isDark ? "rotate(0) scale(1)" : "rotate(-90deg) scale(0)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </Box>
      </IconButton>
    </Tooltip>
  );
};

/* ──── Layout principal ──── */
interface MergedLayoutProps {
  children: React.ReactNode;
}

const MergedLayout: React.FC<MergedLayoutProps> = ({ children }) => {
  const pathname = usePathname() || "";
  const { t } = useTranslation();
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const muiTheme = useTheme();
  const isDark = muiTheme.palette.mode === "dark";

  const handleDrawerToggle = () => setMobileOpen((v) => !v);

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
      "/tickets/validator": t("navigation.qrValidator"),
      "/orders": "Pedidos",
      "/orders/new": "Crear pedido",
      "/my/artworks": "Mis obras",
      "/my/orders": "Mis pedidos",
      "/solicitudes": "Solicitudes de artistas",
      "/account": t("navigation.myAccount"),
    };
    return map[pathname] ?? "Feria del Millón";
  }, [pathname, t]);

  return (
    <Box sx={{ display: "flex" }}>
      {/* APP BAR */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: isDark ? "#09090b" : "#FFFFFF",
          color: isDark ? "#fafafa" : "#09090b",
          borderBottom: isDark
            ? "1px solid rgba(255,255,255,0.06)"
            : "1px solid rgba(0,0,0,0.06)",
          backdropFilter: "blur(12px)",
          transition: "background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease",
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

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ThemeToggleButton />
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
            },
          }}
        >
          <SidebarContent pathname={pathname} />
        </Drawer>

        {/* Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          <SidebarContent pathname={pathname} />
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
          backgroundColor: isDark ? "#09090b" : "#F5F5F5",
          minHeight: "calc(100vh - 76px)",
          transition: "background-color 0.3s ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MergedLayout;
