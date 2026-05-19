"use client";

import { useState } from "react";
import {
  Box, Container, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { createFundingRecord, updateFundingRecord, deleteFundingRecord } from "./actions";

interface FundingRecordRow {
  id: string;
  amount: number;
  source: string;
  description: string | null;
  receivedAt: string;
  program: { id: string; name: string } | null;
  createdAt: Date;
}

interface Props {
  records: FundingRecordRow[];
  programs: { id: string; name: string }[];
  totalFunding: number;
  userName: string;
  userRole: string;
}

function FundingForm({
  initial: initialProp,
  programs,
  onSave,
  onCancel,
}: {
  initial?: FundingRecordRow;
  programs: { id: string; name: string }[];
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(initialProp?.amount ?? 0);
  const [source, setSource] = useState(initialProp?.source ?? "");
  const [description, setDescription] = useState(initialProp?.description ?? "");
  const [receivedAt, setReceivedAt] = useState(initialProp?.receivedAt ?? new Date().toISOString().slice(0, 10));
  const [programId, setProgramId] = useState(initialProp?.program?.id ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ amount, source, description, receivedAt, programId: programId || undefined });
    setSaving(false);
  };

  return (
    <>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Source" value={source} onChange={(e) => setSource(e.target.value)} fullWidth required />
          <TextField label="Amount" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} fullWidth required />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline rows={2} />
          <TextField label="Date Received" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
          <TextField label="Program" value={programId} onChange={(e) => setProgramId(e.target.value)} fullWidth select>
            <MenuItem value="">— Unassigned —</MenuItem>
            {programs.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
            ))}
          </TextField>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !source || !amount}>
          {saving ? "Saving..." : initialProp ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </>
  );
}

export function FundingClient({ records, programs, totalFunding, userName, userRole }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FundingRecordRow | undefined>(undefined);

  const handleSave = async (data: Record<string, unknown>) => {
    if (editing) {
      await updateFundingRecord(editing.id, data);
    } else {
      await createFundingRecord(data);
    }
    setDialogOpen(false);
    setEditing(undefined);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this funding record?")) {
      await deleteFundingRecord(id);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              <Typography variant="caption" sx={{ ml: 2, color: "text.secondary" }}>Funding Management</Typography>
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Chip label={`Total: $${totalFunding.toLocaleString()}`} color="primary" variant="outlined" />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{userName} ({userRole})</Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Funding Records</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
            Add Record
          </Button>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Source</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No funding records yet. Click "Add Record" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{r.source}</TableCell>
                    <TableCell align="right">${r.amount.toLocaleString()}</TableCell>
                    <TableCell>{r.program?.name ?? "—"}</TableCell>
                    <TableCell>{r.receivedAt}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.description ?? "—"}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setEditing(r); setDialogOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(r.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit Funding Record" : "Add Funding Record"}</DialogTitle>
        {editing ? (
          <FundingForm key="edit" initial={editing} programs={programs} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(undefined); }} />
        ) : (
          <FundingForm key="create" programs={programs} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(undefined); }} />
        )}
      </Dialog>
    </Box>
  );
}
