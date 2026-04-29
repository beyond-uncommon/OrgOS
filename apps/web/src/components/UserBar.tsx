"use client";

import { Box, Typography, Chip } from "@mui/material";
import Link from "next/link";
import { logout } from "@/lib/auth/actions";

const ROLE_LABEL: Record<string, string> = {
  INSTRUCTOR:                   "Instructor",
  HUB_LEAD:                     "Hub Lead",
  BOOTCAMP_MANAGER:             "Bootcamp Manager",
  PROGRAM_MANAGER:              "Program Manager",
  COUNTRY_DIRECTOR:             "Country Director",
  HEAD_OF_DESIGN:               "Head of Design",
  HEAD_OF_DEVELOPMENT:          "Head of Development",
  YOUTH_CODING_MANAGER:         "Youth Coding Manager",
  TEACHER_TRAINING_COORDINATOR: "Teacher Training",
  CAREER_DEVELOPMENT_OFFICER:   "Career Dev Officer",
  REGIONAL_HUB_LEAD:            "Regional Hub Lead",
  SAFEGUARDING:                 "Safeguarding",
  M_AND_E:                      "M&E",
  MARKETING_COMMS_MANAGER:      "Marketing & Comms",
  BUSINESS_DEVELOPMENT_MANAGER: "Business Dev Manager",
  BUSINESS_DEVELOPMENT_ASSOCIATE: "Business Dev",
  HR_OFFICER:                   "HR Officer",
  FINANCE_ADMIN_OFFICER:        "Finance & Admin",
  HEAD_OF_OPERATIONS:           "Head of Operations",
  ADMIN:                        "Admin",
};

interface Props {
  name: string;
  role: string;
}

export function UserBar({ name, role }: Props) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Chip
        label={ROLE_LABEL[role] ?? role}
        size="small"
        sx={{
          fontSize: "0.625rem",
          fontWeight: 600,
          bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.08)",
          color: "primary.main",
          border: "1px solid",
          borderColor: "rgb(var(--mui-palette-primary-mainChannel) / 0.2)",
        }}
      />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {name}
      </Typography>
      <Box
        component="button"
        onClick={() => logout()}
        sx={{
          background: "none",
          border: "none",
          cursor: "pointer",
          p: 0,
          color: "text.secondary",
          fontSize: "0.75rem",
          fontFamily: "inherit",
          "&:hover": { color: "primary.main" },
          transition: "color 0.15s",
        }}
      >
        Sign out
      </Box>
    </Box>
  );
}
