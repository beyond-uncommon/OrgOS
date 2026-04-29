import "@mui/material/styles";
import "@mui/material/Typography";

declare module "@mui/material/styles" {
  interface Theme {
    custom: {
      tertiary: {
        main: string;
        light: string;
        dark: string;
      };
      surface: {
        main: string;
        variant: string;
      };
      outline: {
        main: string;
        light: string;
      };
    };
  }

  interface ThemeOptions {
    custom?: {
      tertiary?: {
        main?: string;
        light?: string;
        dark?: string;
      };
      surface?: {
        main?: string;
        variant?: string;
      };
      outline?: {
        main?: string;
        light?: string;
      };
    };
  }

  interface TypographyVariants {
    displayLarge: React.CSSProperties;
    headlineLarge: React.CSSProperties;
    titleLarge: React.CSSProperties;
    bodyLarge: React.CSSProperties;
    labelLarge: React.CSSProperties;
  }

  interface TypographyVariantsOptions {
    displayLarge?: React.CSSProperties;
    headlineLarge?: React.CSSProperties;
    titleLarge?: React.CSSProperties;
    bodyLarge?: React.CSSProperties;
    labelLarge?: React.CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    displayLarge: true;
    headlineLarge: true;
    titleLarge: true;
    bodyLarge: true;
    labelLarge: true;
  }
}
