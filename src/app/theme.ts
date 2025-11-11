"use client";

import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#424242", // gris medio
      light: "#616161",
      dark: "#212121",
    },
    secondary: {
      main: "#757575", // gris claro
      light: "#9e9e9e",
      dark: "#424242",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
    text: {
      primary: "#212121",
      secondary: "#616161",
    },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h1: {
      fontSize: "2rem",
      fontWeight: 600,
      color: "#212121",
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 600,
      color: "#212121",
    },
    h3: {
      fontSize: "1.25rem",
      fontWeight: 600,
      color: "#212121",
    },
    body1: {
      fontSize: "0.875rem",
      color: "#424242",
    },
    body2: {
      fontSize: "0.75rem",
      color: "#616161",
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#1f1f1f", // gris oscuro casi negro
          color: "#ffffff",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(158, 158, 158, 0.2)",
            "&:hover": {
              backgroundColor: "rgba(158, 158, 158, 0.3)",
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: "#ffffff",
          color: "#424242",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          backgroundColor: "#424242",
          color: "#fff",
          "&:hover": {
            backgroundColor: "#212121",
          },
        },
      },
    },
  },
});
