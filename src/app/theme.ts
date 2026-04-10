"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#22c55e", // Verde vibrante Feria
      light: "#4ade80",
      dark: "#16a34a",
      contrastText: "#000000", // Texto oscuro sobre el verde para mejor legibilidad
    },
    secondary: {
      main: "#09090b", // Negro profundo
      light: "#27272a",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f4f4f5", // Gris muy suave, casi blanco
      paper: "#ffffff",
    },
    text: {
      primary: "#09090b",
      secondary: "#52525b",
    },
    error: {
      main: "#ef4444",
    },
    success: {
      main: "#22c55e",
    },
  },
  typography: {
    fontFamily: "var(--font-geist-sans), Inter, sans-serif",
    h1: { fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.01em" },
    h5: { fontWeight: 800, letterSpacing: "-0.01em" },
    h6: { fontWeight: 800 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 700, textTransform: "none", letterSpacing: "0.2px" },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        containedPrimary: {
          color: "#000000", // texto negro en botón primary
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.04)",
          borderRadius: 16,
          border: "1px solid #e4e4e7",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0a0a0a", // negro
          color: "#ffffff",
          borderRight: "1px solid #27272a",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          "&:hover": {
            backgroundColor: "transparent",
            color: "#16a34a",
          },
          "&.Mui-selected": {
            color: "#16a34a",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#16a34a",
          height: 3,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
      },
    },
  },
});
