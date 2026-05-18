import * as React from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";

export type TimelinePeriod = "daily" | "weekly" | "monthly";

export interface TimelineSwitcherProps {
  value: TimelinePeriod;
  onChange: (value: TimelinePeriod) => void;
  available?: TimelinePeriod[];
}

const OPTIONS: { value: TimelinePeriod; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function TimelineSwitcher({
  value,
  onChange,
  available,
}: TimelineSwitcherProps) {
  const handleChange = (_: React.MouseEvent<HTMLElement>, newValue: TimelinePeriod | null) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  const shownOptions = available
    ? OPTIONS.filter((o) => available.includes(o.value))
    : OPTIONS;

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      size="small"
    >
      {shownOptions.map((opt) => (
        <ToggleButton
          key={opt.value}
          value={opt.value}
          disabled={available !== undefined && !available.includes(opt.value)}
          sx={{ textTransform: "none" }}
        >
          {opt.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
