"use client";

import * as React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Alert,
  CircularProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { createStory, updateStory, deleteStory, publishStory, toggleFeatured } from "./actions";

type StoryAdminRow = {
  id: string;
  title: string;
  authorName: string;
  authorRole?: string | null;
  published: boolean;
  featured: boolean;
  createdAt: Date;
  department?: { name: string } | null;
};

type StoryFormData = {
  title: string;
  excerpt: string;
  body: string;
  authorName: string;
  authorRole: string;
  studentAge: string;
  studentProgram: string;
  heroImage: string;
  tags: string;
  published: boolean;
  featured: boolean;
  departmentId: string;
};

const EMPTY_FORM: StoryFormData = {
  title: "",
  excerpt: "",
  body: "",
  authorName: "",
  authorRole: "",
  studentAge: "",
  studentProgram: "",
  heroImage: "",
  tags: "",
  published: false,
  featured: false,
  departmentId: "",
};

type AdminStoryManagerProps = {
  stories: StoryAdminRow[];
  userRole: "ADMIN" | "HUB_LEAD";
  departmentId?: string;
};

export function AdminStoryManager({ stories, userRole }: AdminStoryManagerProps) {
  const [rows, setRows] = React.useState(stories);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<StoryFormData>(EMPTY_FORM);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (story: StoryAdminRow) => {
    const found = rows.find((r) => r.id === story.id);
    if (!found) return;
    setForm({
      title: found.title,
      excerpt: "",
      body: "",
      authorName: found.authorName,
      authorRole: found.authorRole ?? "",
      studentAge: "",
      studentProgram: "",
      heroImage: "",
      tags: "",
      published: found.published,
      featured: found.featured,
      departmentId: "",
    });
    setEditId(found.id);
    setError(null);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleChange = (field: keyof StoryFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = { ...form, departmentId: form.departmentId || undefined };
      if (editId) {
        await updateStory(editId, payload);
        setRows((prev) =>
          prev.map((r) =>
            r.id === editId ? { ...r, title: form.title, published: form.published, featured: form.featured } : r
          )
        );
      } else {
        const created = await createStory(payload);
        setRows((prev) => [
          {
            id: created.id,
            title: created.title,
            authorName: created.authorName,
            authorRole: created.authorRole,
            published: created.published,
            featured: created.featured,
            createdAt: created.createdAt,
            department: null,
          },
          ...prev,
        ]);
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    try {
      await deleteStory(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleTogglePublished = async (id: string, current: boolean) => {
    try {
      await publishStory(id, !current);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, published: !current } : r)));
    } catch {}
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    try {
      await toggleFeatured(id, !current);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, featured: !current } : r)));
    } catch {}
  };

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Paper sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Story Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate} size="small">
          New Story
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Author</TableCell>
              <TableCell>Published</TableCell>
              <TableCell>Featured</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 240 }} noWrap>
                    {row.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {row.authorName}
                    {row.authorRole && ` · ${row.authorRole}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={row.published}
                    size="small"
                    onChange={() => handleTogglePublished(row.id, row.published)}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={row.featured}
                    size="small"
                    onChange={() => handleToggleFeatured(row.id, row.featured)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{formatDate(row.createdAt)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => handleOpenEdit(row)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { border: "1px solid", borderColor: "divider", borderRadius: 2 } }}
      >
        <DialogTitle>{editId ? "Edit Story" : "New Story"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={form.title}
              onChange={handleChange("title")}
              fullWidth
              required
            />
            <TextField
              label="Excerpt"
              value={form.excerpt}
              onChange={handleChange("excerpt")}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Body"
              value={form.body}
              onChange={handleChange("body")}
              fullWidth
              multiline
              rows={6}
              required
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Author Name"
                value={form.authorName}
                onChange={handleChange("authorName")}
                fullWidth
                required
              />
              <TextField
                label="Author Role"
                value={form.authorRole}
                onChange={handleChange("authorRole")}
                fullWidth
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Student Age"
                value={form.studentAge}
                onChange={handleChange("studentAge")}
                fullWidth
              />
              <TextField
                label="Student Program"
                value={form.studentProgram}
                onChange={handleChange("studentProgram")}
                fullWidth
              />
            </Stack>
            <TextField
              label="Hero Image URL"
              value={form.heroImage}
              onChange={handleChange("heroImage")}
              fullWidth
            />
            <TextField
              label="Tags (comma-separated)"
              value={form.tags}
              onChange={handleChange("tags")}
              fullWidth
              helperText="e.g., youth, coding, success"
            />
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Switch checked={form.published} onChange={handleChange("published")} />}
                label="Published"
              />
              <FormControlLabel
                control={<Switch checked={form.featured} onChange={handleChange("featured")} />}
                label="Featured"
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !form.title || !form.body || !form.authorName}
          >
            {loading ? <CircularProgress size={20} /> : editId ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}