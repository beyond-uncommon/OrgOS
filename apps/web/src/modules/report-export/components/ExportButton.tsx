'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { exportToCSV } from '@/lib/export';
import { exportToPDF } from '@/lib/export';

interface Column {
  key: string;
  label: string;
}

interface ExportButtonProps {
  title: string;
  data: Record<string, unknown>[];
  columns: Column[];
  pdfContent?: React.ReactNode;
}

export function ExportButton({ title, data, columns, pdfContent }: ExportButtonProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    if (pdfContent) {
      exportToPDF({ title, content: pdfContent });
    }
    handleClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outlined"
        size="small"
        startIcon={<DownloadIcon />}
        onClick={handleClick}
        sx={{ textTransform: 'none' }}
      >
        Export
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleExportCSV}>Export CSV</MenuItem>
        <MenuItem onClick={handleExportPDF} disabled={!pdfContent}>
          Export PDF
        </MenuItem>
      </Menu>
    </>
  );
}