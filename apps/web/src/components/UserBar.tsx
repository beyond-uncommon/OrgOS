"use client";

import * as React from "react";
import { Box, Typography, Chip, Button, Menu, MenuItem, Divider } from "@mui/material";
import Link from "next/link";
import { logout, switchUser } from "@/lib/auth/actions";

const ROLE_LABEL: Record<string, string> = {
  STUDENT:                      "Youth Coding Coordinator",
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

const DEMO_ACCOUNTS = [
  { role: "INSTRUCTOR",                   email: "alex.rivera@uncommon.org" },
  { role: "YC INSTRUCTOR",               email: "instructor.yc1@uncommon.org" },
  { role: "YC COORDINATOR",              email: "yc.student1@uncommon.org" },
  { role: "HUB_LEAD",                   email: "hublead@uncommon.org" },
  { role: "HUB_LEAD 2",                 email: "hublead2@uncommon.org" },
  { role: "HUB_LEAD 3",                 email: "hublead3@uncommon.org" },
  { role: "BOOTCAMP_MANAGER",           email: "bootcamp@uncommon.org" },
  { role: "YC MANAGER",                 email: "ycmanager@uncommon.org" },
  { role: "PROGRAM_MANAGER",            email: "program@uncommon.org" },
  { role: "TEACHER_TRAINING",           email: "pm.tt@uncommon.org" },
  { role: "COUNTRY_DIRECTOR",           email: "director@uncommon.org" },
  { role: "ADMIN",                     email: "admin@uncommon.org" },
];

const ROLE_COLORS: Record<string, string> = {
  INSTRUCTOR:                   "primary",
  STUDENT:                      "success",
  HUB_LEAD:                     "info",
  BOOTCAMP_MANAGER:             "warning",
  PROGRAM_MANAGER:              "secondary",
  COUNTRY_DIRECTOR:             "primary",
  HEAD_OF_DESIGN:              "#7C3AED",
  HEAD_OF_DEVELOPMENT:          "#059669",
  YOUTH_CODING_MANAGER:         "success",
  TEACHER_TRAINING_COORDINATOR: "info",
  CAREER_DEVELOPMENT_OFFICER:   "secondary",
  REGIONAL_HUB_LEAD:           "info",
  SAFEGUARDING:                 "error",
  M_AND_E:                     "info",
  MARKETING_COMMS_MANAGER:     "warning",
  BUSINESS_DEVELOPMENT_MANAGER: "success",
  BUSINESS_DEVELOPMENT_ASSOCIATE: "success",
  HR_OFFICER:                  "info",
  FINANCE_ADMIN_OFFICER:        "warning",
  HEAD_OF_OPERATIONS:          "primary",
  ADMIN:                        "primary",
};

interface Props {
  name: string;
  role: string;
  showSubmit?: boolean;
}

export function UserBar({ name, role, showSubmit = true }: Props) {
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  async function handleSwitch(email: string) {
    setAnchor(null);
    await switchUser(email);
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {showSubmit && (
        <Button
          component={Link}
          href="/submit"
          size="small"
          variant="contained"
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "none",
            borderRadius: 1.5,
            px: 2,
            py: 0.6,
          }}
        >
          Submit
        </Button>
      )}
      <Chip
        label={ROLE_LABEL[role] ?? role}
        size="small"
        sx={{
          fontSize: "0.625rem",
          fontWeight: 600,
          bgcolor: "rgb(var(--mui-palette-primary-mainChannel) / 0.08)",
          color: ROLE_COLORS[role] ?? "primary.main",
          border: "1px solid",
          borderColor: "rgb(var(--mui-palette-primary-mainChannel) / 0.2)",
        }}
      />
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", cursor: "pointer" }}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {name} ▾
      </Typography>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{
          sx: { minWidth: 280, maxWidth: 320, borderRadius: 2, border: "1px solid", borderColor: "divider", mt: 1 },
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: "0.08em" }}>
            SWITCH ACCOUNT
          </Typography>
        </Box>
        {DEMO_ACCOUNTS.map((account) => {
          const isCurrent = account.email.includes(role.toLowerCase().replace("_", ".")) || false;
          return (
            <MenuItem
              key={account.email}
              onClick={() => handleSwitch(account.email)}
              sx={{
                py: 1.5,
                px: 2,
                fontSize: "0.8rem",
                borderLeft: isCurrent ? "3px solid" : "3px solid transparent",
                borderColor: isCurrent ? "primary.main" : "transparent",
                bgcolor: isCurrent ? "rgb(var(--mui-palette-primary-mainChannel) / 0.05)" : "transparent",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: "block" }}>
                  {account.role}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.disabled", fontFamily: "monospace", fontSize: "0.7rem" }}>
                  {account.email}
                </Typography>
              </Box>
              {isCurrent && (
                <Chip label="Current" size="small" color="primary" sx={{ fontSize: "0.5rem", height: 16 }} />
              )}
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem
          onClick={() => { setAnchor(null); logout(); }}
          sx={{ py: 1.5, px: 2, fontSize: "0.8rem", color: "error.main" }}
        >
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}