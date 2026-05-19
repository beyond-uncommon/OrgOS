export const printStyles = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  color: #111827;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

@media print {
  @page {
    size: A4;
    margin: 15mm;
  }

  body {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .page-break {
    page-break-before: always;
  }

  .no-print {
    display: none !important;
  }
}

.report-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
}

.report-header {
  text-align: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 3px solid #0747A1;
}

.report-logo {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.report-logo span {
  color: #0747A1;
}

.report-org-name {
  font-size: 14px;
  color: #6B7280;
}

.report-title {
  font-size: 24px;
  margin: 20px 0 8px;
}

.report-generated-date {
  font-size: 12px;
  color: #9CA3AF;
}

.report-section {
  margin-bottom: 32px;
  page-break-inside: avoid;
}

.report-section-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid #0747A1;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
}

.summary-table td {
  padding: 10px 8px;
  border: 1px solid #E5E7EB;
}

.summary-table td:first-child {
  font-size: 13px;
  color: #6B7280;
}

.summary-table td:last-child {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.program-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 32px;
}

.program-table th {
  padding: 8px;
  border: 1px solid #E5E7EB;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  background: #F8F9FC;
}

.program-table th:not(:first-child) {
  text-align: center;
}

.program-table th:last-child {
  text-align: right;
}

.program-table td {
  padding: 8px;
  border: 1px solid #E5E7EB;
  font-size: 13px;
}

.program-table td:first-child {
  font-weight: 500;
}

.program-table td:not(:first-child) {
  text-align: center;
}

.program-table td:last-child {
  text-align: right;
}

.stories-section {
  margin-top: 32px;
}

.story-card {
  padding: 16px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  margin-bottom: 16px;
  page-break-inside: avoid;
}

.story-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #0747A1;
}

.story-content {
  font-size: 13px;
  color: #4B5563;
}

.report-footer {
  margin-top: 40px;
  padding-top: 16px;
  border-top: 1px solid #E5E7EB;
  text-align: center;
  font-size: 11px;
  color: #9CA3AF;
}
`;