import { useEffect, useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ fullName: '', age: '', gender: '', bloodGroup: '', phoneNumber: '', address: '', caregiverName: '', caregiverPhone: '', caregiverEmail: '' });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get('/auth/me');
        const user = data.user || {};

        setProfile(user);
        setForm({
          fullName: user.fullName || user.name || '',
          age: user.age ?? '',
          gender: user.gender || '',
          bloodGroup: user.bloodGroup || '',
          phoneNumber: user.phoneNumber || user.phone || '',
          address: user.address || '',
          caregiverName: user.caregiverName || '',
          caregiverPhone: user.caregiverPhone || '',
          caregiverEmail: user.caregiverEmail || ''
        });
      } catch {
        setMessage('Unable to load profile.');
      }
    };

    loadProfile();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.put('/auth/profile', {
        fullName: form.fullName,
        age: form.age,
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        phoneNumber: form.phoneNumber,
        address: form.address,
        caregiverName: form.caregiverName,
        caregiverPhone: form.caregiverPhone,
        caregiverEmail: form.caregiverEmail
      });

      const user = data.user || {};
      setProfile(user);
      setForm({
        fullName: user.fullName || user.name || '',
        age: user.age ?? '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        phoneNumber: user.phoneNumber || user.phone || '',
        address: user.address || '',
        caregiverName: user.caregiverName || '',
        caregiverPhone: user.caregiverPhone || '',
        caregiverEmail: user.caregiverEmail || ''
      });
      setMessage('Profile updated successfully.');
      navigate('/');
    } catch {
      setMessage('Unable to save profile.');
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Avatar sx={{ width: 84, height: 84, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
              <PersonOutlineRoundedIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h5" fontWeight={700}>{profile?.fullName || profile?.name || 'Patient User'}</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>{profile?.email || 'patient@example.com'}</Typography>
            <Chip label="Active account" color="success" />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Profile details</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Keep your personal and care information up to date for accurate reminders and support.
            </Typography>
            {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}
            <Stack component="form" spacing={2} onSubmit={handleSave}>
              <TextField label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} fullWidth />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField label="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField select label="Gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField select label="Blood group" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} fullWidth>
                    <MenuItem value="">Select</MenuItem>
                    <MenuItem value="A+">A+</MenuItem>
                    <MenuItem value="A-">A-</MenuItem>
                    <MenuItem value="B+">B+</MenuItem>
                    <MenuItem value="B-">B-</MenuItem>
                    <MenuItem value="AB+">AB+</MenuItem>
                    <MenuItem value="AB-">AB-</MenuItem>
                    <MenuItem value="O+">O+</MenuItem>
                    <MenuItem value="O-">O-</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
              <TextField label="Phone number" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} fullWidth />
              <TextField label="Address" multiline minRows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} fullWidth />
              <Typography variant="h6" fontWeight={700} sx={{ mt: 2 }}>Caregiver</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField label="Caregiver name" value={form.caregiverName} onChange={(e) => setForm({ ...form, caregiverName: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Caregiver phone" value={form.caregiverPhone} onChange={(e) => setForm({ ...form, caregiverPhone: e.target.value })} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Caregiver email" value={form.caregiverEmail} onChange={(e) => setForm({ ...form, caregiverEmail: e.target.value })} fullWidth />
                </Grid>
              </Grid>
              <Box>
                <Button type="submit" variant="contained">Save profile</Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
