"use client";

import { useState } from "react";
import {
  Box, Container, Typography, Button, Chip, Switch, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  FormControlLabel,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { createOrUpdatePolicy, togglePolicyActive } from "./actions";

interface PolicyRow {
  id: string;
  departmentId: string | null;
  automationLevel: string;
  maxAutoRiskThreshold: number;
  allowedAutoActions: string[];
  forbiddenActions: string[];
  active: boolean;
  effectiveFrom: Date;
  departmentName: string | null;
}

interface Props {
  policies: PolicyRow[];
  departments: { id: string; name: string }[];
  userName: string;
  userRole: string;
}

function PolicyForm({
  initial,
  departments,
  onSave,
  onCancel,
}: {
  initial?: PolicyRow;
  departments: { id: string; name: string }[];
  onSave: (data: Record<string, unknown>, existingId?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [deptId, setDeptId] = useState(initial?.departmentId ?? "");
  const [level, setLevel] = useState(initial?.automationLevel ?? "LIMITED");
  const [threshold, setThreshold] = useState(initial?.maxAutoRiskThreshold ?? 0.6);
  const [allowed, setAllowed] = useState(initial?.allowedAutoActions.join(", ") ?? "");
  const [forbidden, setForbidden] = useState(initial?.forbiddenActions.join(", ") ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const [effective, setEffective] = useState(
    initial?.effectiveFrom ? new Date(initial.effectiveFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      departmentId: deptId || undefined,
      automationLevel: level,
      maxAutoRiskThreshold: threshold,
      allowedAutoActions: allowed.split(",").map((s) => s.trim()).filter(Boolean),
      forbiddenActions: forbidden.split(",").map((s) => s.trim()).filter(Boolean),
      active,
      effectiveFrom: effective,
      setByUserId: "",
    }, initial?.id);
    setSaving(false);
  };

  return (
    <>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Department" value={deptId} onChange={(e) => setDeptId(e.target.value)} fullWidth select>
            <MenuItem value="">— Org-wide policy —</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="Automation Level" value={level} onChange={(e) => setLevel(e.target.value)} fullWidth select>
            <MenuItem value="FULL">FULL — Auto-execute all actions</MenuItem>
            <MenuItem value="LIMITED">LIMITED — Only allowed actions auto-execute</MenuItem>
            <MenuItem value="LOCKED">LOCKED — All actions require human approval</MenuItem>
          </TextField>
          <TextField label="Auto Risk Threshold" type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} inputProps={{ min: 0, max: 1, step: 0.05 }} fullWidth />
          <TextField label="Allowed Auto Actions (comma-separated)" value={allowed} onChange={(e) => setAllowed(e.target.value)} fullWidth helperText="Action types that can auto-execute under LIMITED mode" />
          <TextField label="Forbidden Actions (comma-separated)" value={forbidden} onChange={(e) => setForbidden(e.target.value)} fullWidth helperText="Action types that are always blocked" />
          <TextField label="Effective From" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label="Active" />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? "Saving..." : initial ? "Update" : "Create"}
        </Button>
      </DialogActions>
    </>
  );
}

export function GovernanceClient({ policies, departments, userName, userRole }: Props) {
  const [editing, setEditing] = useState<PolicyRow | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleToggleActive = async (id: string, current: boolean) => {
    await togglePolicyActive(id, !current);
  };

  const handleSave = async (data: Record<string, unknown>, existingId?: string) => {
    await createOrUpdatePolicy(data, existingId);
    setDialogOpen(false);
    setEditing(undefined);
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", position: "sticky", top: 0, zIndex: 10 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 2 }}>
            <Typography variant="h6" sx={{ letterSpacing: "-0.01em" }}>
              Org<Box component="span" sx={{ color: "primary.main" }}>OS</Box>
              <Typography variant="caption" sx={{ ml: 2, color: "text.secondary" }}>Governance Policies</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>{userName} ({userRole})</Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>Board Policies</Typography>
          <Button variant="contained" onClick={() => { setEditing(undefined); setDialogOpen(true); }}>
            Add Policy
          </Button>
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Scope</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Risk Threshold</TableCell>
                <TableCell>Allowed Actions</TableCell>
                <TableCell>Forbidden</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Effective</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No policies configured. The system will use safe defaults (LIMITED, 0.6 threshold).
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.departmentName ?? "Org-wide"}</TableCell>
                    <TableCell>
                      <Chip label={p.automationLevel} size="small" color={p.automationLevel === "FULL" ? "success" : p.automationLevel === "LIMITED" ? "warning" : "error"} />
                    </TableCell>
                    <TableCell>{p.maxAutoRiskThreshold}</TableCell>
                    <TableCell sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.allowedAutoActions.length > 0 ? p.allowedAutoActions.join(", ") : "—"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.forbiddenActions.length > 0 ? p.forbiddenActions.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <Switch size="small" checked={p.active} onChange={() => handleToggleActive(p.id, p.active)} />
                    </TableCell>
                    <TableCell>{new Date(p.effectiveFrom).toISOString().slice(0, 10)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => { setEditing(p); setDialogOpen(true); }}>
                        <EditIcon fontSize="small" />
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
        <DialogTitle>{editing ? "Edit Policy" : "Create Policy"}</DialogTitle>
        {editing ? (
          <PolicyForm key="edit-policy" initial={editing} departments={departments} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(undefined); }} />
        ) : (
          <PolicyForm key="create-policy" departments={departments} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(undefined); }} />
        )}
      </Dialog>
    </Box>
  );
}
