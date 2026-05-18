import * as React from "react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";

export interface DataTableProps<T> {
  rows: T[];
  columns: GridColDef[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  loading = false,
  onRowClick,
  pageSize = 25,
}: DataTableProps<T>) {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      loading={loading}
      {...(onRowClick ? { onRowClick: (params) => onRowClick(params.row as T) } : {})}
      initialState={{
        pagination: {
          paginationModel: { pageSize },
        },
      }}
      pageSizeOptions={[10, 25, 50]}
      disableRowSelectionOnClick
      sx={{
        border: "none",
        "& .MuiDataGrid-columnHeaders": {
          borderBottom: 2,
          borderColor: "divider",
        },
        "& .MuiDataGrid-columnHeaderTitle": {
          typography: "subtitle2",
          fontWeight: 600,
        },
        "& .MuiDataGrid-cell": {
          typography: "body2",
        },
        "& .MuiDataGrid-row:hover": {
          cursor: onRowClick ? "pointer" : "default",
        },
      }}
    />
  );
}
