"use client";

import React, { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Collections as CollectionsIcon,
  Brush as BrushIcon,
  Event as EventIcon,
  PointOfSale as POSIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/provider/authProvider";

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const titleByPath: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/artworks": "Obras",
  "/artists": "Artistas",
  "/events": "Eventos",
  "/sales": "Ventas",
  "/account": "Mi cuenta",
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleMenu = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleClose();
    await logout(); // limpia token + redirige a /login desde el AuthProvider
  };

  const menuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Obras", icon: <CollectionsIcon />, path: "/artworks" },
    { text: "Artistas", icon: <BrushIcon />, path: "/artists" },
    { text: "Eventos", icon: <EventIcon />, path: "/events" },
    { text: "Ventas", icon: <POSIcon />, path: "/sales" },
    { text: "Mi cuenta", icon: <AccountIcon />, path: "/account" },
  ];

  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#1f1f1f", // gris muy oscuro
        color: "white",
      }}
    >
      <Toolbar>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Image
            src="/fdm-logo.png"
            alt="Feria del Millón"
            width={28}
            height={28}
          />
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ color: "white", fontWeight: 700 }}
          >
            Feria del Millón
          </Typography>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <List sx={{ py: 1 }}>
        {menuItems.map((item) => {
          const active = pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => router.push(item.path)}
                sx={{
                  color: "white",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
                  ...(active && {
                    backgroundColor: "rgba(158,158,158,0.15)", // gris medio con alpha
                    borderRight: "3px solid #9e9e9e",
                  }),
                }}
              >
                <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />
      <List sx={{ py: 0 }}>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ color: "white" }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Cerrar sesión" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  // Título dinámico del AppBar
  const appTitle = titleByPath[pathname ?? ""] ?? "Feria del Millón";

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: "white",
          color: "#424242",
          boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700 }}
          >
            {appTitle}
          </Typography>
          <div>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar sx={{ bgcolor: "#9e9e9e", color: "#fff" }}>
                <AccountIcon />
              </Avatar>
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
              keepMounted
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem
                onClick={() => {
                  handleClose();
                  router.push("/account");
                }}
              >
                <AccountIcon sx={{ mr: 1 }} />
                Mi cuenta
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <LogoutIcon sx={{ mr: 1 }} />
                Cerrar sesión
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      {/* Navegación lateral */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="sidebar"
      >
        {/* Móvil */}
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
              bgcolor: "#1f1f1f",
            },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              bgcolor: "#1f1f1f",
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: "64px",
          backgroundColor: "#f5f5f5",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
