"use client";

import { createTheme, type Theme } from "@mui/material/styles";

/* ══════════════════════════════════════════════════════════════════════
   Sistema editorial v2 — el mismo del sitio público, traducido a MUI.

   La paleta y la tipografía vienen del diseño de Feria del Millón:
   Jost, verde #3FA46E, papel #F7F6F2, tinta #0B0B0A. Las esquinas son
   rectas (el catálogo y las fichas no tienen radio) salvo los botones,
   que son píldoras, y los micro-rótulos van en versalitas espaciadas.

   Tocar este archivo repinta las 21 páginas del panel a la vez.
   ══════════════════════════════════════════════════════════════════════ */

export const FDM = {
  green: "#3FA46E",
  greenDeep: "#14513C",
  paper: "#F7F6F2",
  ink: "#0B0B0A",
  panel: "#0B0B0A",
  onDark: "#F5F4EF",
  // Oscuro
  paperDark: "#0C0C0B",
  inkDark: "#F0EFEA",
  surfaceDark: "#161614",
  // Señales: ámbar para "trabado", terracota para error. Nada de rojos puros
  // ni verdes fluor: desentonan con la paleta impresa.
  amber: "#C9902B",
  terracotta: "#B4472A",
} as const;

const JOST = "var(--font-jost), Jost, system-ui, sans-serif";

/** Micro-rótulo en versalitas: la firma tipográfica del sistema. */
export const eyebrow = {
  fontFamily: JOST,
  fontWeight: 500,
  fontSize: 10.5,
  letterSpacing: "0.16em",
  textTransform: "uppercase" as const,
};

const shared = {
  typography: {
    fontFamily: JOST,
    // Los títulos van livianos y en versales, como en el sitio: el peso lo
    // dan el tamaño y el aire, no la negrita.
    h1: { fontFamily: JOST, fontSize: "2.6rem", fontWeight: 300, letterSpacing: "0.02em", textTransform: "uppercase" as const, lineHeight: 1.05 },
    h2: { fontFamily: JOST, fontSize: "2rem", fontWeight: 300, letterSpacing: "0.02em", textTransform: "uppercase" as const, lineHeight: 1.1 },
    h3: { fontFamily: JOST, fontSize: "1.5rem", fontWeight: 400, letterSpacing: "0.02em", lineHeight: 1.15 },
    h4: { fontFamily: JOST, fontSize: "1.25rem", fontWeight: 400, letterSpacing: "0.01em" },
    h5: { fontFamily: JOST, fontSize: "1.1rem", fontWeight: 500, letterSpacing: "0.01em" },
    h6: { fontFamily: JOST, fontSize: "1rem", fontWeight: 500, letterSpacing: "0.02em" },
    subtitle1: { fontFamily: JOST, fontWeight: 500 },
    subtitle2: { ...eyebrow, fontSize: 10.5 },
    body1: { fontFamily: JOST, fontWeight: 400, fontSize: "0.95rem", lineHeight: 1.6 },
    body2: { fontFamily: JOST, fontWeight: 400, fontSize: "0.875rem", lineHeight: 1.55 },
    caption: { fontFamily: JOST, fontWeight: 400, fontSize: "0.78rem" },
    overline: { ...eyebrow },
    button: {
      fontFamily: JOST,
      fontWeight: 500,
      fontSize: 10.5,
      letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
    },
  },
  // Rectas por defecto; los botones y chips piden su píldora aparte.
  shape: { borderRadius: 0 },
};

