"use client";

import * as React from "react";
import { Box, Tab, Tabs } from "@mui/material";

interface Props {
  tabs: { label: string; content: React.ReactNode }[];
}

export function InstructorTabs({ tabs }: Props) {
  const [active, setActive] = React.useState(0);

  return (
    <Box>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mb: 3 }}>
        <Tabs
          value={active}
          onChange={(_, v) => setActive(v)}
          sx={{
            "& .MuiTab-root": {
              textTransform: "uppercase",
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              fontWeight: 600,
              minHeight: 44,
              color: "text.secondary",
              "&.Mui-selected": { color: "primary.main" },
            },
            "& .MuiTabs-indicator": { bgcolor: "primary.main" },
          }}
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} />
          ))}
        </Tabs>
      </Box>
      {tabs[active]?.content}
    </Box>
  );
}
