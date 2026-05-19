"use client";

import * as React from "react";
import { Box, Button, Typography, Divider } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function ReportSection({ title, children }: SectionProps) {
  return (
    <Box sx={{ mb: 4, pageBreakInside: "avoid" }}>
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          mb: 1,
          pb: 0.5,
          borderBottom: "2px solid #0747A1",
          display: "inline-block",
        }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

interface ReportRowProps {
  label: string;
  value: string | number;
}

function ReportRow({ label, value }: ReportRowProps) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        py: 0.75,
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

interface ProgramData {
  name: string;
  students: number;
  funding: number;
}

interface StoryData {
  id: string;
  title: string;
  content: string;
  date?: string;
}

interface OverviewData {
  totalStudents: number;
  totalPrograms: number;
  totalHubs: number;
  totalFunding: number;
}

interface Props {
  reportType?: "annual" | "monthly" | "weekly";
  title: string;
  overview: OverviewData;
  programs: ProgramData[];
  stories?: StoryData[];
  generatedAt?: Date;
  orgName?: string;
}

export function PDFReportGenerator({
  reportType = "annual",
  title,
  overview,
  programs,
  stories = [],
  generatedAt = new Date(),
  orgName = "Uncommon.org",
}: Props) {
  const [previewOpen, setPreviewOpen] = React.useState(false);

  function handleDownload() {
    const content = renderReportHTML();
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>${getPrintStyles()}</style>
</head>
<body>${content}</body>
</html>`);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => printWindow.close(), 500);
    };
  }

  function renderReportHTML(): string {
    const programRows = programs
      .map(
        (p) => `
      <tr>
        <td style="padding:8px;border:1px solid #E5E7EB;font-weight:500">${p.name}</td>
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:center">${p.students.toLocaleString()}</td>
        <td style="padding:8px;border:1px solid #E5E7EB;text-align:right">$${p.funding.toLocaleString()}</td>
      </tr>`
      )
      .join("");

    const storyRows = stories
      .map(
        (s) => `
        <div style="padding:16px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:16px;page-break-inside:avoid;">
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;color:#0747A1;">${s.title}</div>
          <div style="font-size:13px;color:#4B5563;">${s.content}</div>
        </div>`
      )
      .join("");

    return `
      <div style="padding:40px;font-family:'IBM Plex Sans',Arial,sans-serif;max-width:800px;margin:0 auto;color:#111827;">
        <div style="text-align:center;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #0747A1;">
          <div style="font-size:28px;font-weight:700;margin-bottom:4px;">Org<span style="color:#0747A1">OS</span></div>
          <div style="font-size:14px;color:#6B7280;">${orgName}</div>
          <h1 style="font-size:24px;margin:20px 0 8px;">${title}</h1>
          <div style="font-size:12px;color:#9CA3AF;">Generated ${generatedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
        </div>

        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #0747A1;">Executive Summary</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
          <tr><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Total Students</td><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:18px;font-weight:700;text-align:center">${overview.totalStudents.toLocaleString()}</td></tr>
          <tr><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Active Programs</td><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:18px;font-weight:700;text-align:center">${overview.totalPrograms}</td></tr>
          <tr><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Active Hubs</td><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:18px;font-weight:700;text-align:center">${overview.totalHubs}</td></tr>
          <tr><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:13px;color:#6B7280;">Total Funding</td><td style="padding:10px 8px;border:1px solid #E5E7EB;font-size:18px;font-weight:700;text-align:center">$${overview.totalFunding.toLocaleString()}</td></tr>
        </table>

        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #0747A1;">Program Performance</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
          <thead><tr style="background:#F8F9FC;"><th style="padding:8px;border:1px solid #E5E7EB;text-align:left;font-size:12px;font-weight:600;">Program</th><th style="padding:8px;border:1px solid #E5E7EB;font-size:12px;font-weight:600;">Students</th><th style="padding:8px;border:1px solid #E5E7EB;font-size:12px;font-weight:600;">Funding</th></tr></thead>
          <tbody>${programRows}</tbody>
        </table>

        ${
          stories.length > 0
            ? `
        <h2 style="font-size:16px;font-weight:700;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #0747A1;">Impact Stories</h2>
        <div style="margin-bottom:32px;">${storyRows}</div>
        `
            : ""
        }

        <div style="margin-top:40px;padding-top:16px;border-top:1px solid #E5E7EB;text-align:center;font-size:11px;color:#9CA3AF;">
          Powered by OrgOS · ${orgName} · ${new Date().toLocaleDateString()}
        </div>
      </div>`;
  }

  function getPrintStyles(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #111827; }
      h1, h2 { font-family: 'IBM Plex Sans', Arial, sans-serif; }
      @media print {
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        @page { size: A4; margin: 15mm; }
        .page-break { page-break-before: always; }
      }
    `;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button
        variant="outlined"
        startIcon={<PictureAsPdfIcon />}
        onClick={handleDownload}
        sx={{ alignSelf: "flex-start", textTransform: "none" }}
      >
        Download PDF Report
      </Button>
      {previewOpen && (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 3,
            bgcolor: "grey.50",
            maxHeight: 400,
            overflow: "auto",
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontStyle: "italic" }}
          >
            Report preview (scroll to see full content, then click Download PDF)
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box
            dangerouslySetInnerHTML={{ __html: renderReportHTML() }}
            sx={{ fontSize: "0.75rem" }}
          />
        </Box>
      )}
    </Box>
  );
}