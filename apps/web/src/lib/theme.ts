import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: true,

  palette: {
    mode: "light",

    primary: {
      main: "#0747A1",   /* 8.8:1 on white — passes AAA */
      light: "#2684FF",
      dark: "#0039A6",
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: "#344563",   /* blue-slate — 9.4:1 on white */
      light: "#506892",
      dark: "#1B2B4B",
      contrastText: "#FFFFFF",
    },

    error: {
      main: "#DC2626",   /* red-600 — 4.9:1 on white */
      light: "#F87171",
      dark: "#9F1239",
      contrastText: "#FFFFFF",
    },

    warning: {
      main: "#C2410C",   /* orange-700 — 5.2:1 on white */
      light: "#EA580C",
      dark: "#9A3412",
      contrastText: "#FFFFFF",
    },

    success: {
      main: "#047857",   /* emerald-700 — 5.5:1 on white */
      light: "#059669",
      dark: "#064E3B",
      contrastText: "#FFFFFF",
    },

    info: {
      main: "#2563EB",   /* blue-600 — 5.2:1 on white */
      light: "#60A5FA",
      dark: "#1D4ED8",
      contrastText: "#FFFFFF",
    },

    background: {
      default: "#F8F9FC",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#111827",
      secondary: "#6B7280",
    },

    divider: "#E5E7EB",
  },

  typography: {
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",

    h1: { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" },
    h2: { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" },
    h3: { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.02em" },
    h4: { fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" },
    h5: { fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontWeight: 600 },
    h6: { fontFamily: "'IBM Plex Sans', system-ui, sans-serif", fontWeight: 600 },

    subtitle1: {
      fontWeight: 500,
      letterSpacing: "0.08em",
      fontSize: "0.6875rem",
      textTransform: "uppercase" as const,
    },

    body1: { lineHeight: 1.65 },
    body2: { lineHeight: 1.6 },

    overline: { letterSpacing: "0.12em", fontSize: "0.6875rem", fontWeight: 600 },
  },

  shape: {
    borderRadius: 8,
  },

  spacing: 8,

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F8F9FC",
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(7,71,161,0.04) 0%, transparent 60%)",
          minHeight: "100vh",
        },
        "::selection": {
          background: "rgba(7,71,161,0.15)",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none" as const,
          borderRadius: 8,
          fontWeight: 500,
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          letterSpacing: "0.01em",
        },
        containedPrimary: {
          background: "#0747A1",
          color: "#FFFFFF",
          "&:hover": {
            background: "#0039A6",
            boxShadow: "0 0 20px rgba(7,71,161,0.25)",
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: "0.625rem",
          letterSpacing: "0.06em",
          borderRadius: 4,
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#FFFFFF",
            "& fieldset": {
              borderColor: "#E5E7EB",
            },
            "&:hover fieldset": {
              borderColor: "#D1D5DB",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#0747A1",
            },
          },
          "& .MuiInputLabel-root.Mui-focused": {
            color: "#0747A1",
          },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#E5E7EB",
        },
      },
    },
  },
});
