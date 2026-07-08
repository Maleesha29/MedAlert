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
  medicine: '',
  medicineName: '',
  medicineCompartment: 1,
  notes: ''
};

export default function AlarmManager() {
  const [alarms, setAlarms] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const loadAlarms = async () => {
    try {
      const { data } = await api.get('/alarms');
      setAlarms(data.alarms || []);
    } catch {
      setMessageType('error');
      setMessage('Unable to load alarms.');
    }
  };

  const loadMedicines = async () => {
    try {
      const { data } = await api.get('/medicines');
      setMedicines(data.medicines || []);
    } catch {
      setMessageType('error');
      setMessage('Unable to load medicines.');
    }
  };

  useEffect(() => {
    loadAlarms();
    loadMedicines();
    const onMedsChanged = () => loadMedicines();
    window.addEventListener('medicines:changed', onMedsChanged);
    const onAlarmsChanged = () => loadAlarms();
    window.addEventListener('alarms:changed', onAlarmsChanged);
    return () => {
      window.removeEventListener('medicines:changed', onMedsChanged);
      window.removeEventListener('alarms:changed', onAlarmsChanged);
    };
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nameRe = /^[A-Za-z\s]+$/;
    if (!nameRe.test(form.name)) { setMessageType('error'); setMessage('Alarm name may only contain letters and spaces.'); return; }
    if (!/^\d{2}:\d{2}$/.test(form.time)) { setMessageType('error'); setMessage('Time must be in HH:MM format.'); return; }
    // snooze duration is selected at ring-time (5/10/15min), not stored on the alarm

    try {
      const payload = { ...form };
      if (!payload.medicine) {
        delete payload.medicine;
      }
      const { data } = await api.post('/alarms', payload);
      setAlarms((prev) => [data.alarm, ...prev]);
      setMessageType('success');
      setMessage('Alarm saved successfully.');
      setForm(initialForm);
      setShowForm(false);
      loadAlarms();
      try { window.dispatchEvent(new CustomEvent('alarms:changed')); } catch (e) {}
    } catch (err) {
      setMessageType('error');
      setMessage(err?.response?.data?.message || 'Unable to save alarm.');
    }
  };

  const toggleAlarm = async (alarm) => {
    try {
      await api.put(`/alarms/${alarm._id}`, { ...alarm, enabled: !alarm.enabled });
      setMessageType('success');
      setMessage('Alarm updated.');
      loadAlarms();
      try { window.dispatchEvent(new CustomEvent('alarms:changed')); } catch (e) {}
    } catch (err) {
      setMessageType('error');
      setMessage(err?.response?.data?.message || 'Unable to update alarm state.');
    }
  };

  const removeAlarm = async (id) => {
    try {
      await api.delete(`/alarms/${id}`);
      setMessageType('success');
      setMessage('Alarm removed.');
      loadAlarms();
      try { window.dispatchEvent(new CustomEvent('alarms:changed')); } catch (e) {}
    } catch (err) {
      setMessageType('error');
      setMessage(err?.response?.data?.message || 'Unable to delete alarm.');
    }
  };

  return (
    <Card>
      <CardContent>
        {message ? <Alert severity={messageType} sx={{ mb: 2 }} onClose={() => { setMessage(''); setMessageType('success'); }}>{message}</Alert> : null}
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
                {/* snooze duration removed — choose snooze when the alarm rings */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    label="Medicine Name"
                    value={form.medicine || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const matched = medicines.find((m) => m._id === selectedId);
                      if (matched) {
                        setForm({
                          ...form,
                          medicine: matched._id,
                          medicineName: matched.name,
                          medicineCompartment: matched.compartment
                        });
                      } else {
                        setForm({
                          ...form,
                          medicine: '',
                          medicineName: '',
                          medicineCompartment: 1
                        });
                      }
                    }}
                    helperText={form.medicine ? 'Medicine linked to alarm.' : 'Select a medicine (Optional)'}
                  >
                    <MenuItem value="">
                      <em>None (General Alarm)</em>
                    </MenuItem>
                    {medicines.map((m) => (
                      <MenuItem key={m._id} value={m._id}>
                        {m.name} (Compartment {m.compartment})
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
