import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, Collapse, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Grid, IconButton, Stack, TextField, Typography
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import api from '../services/api';

const initialForm = { name: '', compartment: 1, initialPillCount: 30, remainingPillCount: 30, lowStockThreshold: 3, instructions: '', imageFile: null };

export default function MedicineManager() {
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Update inventory dialog state
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadMedicines = async () => {
    try {
      const { data } = await api.get('/medicines');
      setMedicines(data.medicines || []);
    } catch {
      setMessage('Unable to load medicines.');
    }
  };

  useEffect(() => { loadMedicines(); }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    // client-side validation
    const nameRe = /^[A-Za-z\s]+$/;
    if (!nameRe.test(form.name)) return setMessage('Medicine name may only contain letters and spaces.');
    if (form.compartment < 1) return setMessage('Compartment must be at least 1.');
    if (form.initialPillCount < 0) return setMessage('Initial pill count cannot be negative.');
    if (form.remainingPillCount < 0) return setMessage('Remaining pill count cannot be negative.');
    try {
      let data;
      if (form.imageFile) {
        const fd = new FormData();
        fd.append('image', form.imageFile);
        fd.append('name', form.name);
        fd.append('compartment', form.compartment);
        fd.append('initialPillCount', form.initialPillCount);
        fd.append('remainingPillCount', form.remainingPillCount);
        fd.append('lowStockThreshold', form.lowStockThreshold);
        fd.append('instructions', form.instructions);
        const res = await api.post('/medicines', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        data = res.data;
      } else {
        const res = await api.post('/medicines', form);
        data = res.data;
      }
      setMedicines((prev) => [data.medicine, ...prev]);
      setMessage('Medicine added successfully.');
      setForm(initialForm);
      setShowForm(false);
      await loadMedicines();
    } catch {
      setMessage('Unable to add medicine.');
    }
  };

  const openEdit = (medicine) => {
    setEditTarget(medicine);
    setEditForm({
      remainingPillCount: medicine.remainingPillCount,
      lowStockThreshold: medicine.lowStockThreshold,
      compartment: medicine.compartment,
      instructions: medicine.instructions || ''
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditForm(null);
  };

  const handleUpdateInventory = async (event) => {
    event.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/medicines/${editTarget._id}`, editForm);
      setMedicines((prev) => prev.map((medicine) => (medicine._id === data.medicine._id ? data.medicine : medicine)));
      setMessage('Inventory updated successfully.');
      closeEdit();
      await loadMedicines();
    } catch {
      setMessage('Unable to update inventory.');
    } finally {
      setSaving(false);
    }
  };

  const adjustEditCount = (delta) => {
    setEditForm((prev) => ({
      ...prev,
      remainingPillCount: Math.max(0, Number(prev.remainingPillCount) + delta)
    }));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/medicines/${deleteTarget._id}`);
      setMedicines((prev) => prev.filter((medicine) => medicine._id !== deleteTarget._id));
      setMessage('Medicine deleted.');
      setDeleteTarget(null);
      await loadMedicines();
    } catch {
      setMessage('Unable to delete medicine.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: showForm ? 2 : 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MedicationRoundedIcon color="secondary" />
            <Typography variant="h6" fontWeight={700}>Medicine inventory</Typography>
            <Chip size="small" label={`${medicines.length} items`} />
          </Stack>
          <Button
            variant={showForm ? 'outlined' : 'contained'}
            color={showForm ? 'error' : 'secondary'}
            startIcon={showForm ? <CloseRoundedIcon /> : <AddRoundedIcon />}
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? 'Cancel' : 'Add medicine'}
          </Button>
        </Stack>

        {message ? <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert> : null}

        <Collapse in={showForm} unmountOnExit>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mb: 3, bgcolor: 'background.default' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Add medicine</Typography>
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Medicine name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Compartment" type="number" value={form.compartment} onChange={(e) => setForm({ ...form, compartment: Number(e.target.value) })} required />
                </Grid>
                  <Grid item xs={12} sm={6}>
                    <input
                      accept="image/*"
                      id="medicine-image"
                      type="file"
                      onChange={(e) => setForm({ ...form, imageFile: e.target.files && e.target.files[0] })}
                      style={{ display: 'block' }}
                    />
                  </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Initial pill count" type="number" value={form.initialPillCount} onChange={(e) => setForm({ ...form, initialPillCount: Number(e.target.value), remainingPillCount: Number(e.target.value) })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Low stock threshold" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} required />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Instructions" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} multiline minRows={2} />
                </Grid>
              </Grid>
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button onClick={() => setShowForm(false)} color="inherit">Cancel</Button>
                <Button type="submit" variant="contained" color="secondary">Save medicine</Button>
              </Stack>
            </Stack>
          </Box>
        </Collapse>

        <Stack spacing={2}>
          {medicines.length === 0 && !showForm ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <MedicationRoundedIcon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }} />
              <Typography>No medicines added yet. Click "Add medicine" to get started.</Typography>
            </Box>
          ) : (
            medicines.map((medicine) => (
              <Box key={medicine._id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    {medicine.image ? (
                      <img src={medicine.image} alt={medicine.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <MedicationRoundedIcon sx={{ fontSize: 36, opacity: 0.6 }} />
                    )}
                    <Box>
                      <Typography fontWeight={700}>{medicine.name}</Typography>
                      <Typography variant="body2" color="text.secondary">Compartment {medicine.compartment}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={`${medicine.remainingPillCount} left`} color={medicine.remainingPillCount <= medicine.lowStockThreshold ? 'warning' : 'success'} />
                    <IconButton size="small" color="primary" onClick={() => openEdit(medicine)} aria-label="Update inventory">
                      <EditRoundedIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(medicine)} aria-label="Delete medicine">
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </CardContent>

      {/* Update inventory dialog */}
      <Dialog open={Boolean(editTarget)} onClose={closeEdit} fullWidth maxWidth="xs">
        <DialogTitle>Update inventory {editTarget ? `· ${editTarget.name}` : ''}</DialogTitle>
        {editForm ? (
          <Box component="form" onSubmit={handleUpdateInventory}>
            <DialogContent>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Remaining pills</Typography>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button variant="outlined" onClick={() => adjustEditCount(-1)}>−</Button>
                    <TextField
                      type="number"
                      value={editForm.remainingPillCount}
                      onChange={(e) => setEditForm({ ...editForm, remainingPillCount: Math.max(0, Number(e.target.value)) })}
                      sx={{ width: 100 }}
                      inputProps={{ style: { textAlign: 'center' } }}
                    />
                    <Button variant="outlined" onClick={() => adjustEditCount(1)}>+</Button>
                  </Stack>
                </Box>
                <TextField
                  label="Compartment"
                  type="number"
                  value={editForm.compartment}
                  onChange={(e) => setEditForm({ ...editForm, compartment: Number(e.target.value) })}
                  required
                />
                <TextField
                  label="Low stock threshold"
                  type="number"
                  value={editForm.lowStockThreshold}
                  onChange={(e) => setEditForm({ ...editForm, lowStockThreshold: Number(e.target.value) })}
                  required
                />
                <TextField
                  label="Instructions"
                  value={editForm.instructions}
                  onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })}
                  multiline
                  minRows={2}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={closeEdit} color="inherit">Cancel</Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogActions>
          </Box>
        ) : null}
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Delete medicine</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong> from compartment {deleteTarget?.compartment}?
            This will remove it permanently and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} color="inherit">Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}