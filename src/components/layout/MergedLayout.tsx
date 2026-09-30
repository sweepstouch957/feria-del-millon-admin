"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Box, Drawer, Tooltip } from "@mui/material";
import { Menu as MenuIcon, Search as SearchIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useThemeMode } from "@/provider/ThemeModeProvider";
import { useAuth } from "@/provider/authProvider";

import SidebarContent from "./nav/SidebarContent";
import {
  drawerWidth,
  railWidth,
  mobileDrawerWidth,
  headerHeight,
  routeInfo,
} from "./layoutConfig";

/* Marco del panel: lateral oscura + cabecera de 58px con miga de pan,
   buscador, tema y cuenta. El contenido va centrado a 1440px con aire
   generoso: las páginas solo aportan su encabezado y sus tarjetas. */

const RAIL_KEY = "fdm-admin-rail";

/** Botón de la cabecera: píldora de filete fino, como en el diseño. */
const headerBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 0.75,
  height: 30,
  px: 1.5,
  background: "transparent",
  color: "inherit",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 999,
  cursor: "pointer",
  font: "inherit",
  fontSize: 9.5,
  letterSpacing: "0.18em",
  textTransform: "uppercase" as const,
  whiteSpace: "nowrap" as const,
  transition: "all .25s ease",
  "&:hover": { borderColor: "primary.main", color: "primary.main" },
};

const initialsOf = (first?: string, last?: string, email?: string) => {
  const a = (first ?? "").trim();
  const b = (last ?? "").trim();
  if (a || b) return `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase();
  return (email ?? "").trim()[0]?.toUpperCase() ?? "·";
};

const MergedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user } = useAuth();
  const { mode, toggleMode } = useThemeMode();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [rail, setRail] = useState(false);

  // La preferencia de riel se lee después de montar: en SSR no hay localStorage
  // y pintar un ancho y corregirlo luego haría saltar el layout.
  useEffect(() => {
    try {
      if (localStorage.getItem(RAIL_KEY) === "1") setRail(true);
    } catch {}
  }, []);

  const toggleRail = () => {
    setRail((v) => {
      try {
        localStorage.setItem(RAIL_KEY, v ? "0" : "1");
      } catch {}
      return !v;
    });
  };

  const { crumb, title } = useMemo(() => routeInfo(pathname), [pathname]);
  const width = rail ? railWidth : drawerWidth;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Lateral fija (escritorio) */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          flex: `0 0 ${width}px`,
          width,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          height: "100vh",
          transition: "flex-basis .25s ease, width .25s ease",
        }}
      >
        <SidebarContent pathname={pathname} rail={rail} onToggleRail={toggleRail} />
      </Box>

      {/* Lateral en cajón (móvil) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: mobileDrawerWidth,
            border: 0,
            backgroundImage: "none",
          },
        }}
      >
        <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Cabecera */}
        <Box
          component="header"
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            gap: 1.75,
            height: headerHeight,
            px: { xs: 2, md: 3, lg: 4 },
            borderBottom: "1px solid",
            borderColor: "divider",
            backdropFilter: "blur(12px)",
            backgroundColor: (t) =>
              t.palette.mode === "dark" ? "rgba(12,12,11,0.92)" : "rgba(247,246,242,0.92)",
          }}
        >
          <Box
            component="button"
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            sx={{ ...headerBtn, display: { xs: "inline-flex", md: "none" }, px: 1.25 }}
          >
            <MenuIcon size={14} strokeWidth={1.4} />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              minWidth: 0,
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "text.secondary",
              whiteSpace: "nowrap",
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              {crumb}
            </Box>
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, opacity: 0.5 }}>
              /
            </Box>
            <Box
              component="span"
              sx={{ color: "text.primary", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {title}
            </Box>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Box
            component="label"
            sx={{
              display: { xs: "none", lg: "flex" },
              alignItems: "center",
              gap: 1,
              width: 230,
              py: 0.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              color: "text.secondary",
              "&:focus-within": { borderColor: "primary.main" },
            }}
          >
            <SearchIcon size={14} strokeWidth={1.4} style={{ opacity: 0.55 }} />
            <Box
              component="input"
              type="search"
              placeholder="Buscar en el panel"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key !== "Enter") return;
                const q = (e.target as HTMLInputElement).value.trim();
                if (q) router.push(`/users?q=${encodeURIComponent(q)}`);
              }}
              sx={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: 0,
                outline: "none",
                color: "text.primary",
                font: "inherit",
                fontSize: 14,
              }}
            />
          </Box>

          <Box component="button" type="button" onClick={toggleMode} sx={headerBtn}>
            {mode === "dark" ? "Claro" : "Oscuro"}
          </Box>

          <Tooltip title="Mi cuenta">
            <Box
              component="button"
              type="button"
              onClick={() => router.push("/account")}
              aria-label="Mi cuenta"
              sx={{
                flex: "0 0 auto",
                width: 34,
                height: 34,
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                border: "1px solid",
                borderColor: "divider",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                font: "inherit",
                fontSize: 11,
                letterSpacing: "0.08em",
                transition: "all .25s ease",
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              {initialsOf(user?.firstName, user?.lastName, user?.email)}
            </Box>
          </Tooltip>
        </Box>

        {/* Contenido */}
        <Box
          component="main"
          sx={{
            flex: 1,
            width: "100%",
            maxWidth: 1440,
            mx: "auto",
            px: { xs: 2, md: 3, lg: 4 },
            pt: { xs: 2.5, md: 3.5 },
            pb: 6,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default MergedLayout;
