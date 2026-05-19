"use client";

import * as React from "react";
import { Button, Tooltip } from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

interface ProgramData {
  name: string;
  students: number;
  funding: number;
}

interface OverviewData {
  totalStudents: number;
  totalPrograms: number;
  totalHubs: number;
  totalFunding: number;
}

interface Props {
  title: string;
  overview: OverviewData;
  programs: ProgramData[];
  generatedAt?: Date;
  orgName?: string;
  tooltipText?: string;
}

export function PDFReportButton({
  title,
  overview,
  programs,
  generatedAt = new Date(),
  orgName = "Uncommon.org",
  tooltipText = "Download PDF Report",
}: Props) {
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
    <Tooltip title={tooltipText}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PictureAsPdfIcon />}
        onClick={handleDownload}
        sx={{ textTransform: "none" }}
      >
        PDF
      </Button>
    </Tooltip>
  );
}