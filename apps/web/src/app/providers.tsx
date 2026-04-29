"use client";

import * as React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { theme } from "../lib/theme";

/**
 * OrgOS Providers
 * - Injects Material UI theme
 * - Applies CssBaseline (global reset)
 * - Ensures consistent design system across app
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
