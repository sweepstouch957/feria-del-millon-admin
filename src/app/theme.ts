"use client";

import { createTheme, type Theme } from "@mui/material/styles";

/* ────────────────────────────────────────────────────────
   Shared design tokens
──────────────────────────────────────────────────────── */
const shared = {
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
    button: { fontWeight: 700, textTransform: "none" as const, letterSpacing: "0.2px" },
  },
  shape: { borderRadius: 8 },
};

/* ────────────────────────────────────────────────────────
   LIGHT THEME
──────────────────────────────────────────────────────── */
export const lightTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    primary: {
      main: "#22c55e",
      light: "#4ade80",
      dark: "#16a34a",
      contrastText: "#000000",
    },
    secondary: {
      main: "#09090b",
      light: "#27272a",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    background: {
      default: "#f4f4f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#09090b",
      secondary: "#52525b",
    },
    error: { main: "#ef4444" },
    success: { main: "#22c55e" },
    divider: "rgba(0,0,0,0.08)",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: "none", "&:hover": { boxShadow: "none" } },
        containedPrimary: { color: "#000000" },
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
          backgroundColor: "#0a0a0a",
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
          "&:hover": { backgroundColor: "transparent", color: "#16a34a" },
          "&.Mui-selected": { color: "#16a34a" },
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
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
});

/* ────────────────────────────────────────────────────────
   DARK THEME
──────────────────────────────────────────────────────── */
export const darkTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    primary: {
      main: "#22c55e",
      light: "#4ade80",
      dark: "#16a34a",
      contrastText: "#000000",
    },
    secondary: {
      main: "#fafafa",
      light: "#e4e4e7",
      dark: "#a1a1aa",
      contrastText: "#09090b",
    },
    background: {
      default: "#09090b",
      paper: "#111113",
    },
    text: {
      primary: "#fafafa",
      secondary: "#a1a1aa",
    },
    error: { main: "#f87171" },
    success: { main: "#4ade80" },
    divider: "rgba(255,255,255,0.08)",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: "none", "&:hover": { boxShadow: "none" } },
        containedPrimary: { color: "#000000" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "#111113",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
          borderRight: "1px solid rgba(255,255,255,0.08)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(255,255,255,0.06)",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          "&:hover": { backgroundColor: "transparent", color: "#4ade80" },
          "&.Mui-selected": { color: "#4ade80" },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#4ade80",
          height: 3,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.12)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.2)",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#71717a",
        },
      },
    },
  },
});

// Default export for backward compat
export const theme = lightTheme;
