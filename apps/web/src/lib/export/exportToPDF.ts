import React from 'react';

interface ExportToPDFProps {
  title: string;
  content: React.ReactNode;
}

export function exportToPDF({ title, content }: ExportToPDFProps): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const contentHtml = extractContent(content);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          @media print {
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
            h1 { font-size: 24px; margin-bottom: 16px; color: #1a1a1a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background: #1976d2; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #e0e0e0; padding: 8px; }
            tr:nth-child(even) { background: #f5f5f5; }
            .metric-card { border: 1px solid #e0e0e0; padding: 16px; margin: 8px 0; border-radius: 8px; }
            .risk-high { color: #d32f2f; font-weight: bold; }
            .risk-medium { color: #f57c00; font-weight: bold; }
            .risk-low { color: #388e3c; }
            .no-print { display: none; }
            @page { margin: 20px; }
          }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 16px; color: #1a1a1a; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        ${contentHtml}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extractContent(content: React.ReactNode): string {
  if (typeof content === 'string') return escapeHtml(content);
  if (typeof content === 'number') return String(content);
  if (content === null || content === undefined) return '';
  return '<div>Use ExportableDashboard for PDF content extraction</div>';
}