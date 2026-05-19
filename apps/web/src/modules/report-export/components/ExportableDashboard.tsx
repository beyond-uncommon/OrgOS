'use client';

import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { exportToCSV } from '@/lib/export';
import { exportToPDF } from '@/lib/export';

interface Column {
  key: string;
  label: string;
}

interface ExportConfig {
  data: Record<string, unknown>[];
  columns: Column[];
}

interface ExportableDashboardProps {
  title: string;
  children: React.ReactNode;
  exportConfig: ExportConfig;
}

export function ExportableDashboard({ title, children, exportConfig }: ExportableDashboardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showPrintContent, setShowPrintContent] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExportCSV = () => {
    exportToCSV(exportConfig.data, title, exportConfig.columns);
    handleClose();
  };

  const handleExportPDF = () => {
    setShowPrintContent(true);
    setTimeout(() => {
      window.print();
      setShowPrintContent(false);
    }, 100);
    handleClose();
  };

  if (showPrintContent) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, color: '#1a1a1a' }}>
          {title}
        </Typography>
        {children}
      </Box>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Print">
              <IconButton onClick={handleExportPDF} size="small">
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export">
              <IconButton onClick={handleClick} size="small">
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        {children}
      </CardContent>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleExportCSV}>Export CSV</MenuItem>
        <MenuItem onClick={handleExportPDF}>Export PDF</MenuItem>
      </Menu>
    </Card>
  );
}