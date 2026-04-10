"use client";

import React, { useMemo, useState } from "react";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import {  usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";


import { useAuth } from "@/provider/authProvider";

import SearchBox from "./nav/SearchBox";
import SidebarContent from "./nav/SidebarContent";
import { drawerWidth } from "./layoutConfig";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import ProfileMenu from "../ui/ProfileMenu";

interface MergedLayoutProps {
  children: React.ReactNode;
}

const MergedLayout: React.FC<MergedLayoutProps> = ({ children }) => {
  const pathname = usePathname() || "";
  const { t } = useTranslation();
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      "/account": t("navigation.myAccount"),
    };
    return map[pathname] ?? "Feria del Millón";
  }, [pathname, t]);

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
