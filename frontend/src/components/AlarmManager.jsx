import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, Collapse, Grid, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AlarmRoundedIcon from '@mui/icons-material/AlarmRounded';
import api from '../services/api';

const initialForm = {
  name: '',
  time: '',
  enabled: true,
  snoozeDuration: 0,
  medicine: '',
  medicineCompartment: 0,
  notes: ''
};

export default function AlarmManager() {
  const [alarms, setAlarms] = useState([]);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [medicines, setMedicines] = useState([]);

  const loadAlarms = async () => {
    try {
      const { data } = await api.get('/alarms');
      setAlarms(data.alarms || []);
    } catch {
      setMessage('Unable to load alarms.');
    }
  };

  const loadMedicines = async () => {
    try {
      const { data } = await api.get('/medicines');
      setMedicines(data.medicines || []);
    } catch {
      setMessage('Unable to load medicines.');
    }
  };

  useEffect(() => {
    loadAlarms();
    loadMedicines();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    // client-side validation
    const nameRe = /^[A-Za-z\s]+$/;
    if (!nameRe.test(form.name)) return setMessage('Alarm name may only contain letters and spaces.');
    if (!/^\d{2}:\d{2}$/.test(form.time)) return setMessage('Time must be in HH:MM format.');
    if (form.snoozeDuration < 0) return setMessage('Snooze duration cannot be negative.');
    try {
      const { data } = await api.post('/alarms', form);
      setAlarms((prev) => [data.alarm, ...prev]);
      setMessage('Alarm saved successfully.');
      setForm(initialForm);
      setShowForm(false);
      loadAlarms();
    } catch {
      setMessage('Unable to save alarm.');
    }
  };

  const toggleAlarm = async (alarm) => {
    try {
      await api.put(`/alarms/${alarm._id}`, { ...alarm, enabled: !alarm.enabled });
      loadAlarms();
    } catch {
      setMessage('Unable to update alarm state.');
    }
  };

  const removeAlarm = async (id) => {
    try {
      await api.delete(`/alarms/${id}`);
      setMessage('Alarm removed.');
      loadAlarms();
    } catch {
      setMessage('Unable to delete alarm.');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: showForm ? 2 : 0 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AlarmRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>Alarm schedule</Typography>
            <Chip size="small" label={`${alarms.length} active`} />
          </Stack>
          <Button
            variant={showForm ? 'outlined' : 'contained'}
            color={showForm ? 'error' : 'primary'}
            startIcon={showForm ? <CloseRoundedIcon /> : <AddRoundedIcon />}
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? 'Cancel' : 'New alarm'}
          </Button>
        </Stack>

        {message ? <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert> : null}

        <Collapse in={showForm} unmountOnExit>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5, mb: 3, bgcolor: 'background.default' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Create alarm</Typography>
            <Stack component="form" spacing={2} onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Alarm name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Snooze duration (min)" type="number" value={form.snoozeDuration} onChange={(e) => setForm({ ...form, snoozeDuration: Number(e.target.value) })} required />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    select
                    label="Select medicine"
                    value={form.medicine}
                    onChange={(e) => {
                      const selectedMedicine = medicines.find((medicine) => medicine._id === e.target.value);
                      setForm({
                        ...form,
                        medicine: e.target.value,
                        medicineCompartment: selectedMedicine?.compartment || form.medicineCompartment
                      });
                    }}
                    helperText={form.medicine ? 'Selected medicine stock will be reduced when you confirm the alarm.' : ''}
                  >
                    <MenuItem value="">None</MenuItem>
                    {medicines.map((medicine) => (
                      <MenuItem key={medicine._id} value={medicine._id} disabled={medicine.remainingPillCount <= 0}>
                        {medicine.name} · {medicine.remainingPillCount} left
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Medicine compartment" type="number" value={form.medicineCompartment} onChange={(e) => setForm({ ...form, medicineCompartment: Number(e.target.value) })} required />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Notes" multiline minRows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </Grid>
              </Grid>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography>Enable alarm</Typography>
                <Switch checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              </Stack>
              <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                <Button onClick={() => setShowForm(false)} color="inherit">Cancel</Button>
                <Button type="submit" variant="contained">Save alarm</Button>
              </Stack>
            </Stack>
          </Box>
        </Collapse>

        <Stack spacing={2}>
          {alarms.length === 0 && !showForm ? (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <AlarmRoundedIcon sx={{ fontSize: 36, mb: 1, opacity: 0.5 }} />
              <Typography>No alarms yet. Click "New alarm" to add one.</Typography>
            </Box>
          ) : (
            alarms.map((alarm) => (
              <Box key={alarm._id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5}>
                  <Box>
                    <Typography fontWeight={700}>{alarm.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Time: {alarm.time} · Compartment {alarm.medicineCompartment}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {alarm.medicine?.name ? `Medicine: ${alarm.medicine.name}` : 'No linked medicine'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">{alarm.notes || 'No notes added'}</Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={alarm.enabled ? 'Enabled' : 'Disabled'} color={alarm.enabled ? 'success' : 'default'} />
                    <Switch checked={Boolean(alarm.enabled)} onChange={() => toggleAlarm(alarm)} />
                    <Button color="error" variant="outlined" size="small" onClick={() => removeAlarm(alarm._id)}>Delete</Button>
                  </Stack>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}