import * as React from "react";
import Grid from "@mui/material/Grid2";

export interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  spacing?: number;
}

function sizeForColumns(columns: number, breakpoint: "xs" | "sm" | "md"): number {
  if (breakpoint === "xs") return 12;
  if (breakpoint === "sm") return columns >= 3 ? 6 : 12 / columns;
  return 12 / Math.min(columns, 4);
}

export function DashboardGrid({
  children,
  columns = 3,
  spacing = 3,
}: DashboardGridProps) {
  return (
    <Grid container spacing={spacing}>
      {React.Children.map(children, (child) => (
        <Grid
          size={{
            xs: sizeForColumns(columns, "xs"),
            sm: sizeForColumns(columns, "sm"),
            md: sizeForColumns(columns, "md"),
          }}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
}
