'use client';

import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { exportToCSV } from '@/lib/export';
import { exportToPDF } from '@/lib/export';

interface Column {
  key: string;
  label: string;
}

interface ReportExporterProps {
  children: React.ReactNode;
  title: string;
  data: Record<string, unknown>[];
  columns: Column[];
}

export function ReportExporter({ children, title, data, columns }: ReportExporterProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExportCSV = () => {
    exportToCSV(data, title, columns);
    handleClose();
  };

  const handleExportPDF = () => {
    exportToPDF({ title, content: children });
    handleClose();
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 10,
        }}
      >
        <Tooltip title="Export Report">
          <IconButton onClick={handleClick} size="small">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>
      {children}
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
    </Box>
  );
}