/** Overrides comunes a claro y oscuro. `line` es el color de filete. */
function components(line: string, dim: string, bg: string, fg: string) {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        // Reserva del canal de scroll: sin esto el layout salta al pasar de
        // una página corta a una larga.
        html: { scrollbarGutter: "stable" as const },
        body: { fontFamily: JOST },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 999,
          minHeight: 40,
          paddingInline: 22,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        sizeSmall: { minHeight: 34, paddingInline: 16, fontSize: 10 },
        outlined: { borderColor: line },
      },
    },

    MuiIconButton: { styleOverrides: { root: { borderRadius: 999 } } },

    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 999, fontFamily: JOST, fontWeight: 500, letterSpacing: "0.08em" },
        label: { paddingInline: 12 },
        outlined: { borderColor: line },
      },
    },

    // Tarjetas y superficies: filete fino, sin sombra ni radio.
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none", borderRadius: 0 },
        outlined: { borderColor: line },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { border: `1px solid ${line}`, borderRadius: 0, boxShadow: "none" },
      },
    },
    MuiAccordion: {
      defaultProps: { elevation: 0, disableGutters: true },
      styleOverrides: { root: { border: `1px solid ${line}`, "&:before": { display: "none" } } },
    },

    // Campos: línea inferior, como en el login del sitio.
    MuiTextField: { defaultProps: { variant: "standard" as const } },
    MuiInput: {
      styleOverrides: {
        root: { fontFamily: JOST, fontSize: 15 },
        underline: {
          "&:before": { borderBottom: `1px solid ${line}` },
          "&:hover:not(.Mui-disabled):before": { borderBottom: `1px solid ${dim}` },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 0 },
        notchedOutline: { borderColor: line },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { ...eyebrow, fontSize: 10, color: dim } },
    },
    MuiSelect: { styleOverrides: { select: { fontFamily: JOST } } },

    // Pestañas: subrayado en acento, sin píldora.
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40, borderBottom: `1px solid ${line}` },
        indicator: { height: 1, backgroundColor: FDM.green },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          ...eyebrow,
          fontSize: 11,
          minHeight: 40,
          paddingInline: 0,
          marginRight: 28,
          minWidth: 0,
          "&.Mui-selected": { color: FDM.green },
        },
      },
    },

    MuiDialog: { styleOverrides: { paper: { borderRadius: 0, border: `1px solid ${line}` } } },
    MuiDialogTitle: {
      styleOverrides: { root: { fontFamily: JOST, fontWeight: 400, fontSize: "1.35rem", letterSpacing: "0.02em" } },
    },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 0, border: `1px solid ${line}` } } },
    MuiMenuItem: { styleOverrides: { root: { fontFamily: JOST, fontSize: 14 } } },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 0, fontFamily: JOST, fontSize: 12, backgroundColor: FDM.panel },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 0, fontFamily: JOST } } },

    // Tablas: cabecera en versalitas, filas separadas por filete.
    MuiTableHead: {
      styleOverrides: { root: { "& .MuiTableCell-head": { ...eyebrow, fontSize: 9.5, color: dim } } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${line}`, fontFamily: JOST, fontSize: 14 },
      },
    },

    // DataGrid es el corazón del panel: sin bordes redondos ni rayado cebra.
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${line}`,
          borderRadius: 0,
          fontFamily: JOST,
          backgroundColor: "transparent",
          "--DataGrid-rowBorderColor": line,
        },
        columnHeaders: { borderBottom: `1px solid ${line}` },
        columnHeaderTitle: { ...eyebrow, fontSize: 9.5, color: dim },
        cell: { borderBottom: `1px solid ${line}`, fontSize: 14 },
        footerContainer: { borderTop: `1px solid ${line}` },
        row: { "&:hover": { backgroundColor: `color-mix(in srgb, ${FDM.green} 7%, transparent)` } },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        track: { borderRadius: 999 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 0, height: 2, backgroundColor: line } },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: line } } },
    MuiAvatar: { styleOverrides: { root: { fontFamily: JOST, fontWeight: 500 } } },
  };
}

/* ── CLARO ─────────────────────────────────────────────────────────── */
const lineLight = "rgba(11,11,10,0.14)";
const dimLight = "rgba(11,11,10,0.55)";

export const lightTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    primary: { main: FDM.green, dark: FDM.greenDeep, contrastText: FDM.ink },
    secondary: { main: FDM.ink, contrastText: FDM.paper },
    background: { default: FDM.paper, paper: FDM.paper },
    text: { primary: FDM.ink, secondary: dimLight },
    error: { main: FDM.terracotta },
    warning: { main: FDM.amber },
    success: { main: FDM.green },
    info: { main: FDM.greenDeep },
    divider: lineLight,
  },
  components: components(lineLight, dimLight, FDM.paper, FDM.ink) as any,
});

/* ── OSCURO ────────────────────────────────────────────────────────── */
const lineDark = "rgba(240,239,234,0.16)";
const dimDark = "rgba(240,239,234,0.58)";

export const darkTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    primary: { main: FDM.green, dark: FDM.greenDeep, contrastText: FDM.ink },
    secondary: { main: FDM.onDark, contrastText: FDM.ink },
    background: { default: FDM.paperDark, paper: FDM.surfaceDark },
    text: { primary: FDM.inkDark, secondary: dimDark },
    error: { main: FDM.terracotta },
    warning: { main: FDM.amber },
    success: { main: FDM.green },
    info: { main: FDM.green },
    divider: lineDark,
  },
  components: components(lineDark, dimDark, FDM.paperDark, FDM.inkDark) as any,
});

/* Paleta para gráficos: derivada de la marca, en orden de contraste
   descendente para que las series se distingan sin depender del color. */
export const CHART_COLORS = [
  FDM.green,
  FDM.greenDeep,
  FDM.amber,
  FDM.terracotta,
  "#6B8F7A",
  "#8C6A3F",
  "#4A5D57",
  "#A8A196",
];
