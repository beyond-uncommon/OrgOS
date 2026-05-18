import * as React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CircleRoundedIcon from "@mui/icons-material/CircleRounded";

export interface InsightPanelProps {
  narrative: string;
  signals?: string[];
  period: string;
  confidence: number;
  promptVersion: string;
  loading?: boolean;
  defaultExpanded?: boolean;
}

export function InsightPanel({
  narrative,
  signals,
  period,
  confidence,
  promptVersion,
  loading = false,
  defaultExpanded = false,
}: InsightPanelProps) {
  const isLowConfidence = confidence < 0.6;
  const confidencePercent = Math.round(confidence * 100);

  if (loading) {
    return (
      <Accordion disableGutters expanded={false}>
        <AccordionSummary>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
            <Skeleton width={120} height={24} />
            <Skeleton width={80} height={24} sx={{ ml: "auto" }} />
          </Box>
        </AccordionSummary>
      </Accordion>
    );
  }

  return (
    <Accordion
      disableGutters
      defaultExpanded={defaultExpanded}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            width: "100%",
          }}
        >
          <AutoAwesomeRoundedIcon sx={{ fontSize: 18, color: "#7C3AED" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            AI Analysis
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {period}
          </Typography>
          <Box sx={{ ml: "auto" }}>
            <Chip
              label={`${confidencePercent}%`}
              size="small"
              color={isLowConfidence ? "warning" : "default"}
              variant="outlined"
            />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        {isLowConfidence && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Low confidence analysis. Review source data before acting on these insights.
          </Alert>
        )}

        <Typography variant="body2" sx={{ color: "text.primary", whiteSpace: "pre-wrap" }}>
          {narrative}
        </Typography>

        {signals && signals.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Key Signals
            </Typography>
            <List dense disablePadding>
              {signals.map((signal, i) => (
                <ListItem key={i} disableGutters sx={{ py: 0.25 }}>
                  <ListItemIcon sx={{ minWidth: 20 }}>
                    <CircleRoundedIcon sx={{ fontSize: 6, color: "text.secondary" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={signal}
                    primaryTypographyProps={{ variant: "body2", color: "text.secondary" }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Typography
          variant="caption"
          sx={{ color: "text.disabled", display: "block", mt: 2 }}
        >
          Prompt version: {promptVersion}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
